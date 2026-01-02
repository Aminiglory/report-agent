import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import Report from '../models/Report.js';
import School from '../models/School.js';
import ReportFormat from '../models/ReportFormat.js';
import SchoolList from '../models/SchoolList.js';
import Authority from '../models/Authority.js';
import mongoose from 'mongoose';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sector-report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called');
    console.log('  - File name:', file.originalname);
    console.log('  - MIME type:', file.mimetype);
    
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    console.log('  - File extension:', ext);
    
    if (allowedTypes.includes(ext)) {
      console.log('  ✅ File type allowed');
      cb(null, true);
    } else {
      console.log('  ❌ File type NOT allowed');
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }
  next();
};

// Helper function to add signature section to worksheet
function addSignatureSection(worksheet, authority, format, schoolName = null) {
  const signatureRows = [];
  
  // Get current row count
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  let currentRow = range.e.r + 2; // Start after data, with one blank row
  
  // Add blank row
  signatureRows.push([]);
  currentRow++;
  
  // Helper to get current head teacher
  const getCurrentHeadTeacher = (auth, schoolName) => {
    if (!auth?.head_teachers) return null;
    return auth.head_teachers.find(ht => 
      ht.school_name.toLowerCase() === schoolName.toLowerCase() && 
      ht.is_active &&
      (!ht.effective_to || new Date(ht.effective_to) > new Date())
    );
  };

  // Add signature sections based on format configuration
  if (format.signature_sections.sector_inspector?.enabled && authority?.sector_inspector?.name) {
    signatureRows.push([
      '',
      '',
      format.signature_sections.sector_inspector.label || 'Sector Education Inspector',
      '',
      authority.sector_inspector.name
    ]);
    currentRow++;
    signatureRows.push(['', '', 'Signature: _______________', '', '']);
    currentRow++;
    signatureRows.push([]);
    currentRow++;
  }
  
  if (format.signature_sections.executive_secretary?.enabled && authority?.executive_secretary?.name) {
    signatureRows.push([
      '',
      '',
      format.signature_sections.executive_secretary.label || 'Executive Secretary of the Sector',
      '',
      authority.executive_secretary.name
    ]);
    currentRow++;
    signatureRows.push(['', '', 'Signature: _______________', '', '']);
    currentRow++;
    signatureRows.push([]);
    currentRow++;
  }
  
  if (format.signature_sections.head_teacher?.enabled && schoolName) {
    const headTeacher = getCurrentHeadTeacher(authority, schoolName);
    if (headTeacher) {
      signatureRows.push([
        '',
        '',
        format.signature_sections.head_teacher.label || 'Head Teacher',
        '',
        headTeacher.name
      ]);
      currentRow++;
      signatureRows.push(['', '', 'Signature: _______________', '', '']);
      currentRow++;
    }
  }
  
  // Append signature rows to worksheet
  const signatureData = XLSX.utils.aoa_to_sheet(signatureRows);
  const sigRange = XLSX.utils.decode_range(signatureData['!ref'] || 'A1');
  
  // Merge the signature section into the main worksheet
  for (let R = 0; R <= sigRange.e.r; R++) {
    for (let C = 0; C <= sigRange.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.e.r + 2 + R, c: C });
      const sourceCell = signatureData[XLSX.utils.encode_cell({ r: R, c: C })];
      if (sourceCell) {
        worksheet[cellAddress] = sourceCell;
      }
    }
  }
  
  // Update worksheet range
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: range.e.r + signatureRows.length, c: range.e.c }
  });
  
  return worksheet;
}

// Upload and process sector report
router.post('/upload', authenticateToken, upload.single('file'), handleMulterError, async (req, res) => {
  try {
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('Request received');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('Files in request:', req.files);
    
    if (!req.file) {
      console.error('ERROR: No file in req.file');
      console.log('Request headers:', req.headers);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded successfully!');
    console.log('File details:');
    console.log('  - Original name:', req.file.originalname);
    console.log('  - Saved path:', req.file.path);
    console.log('  - File size:', req.file.size, 'bytes');
    console.log('  - MIME type:', req.file.mimetype);
    
    // Check if file actually exists on disk
    if (fs.existsSync(req.file.path)) {
      console.log('✅ File exists on disk at:', req.file.path);
    } else {
      console.error('❌ ERROR: File does NOT exist on disk at:', req.file.path);
      return res.status(500).json({ error: 'File was not saved properly' });
    }

    const { month, year, sectorName, formatId, schoolListId } = req.body;
    const userId = req.user.userId;
    
    console.log('Form data:');
    console.log('  - Month:', month);
    console.log('  - Year:', year);
    console.log('  - Sector Name:', sectorName);
    console.log('  - Format ID:', formatId);
    console.log('  - School List ID:', schoolListId);
    console.log('  - User ID:', userId);

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    if (!formatId) {
      return res.status(400).json({ error: 'Report format is required' });
    }

    if (!schoolListId) {
      return res.status(400).json({ error: 'School list is required' });
    }

    // Load format
    const format = await ReportFormat.findOne({ _id: formatId, user: userId });
    if (!format) {
      return res.status(404).json({ error: 'Report format not found' });
    }
    if (!format.is_active) {
      return res.status(400).json({ error: 'Report format is not active' });
    }

    // Load school list
    const schoolList = await SchoolList.findOne({ _id: schoolListId, user: userId });
    if (!schoolList) {
      return res.status(404).json({ error: 'School list not found' });
    }
    if (!schoolList.is_active) {
      return res.status(400).json({ error: 'School list is not active' });
    }

    // Get ordered schools from the list
    const orderedSchools = schoolList.schools.sort((a, b) => a.order - b.order);

    // Load authority names
    let authority = await Authority.findOne({ user: userId });
    if (!authority) {
      authority = new Authority({ user: userId });
      await authority.save();
    }

    // Read the uploaded Excel file
    console.log('=== READING EXCEL FILE ===');
    console.log('Attempting to read file from:', req.file.path);
    
    let workbook;
    try {
      workbook = XLSX.readFile(req.file.path);
      console.log('✅ Excel file read successfully');
      console.log('Sheet names:', workbook.SheetNames);
    } catch (error) {
      console.error('❌ ERROR reading Excel file:', error);
      return res.status(500).json({ error: 'Error reading Excel file: ' + error.message });
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Using sheet:', sheetName);
    
    // Read as array of arrays to preserve row structure
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log('✅ Data extracted from Excel');
    console.log('Total rows in data:', data.length);
    console.log('First 3 rows:', data.slice(0, 3));
    
    // Use headers from the format template (stored in format.structure.headers)
    // This ensures all school reports use the same header structure as the format
    let formatHeaders = [];
    if (format.structure && format.structure.headers && Array.isArray(format.structure.headers)) {
      formatHeaders = format.structure.headers;
    }
    
    // Also find headers from uploaded file for column mapping purposes
    // Find the header row - look for "S/N" as indicator of data columns
    // Skip title/header rows before S/N (those are not data columns)
    let headerRowIndex = -1;
    
    // First, try to find the row containing "S/N" or "SN" or "Serial Number"
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i] || [];
      const rowText = row.map(cell => cell ? cell.toString().trim().toLowerCase() : '').join(' ');
      // Look for S/N, SN, Serial Number, or serial number patterns
      if (rowText.includes('s/n') || rowText.includes('sn') || 
          rowText.includes('serial') || rowText.includes('serial number') ||
          rowText.includes('رقم')) {
        headerRowIndex = i;
        break;
      }
    }
    
    // If S/N not found, fall back to first non-empty row
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i] || [];
        // Check if this row looks like headers (has text values, not all empty)
        const hasText = row.some(cell => cell && cell.toString().trim().length > 0);
        if (hasText) {
          headerRowIndex = i;
          break;
        }
      }
    }
    
    // Default to row 0 if still not found
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }
    
    const uploadedHeaders = data[headerRowIndex] || [];
    
    // Normalize function for string matching (removes all spaces for comparison)
    const normalizeString = (str) => {
      if (!str) return '';
      return str.toString().trim().toLowerCase().replace(/\s+/g, '');
    };
    
    // Normalize with spaces preserved (for display/logging)
    const normalizeStringWithSpaces = (str) => {
      if (!str) return '';
      return str.toString().trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    // More robust normalization for school name matching
    // Ignores common school-type words and punctuation while preserving core name
    const normalizeSchoolNameForMatching = (str) => {
      if (!str) return '';
      let value = normalizeStringWithSpaces(str);
      // Remove common school-type words (prefixes/suffixes) in multiple languages
      const removableWords = [
        'gs', 'g.s', 'ecole', 'école', 'school', 'primary', 'secondary', 'tvet',
        'ps', 'ss', 'lycee', 'lycée', 'college', 'collège', 'ecole primaire',
        'école primaire', 'tss', 'ess'
      ];
      removableWords.forEach(word => {
        const pattern = new RegExp(`\\b${word}\\b`, 'gi');
        value = value.replace(pattern, ' ');
      });
      // Remove non-alphanumeric characters and collapse spaces
      value = value.replace(/[^a-z0-9]+/gi, ' ').trim();
      // As a final fallback, if everything was stripped, use the basic normalization
      return value || normalizeString(str);
    };
    
    // Use format headers if available, otherwise fall back to uploaded headers
    const headers = formatHeaders.length > 0 ? formatHeaders : uploadedHeaders;
    
    // Create a mapping from uploaded column names to format column indices
    // This helps align data from uploaded file with format structure
    const columnMapping = new Map();
    if (formatHeaders.length > 0 && uploadedHeaders.length > 0) {
      uploadedHeaders.forEach((uploadedHeader, uploadedIndex) => {
        if (uploadedHeader) {
          const normalizedUploaded = normalizeString(uploadedHeader);
          // Find matching column in format headers
          const formatIndex = formatHeaders.findIndex(h => 
            h && normalizeString(h) === normalizedUploaded
          );
          if (formatIndex !== -1) {
            columnMapping.set(uploadedIndex, formatIndex);
          }
        }
      });
    }
    
    // Find school column using format's mapping
    // Search in uploaded headers (not format headers) since we need to find it in the uploaded file
    // Spacing is ignored - "School Name" matches "SchoolName", "School  Name", etc.
    let schoolColumnIndex = -1;
    const expectedSchoolColumn = format.column_mappings?.school_column ? normalizeString(format.column_mappings.school_column) : '';
    
    if (expectedSchoolColumn) {
      // Try exact match first (normalized, all spaces removed) - search in uploaded headers
      schoolColumnIndex = uploadedHeaders.findIndex(h => {
        const headerNormalized = normalizeString(h);
        return headerNormalized === expectedSchoolColumn;
      });
      
      // Try partial match if exact match fails - search in uploaded headers
      if (schoolColumnIndex === -1) {
        schoolColumnIndex = uploadedHeaders.findIndex(h => {
          const headerNormalized = normalizeString(h);
          return headerNormalized.includes(expectedSchoolColumn) || expectedSchoolColumn.includes(headerNormalized);
        });
      }
    }
    
    // Fallback to auto-detection with more flexible matching - search in uploaded headers
    if (schoolColumnIndex === -1) {
      const schoolKeywords = ['school', 'مدرسة', 'اسم', 'name', 'institution', 'établissement'];
      schoolColumnIndex = uploadedHeaders.findIndex(h => {
        const headerNormalized = normalizeString(h);
        return schoolKeywords.some(keyword => headerNormalized.includes(keyword));
      });
    }

    if (schoolColumnIndex === -1) {
      console.error('=== SCHOOL COLUMN NOT FOUND ===');
      console.error('Expected column (normalized):', expectedSchoolColumn);
      console.error('Available columns:', uploadedHeaders.map((h, i) => `${i}: "${h}" (normalized: "${normalizeString(h)}")`));
      return res.status(400).json({ 
        error: `Could not find school column "${format.column_mappings?.school_column || 'unknown'}" in the Excel file. Expected: "${format.column_mappings?.school_column}". Found columns: ${uploadedHeaders.slice(0, 15).map(h => h || '(empty)').join(', ')}. Make sure the column name matches exactly (spacing is ignored, case-insensitive).` 
      });
    }
    
    console.log('✅ School column found at index:', schoolColumnIndex);
    console.log('   Column name in file:', uploadedHeaders[schoolColumnIndex]);
    console.log('   Expected (normalized):', expectedSchoolColumn);
    console.log('   Found (normalized):', normalizeString(uploadedHeaders[schoolColumnIndex]));

    // Group data by school from uploaded file
    // Structure: School name appears in a row, followed by multiple rows of data for that school
    // Start from row after header row
    
    // Common words that indicate summary/header rows, not actual school names
    // These are exact matches or standalone words (not part of school names)
    const summaryKeywords = [
      'total', 'totals', 'sum', 'summary', 'sector', 'district', 'region',
      'grand total', 'subtotal', 'overall', 'all schools', 'all',
      'nyundo sector', 'sector total', 'district total',
      'region total', 'province', 'provincial', 'national', 'country'
    ];
    
    // School category indicators (these are GOOD - they indicate real schools)
    const schoolCategoryIndicators = ['primary', 'secondary', 'tvet', 'école', 'lycée', 'college', 'school', 'مدرسة'];
    
    const isSummaryRow = (schoolName) => {
      if (!schoolName) return true;
      const normalized = normalizeString(schoolName);
      
      // Check if it's an exact match to a summary keyword
      if (summaryKeywords.some(keyword => normalized === normalizeString(keyword))) {
        return true;
      }
      
      // Check if it's JUST a summary keyword (standalone, not part of a longer name)
      // But allow if it contains school category indicators
      const hasSchoolIndicator = schoolCategoryIndicators.some(indicator => normalized.includes(indicator));
      if (summaryKeywords.some(keyword => {
        const keywordNorm = normalizeSchoolNameForMatching(keyword);
        // If the school name is just the keyword or starts/ends with it (but not if it contains school indicators)
        return (normalized === keywordNorm || 
                normalized.startsWith(keywordNorm + ' ') || 
                normalized.endsWith(' ' + keywordNorm)) && !hasSchoolIndicator;
      })) {
        return true;
      }
      
      // Check if it's all uppercase and very short (likely a header like "SECTOR", "TOTAL")
      // But ONLY if it doesn't contain school indicators
      if (!hasSchoolIndicator && schoolName === schoolName.toUpperCase() && 
          schoolName.length < 15 && schoolName.split(' ').length <= 2) {
        return true;
      }
      
      // Check if it's just numbers or mostly numbers
      if (/^\d+$/.test(schoolName.trim()) || /^\d+\s*[-–]\s*\d+$/.test(schoolName.trim())) {
        return true;
      }
      
      return false;
    };
    
    const schoolsData = {};
    let currentSchool = null;
    
    console.log('=== SCHOOL EXTRACTION DEBUG ===');
    console.log('School column index:', schoolColumnIndex);
    console.log('Header row index:', headerRowIndex);
    console.log('Total data rows:', data.length);
    console.log('Uploaded headers:', uploadedHeaders);
    console.log('Format headers:', formatHeaders);
    
    console.log('Starting to process rows from index:', headerRowIndex + 1, 'to', data.length);
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) {
        console.log(`Row ${i + 1}: Empty row, skipping`);
        continue;
      }
      
      // Check if this row has a school name in the school column
      const schoolNameCell = row[schoolColumnIndex];
      const schoolName = schoolNameCell ? schoolNameCell.toString().trim() : '';
      
      console.log(`Row ${i + 1}: School column value = "${schoolName}"`);
      
      if (schoolName && schoolName.length > 0) {
        // Skip if school name matches any header (likely a header row)
        // Check against both format headers and uploaded headers
        const schoolNameMatchesHeader = formatHeaders.length > 0 
          ? formatHeaders.some(h => h && normalizeString(h) === normalizeString(schoolName))
          : uploadedHeaders.some(h => h && normalizeString(h) === normalizeString(schoolName));
        
        // Check if it's a summary row (TOTAL, SECTOR, etc.)
        const isSummary = isSummaryRow(schoolName);
        
        console.log(`  - Matches header: ${schoolNameMatchesHeader}`);
        console.log(`  - Is summary row: ${isSummary}`);
        
        if (!schoolNameMatchesHeader && !isSummary) {
          // This is a new school name - start a new school group
          // Use normalized name as key for case-insensitive matching
          // But preserve original name for display
          const normalizedSchoolName = normalizeSchoolNameForMatching(schoolName);
          console.log(`  ✅ ACCEPTED as school name: "${schoolName}" (normalized: "${normalizedSchoolName}")`);
          
          // Check if we already have this school (case-insensitive)
          const existingKey = Object.keys(schoolsData).find(key => normalizeSchoolNameForMatching(key) === normalizedSchoolName);
          if (existingKey) {
            currentSchool = existingKey; // Use existing key to maintain consistency
          } else {
            currentSchool = schoolName; // Use original name as key (first occurrence)
          }
          
          if (!schoolsData[currentSchool]) {
            schoolsData[currentSchool] = [];
          }
          // Include the row with the school name as the first data row
          schoolsData[currentSchool].push(row);
        } else {
          if (schoolNameMatchesHeader) {
            console.log(`  ❌ REJECTED - matches a header`);
          } else if (isSummary) {
            console.log(`  ❌ REJECTED - is a summary/header row`);
          }
          // Reset current school when we hit a summary/header row
          currentSchool = null;
        }
      } else if (currentSchool) {
        // This row doesn't have a school name, so it's data for the current school
        // Add it to the current school's data
        console.log(`Row ${i + 1}: No school name, adding to current school "${currentSchool}"`);
        schoolsData[currentSchool].push(row);
      } else {
        console.log(`Row ${i + 1}: No school name and no current school, skipping`);
      }
    }
    
    // Remove schools with no data rows
    Object.keys(schoolsData).forEach(schoolName => {
      if (schoolsData[schoolName].length === 0) {
        delete schoolsData[schoolName];
      }
    });
    
    console.log('=== EXTRACTED SCHOOLS ===');
    console.log('Total schools found:', Object.keys(schoolsData).length);
    console.log('School names:', Object.keys(schoolsData));
    Object.keys(schoolsData).forEach(schoolName => {
      console.log(`  - "${schoolName}": ${schoolsData[schoolName].length} data rows`);
    });

    // Verify all schools in data match the school list (case-insensitive)
    // Get all unique school names from the uploaded file
    const foundSchoolNames = Object.keys(schoolsData);
    
    console.log('=== SCHOOL LIST VERIFICATION ===');
    console.log('Schools in selected school list:');
    orderedSchools.forEach((school, idx) => {
      console.log(`  ${idx + 1}. "${school.school_name}" (normalized: "${normalizeSchoolNameForMatching(school.school_name)}")`);
    });
    
    console.log('Schools found in uploaded file:');
    foundSchoolNames.forEach((name, idx) => {
      console.log(`  ${idx + 1}. "${name}" (normalized: "${normalizeSchoolNameForMatching(name)}")`);
    });
    
    // Create a map of normalized school names from the list for quick lookup
    const schoolListMap = new Map();
    orderedSchools.forEach(listSchool => {
      const normalizedName = normalizeSchoolNameForMatching(listSchool.school_name);
      schoolListMap.set(normalizedName, listSchool);
    });
    
    // Create a map of normalized school names from uploaded file
    const foundSchoolsMap = new Map();
    foundSchoolNames.forEach(name => {
      const normalized = normalizeSchoolNameForMatching(name);
      if (!foundSchoolsMap.has(normalized)) {
        foundSchoolsMap.set(normalized, name); // Store first occurrence
      }
    });
    
    // Verify all schools in the file are in the school list (case-insensitive)
    const missingSchools = [];
    foundSchoolsMap.forEach((original, normalized) => {
      console.log(`Checking "${original}" (normalized: "${normalized}")`);
      if (!schoolListMap.has(normalized)) {
        console.log(`  ❌ NOT FOUND in school list`);
        missingSchools.push(original);
      } else {
        console.log(`  ✅ FOUND in school list`);
      }
    });
    
    // If any schools in the file are not in the list, reject processing
    if (missingSchools.length > 0) {
      return res.status(400).json({ 
        error: `The following schools in your file are not in your selected school list: ${missingSchools.join(', ')}. Please add them to your school list first or select a different school list.` 
      });
    }
    
    // Match schools by name and preserve list order (case-insensitive matching)
    // Each school has MULTIPLE ROWS of data
    const matchedSchools = [];
    console.log('=== MATCHING SCHOOLS ===');
    orderedSchools.forEach(listSchool => {
      const normalizedListName = normalizeSchoolNameForMatching(listSchool.school_name);
      console.log(`\nLooking for school: "${listSchool.school_name}" (normalized: "${normalizedListName}")`);
      
      // Find the actual key in schoolsData (case-insensitive match)
      const actualKey = Object.keys(schoolsData).find(key => normalizeSchoolNameForMatching(key) === normalizedListName);
      
      if (actualKey) {
        console.log(`  Found key in schoolsData: "${actualKey}"`);
        if (schoolsData[actualKey] && schoolsData[actualKey].length > 0) {
          console.log(`  ✅ Matched: List "${listSchool.school_name}" → File "${actualKey}" (${schoolsData[actualKey].length} data rows)`);
          matchedSchools.push({
            name: actualKey, // Use the exact name from the file (as it appears in schoolsData)
            listSchool: listSchool,
            dataRows: schoolsData[actualKey] // All rows of data for this school (case-insensitive match)
          });
        } else {
          console.log(`  ❌ No data rows found for: "${actualKey}"`);
        }
      } else {
        console.log(`  ❌ No matching key found in schoolsData for: "${listSchool.school_name}"`);
        console.log(`  Available keys: ${Object.keys(schoolsData).join(', ')}`);
      }
    });
    
    console.log(`\n=== MATCHING SUMMARY ===`);
    console.log(`Total schools in list: ${orderedSchools.length}`);
    console.log(`Total schools matched: ${matchedSchools.length}`);
    
    if (matchedSchools.length === 0) {
      console.log('❌ ERROR: No matching schools found!');
      return res.status(400).json({ 
        error: 'No matching schools found. Make sure school names in the uploaded file match the names in your school list (case-insensitive).' 
      });
    }
    
    // Extract school names in the order we'll process them
    const schoolNames = matchedSchools.map(ms => ms.name);

    // Create output directory
    const outputDir = path.join(__dirname, '../outputs', `${year}-${month}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create report record (will update with file paths later)
    const report = new Report({
      user: userId,
      month,
      year: parseInt(year),
      sector_name: sectorName || 'Unknown',
      total_schools: schoolNames.length,
      original_filename: req.file.originalname,
      original_file_path: req.file.path,
      format: format._id,
      school_list: schoolList._id
    });
    await report.save();

    // Create combined workbook with all schools as separate sheets
    const combinedWorkbook = XLSX.utils.book_new();
    
    // Add original sector report as first sheet (with signatures if format used)
    let originalSheet = XLSX.utils.aoa_to_sheet(data);
    if (format) {
      // Add sector-level signatures to original report
      const sectorData = [headers, ...data.slice(1)];
      originalSheet = XLSX.utils.aoa_to_sheet(sectorData);
      // Add signatures (without head teacher, as this is sector level)
      if (format.signature_sections.sector_inspector?.enabled && authority?.sector_inspector?.name) {
        const sigRows = [
          [],
          ['', '', format.signature_sections.sector_inspector.label || 'Sector Education Inspector', '', authority.sector_inspector.name],
          ['', '', 'Signature: _______________', '', ''],
          [],
          ['', '', format.signature_sections.executive_secretary.label || 'Executive Secretary of the Sector', '', authority.executive_secretary?.name || ''],
          ['', '', 'Signature: _______________', '', '']
        ];
        const sigSheet = XLSX.utils.aoa_to_sheet(sigRows);
        const range = XLSX.utils.decode_range(originalSheet['!ref'] || 'A1');
        for (let R = 0; R < sigRows.length; R++) {
          for (let C = 0; C < 5; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.e.r + 2 + R, c: C });
            const sourceCell = sigSheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (sourceCell) {
              originalSheet[cellAddress] = sourceCell;
            }
          }
        }
        originalSheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: range.e.r + sigRows.length, c: range.e.c }
        });
      }
    }
    XLSX.utils.book_append_sheet(combinedWorkbook, originalSheet, 'Sector Report');

    // Generate Excel file for each school (individual files + sheets in combined)
    // Each school gets ONE SHEET with ALL its data rows
    const schoolFiles = [];
    for (const matchedSchool of matchedSchools) {
      const schoolName = matchedSchool.name;
      const schoolDataRows = matchedSchool.dataRows; // All rows of data for this school
      
      // Get head teacher from school list (match by normalized name)
      const schoolFromList = matchedSchool.listSchool;
      const headTeacherName = schoolFromList?.head_teacher?.name || '';
      
      // Create new workbook for this school (individual file)
      const schoolWorkbook = XLSX.utils.book_new();
      
      // Map data rows to match format headers structure
      // If format headers exist, align data columns with format headers
      const mappedSchoolDataRows = schoolDataRows.map(row => {
        if (formatHeaders.length === 0 || columnMapping.size === 0) {
          // No format headers or mapping, use row as-is
          return row;
        }
        
        // Create a new row aligned with format headers
        const mappedRow = new Array(formatHeaders.length).fill('');
        
        // Map each column from uploaded data to format header position
        row.forEach((cellValue, uploadedIndex) => {
          const formatIndex = columnMapping.get(uploadedIndex);
          if (formatIndex !== undefined && formatIndex < mappedRow.length) {
            mappedRow[formatIndex] = cellValue;
          }
        });
        
        return mappedRow;
      });
      
      // Add format headers and all mapped data rows for this school
      // Format: [format headers row, ...all mapped data rows for this school]
      const schoolData = [headers, ...mappedSchoolDataRows];
      let schoolWorksheet = XLSX.utils.aoa_to_sheet(schoolData);
      
      // Add signature section with head teacher from school list
      if (format) {
        // Temporarily set head teacher in authority for this school
        const tempAuthority = { ...authority.toObject() };
        if (headTeacherName) {
          tempAuthority.head_teachers = [{
            school_name: schoolName,
            name: headTeacherName,
            title: schoolFromList?.head_teacher?.title || 'Head Teacher',
            is_active: true
          }];
        }
        schoolWorksheet = addSignatureSection(schoolWorksheet, tempAuthority, format, schoolName);
      }
      
      XLSX.utils.book_append_sheet(schoolWorkbook, schoolWorksheet, 'Data');

      // Save individual file
      const fileName = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      const filePath = path.join(outputDir, fileName);
      XLSX.writeFile(schoolWorkbook, filePath);

      // Add to combined workbook (sanitize sheet name - Excel has 31 char limit)
      // Each school gets its own sheet with all its data rows
      const combinedSheetName = schoolName.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '_');
      // Use the same data structure: format headers + all mapped data rows for this school
      const combinedSchoolData = [headers, ...mappedSchoolDataRows];
      let combinedSchoolSheet = XLSX.utils.aoa_to_sheet(combinedSchoolData);
      
      // Add signature section with head teacher from school list
      if (format) {
        const tempAuthority = { ...authority.toObject() };
        if (headTeacherName) {
          tempAuthority.head_teachers = [{
            school_name: schoolName,
            name: headTeacherName,
            title: schoolFromList?.head_teacher?.title || 'Head Teacher',
            is_active: true
          }];
        }
        combinedSchoolSheet = addSignatureSection(combinedSchoolSheet, tempAuthority, format, schoolName);
      }
      
      XLSX.utils.book_append_sheet(combinedWorkbook, combinedSchoolSheet, combinedSheetName);

      // Save to database
      const school = new School({
        report: report._id,
        school_name: schoolName,
        excel_file_path: filePath
      });
      await school.save();

      schoolFiles.push({
        schoolName,
        fileName,
        filePath: `/api/reports/download/${report._id}/${encodeURIComponent(schoolName)}`
      });
    }

    // Save combined workbook
    const combinedFileName = `Combined_${sectorName || 'Sector'}_${month}_${year}.xlsx`.replace(/[^a-zA-Z0-9_]/g, '_');
    const combinedFilePath = path.join(outputDir, combinedFileName);
    XLSX.writeFile(combinedWorkbook, combinedFilePath);

    // Update report with combined file path
    report.combined_file_path = combinedFilePath;
    await report.save();

    res.json({
      message: 'Report processed successfully',
      reportId: report._id.toString(),
      totalSchools: schoolNames.length,
      schools: schoolFiles,
      combinedFile: `/api/reports/download-combined/${report._id}`,
      originalFile: `/api/reports/download-original/${report._id}`
    });
  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (req.file) {
      console.error('req.file at error:', {
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        exists: fs.existsSync(req.file.path)
      });
    } else {
      console.error('req.file is null/undefined at error time');
    }
    res.status(500).json({ error: 'Error processing report: ' + error.message });
  }
});

// Get all schools for a report
router.get('/:reportId/schools', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    // Verify report belongs to user
    const report = await Report.findOne({ _id: reportId, user: userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const schools = await School.find({ report: reportId }).lean();
    
    // Transform _id to id for frontend compatibility
    const transformedSchools = schools.map(school => ({
      ...school,
      id: school._id.toString(),
      created_at: school.createdAt
    }));
    
    res.json({ schools: transformedSchools });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Error fetching schools' });
  }
});

// Download school Excel file
router.get('/download/:reportId/:schoolName', authenticateToken, async (req, res) => {
  try {
    const { reportId, schoolName } = req.params;
    const userId = req.user.userId;

    // Verify report belongs to user
    const report = await Report.findOne({ _id: reportId, user: userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get school file path
    const school = await School.findOne({ 
      report: reportId, 
      school_name: decodeURIComponent(schoolName) 
    });
    
    if (!school || !school.excel_file_path) {
      return res.status(404).json({ error: 'School file not found' });
    }

    // Check if file exists
    if (!fs.existsSync(school.excel_file_path)) {
      return res.status(404).json({ error: 'File no longer exists on server' });
    }

    // Send file
    res.download(school.excel_file_path, `${school.school_name}.xlsx`, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// Download combined Excel file (all schools as sheets)
router.get('/download-combined/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    // Verify report belongs to user
    const report = await Report.findOne({ _id: reportId, user: userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.combined_file_path) {
      return res.status(404).json({ error: 'Combined file not found' });
    }

    // Check if file exists
    if (!fs.existsSync(report.combined_file_path)) {
      return res.status(404).json({ error: 'Combined file no longer exists on server' });
    }

    const downloadName = `Combined_${report.sector_name || 'Sector'}_${report.month}_${report.year}.xlsx`.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Send file
    res.download(report.combined_file_path, downloadName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading combined file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Error downloading combined file' });
  }
});

// Download original sector report
router.get('/download-original/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    // Verify report belongs to user
    const report = await Report.findOne({ _id: reportId, user: userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.original_file_path) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    // Check if file exists
    if (!fs.existsSync(report.original_file_path)) {
      return res.status(404).json({ error: 'Original file no longer exists on server' });
    }

    // Send file
    res.download(report.original_file_path, report.original_filename || 'original-report.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading original file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Error downloading original file' });
  }
});

export default router;
