import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import ReportFormat from '../models/ReportFormat.js';
import XLSX from 'xlsx';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for template uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Get all formats for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const formats = await ReportFormat.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    const transformedFormats = formats.map(format => ({
      ...format,
      id: format._id.toString()
    }));
    
    res.json({ formats: transformedFormats });
  } catch (error) {
    console.error('Error fetching formats:', error);
    res.status(500).json({ error: 'Error fetching formats' });
  }
});

// Get single format
router.get('/:formatId', authenticateToken, async (req, res) => {
  try {
    const { formatId } = req.params;
    const userId = req.user.userId;
    
    const format = await ReportFormat.findOne({ _id: formatId, user: userId }).lean();
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }
    
    res.json({ format: { ...format, id: format._id.toString() } });
  } catch (error) {
    console.error('Error fetching format:', error);
    res.status(500).json({ error: 'Error fetching format' });
  }
});

// Create new format (with optional template file)
router.post('/', authenticateToken, upload.single('template'), async (req, res) => {
  try {
    console.log('=== CREATE FORMAT DEBUG ===');
    console.log('Request body:', req.body);
    console.log('File uploaded:', req.file ? {
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    } : 'No file');
    
    const userId = req.user.userId;
    const { name, description, school_column, data_columns, signature_config } = req.body;
    
    if (!name || !school_column) {
      console.error('Missing required fields - name:', name, 'school_column:', school_column);
      return res.status(400).json({ error: 'Name and school column are required' });
    }
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'Template file is required' });
    }
    
    console.log('File exists on disk:', fs.existsSync(req.file.path));
    
    // Parse JSON strings if needed
    let parsedDataColumns = [];
    if (data_columns) {
      parsedDataColumns = typeof data_columns === 'string' ? JSON.parse(data_columns) : data_columns;
    }
    
    let parsedSignatureConfig = {};
    if (signature_config) {
      parsedSignatureConfig = typeof signature_config === 'string' ? JSON.parse(signature_config) : signature_config;
    }
    
    // If template file uploaded, analyze its structure
    let structure = {};
    if (req.file) {
      try {
        console.log('Analyzing template file structure...');
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find the header row - look for "S/N" as indicator of data columns
        // Skip title/header rows before S/N
        let headerRowIndex = -1;
        
        // First, try to find the row containing "S/N"
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
        
        structure = {
          headers: data[headerRowIndex] || [],
          sample_rows: data.slice(headerRowIndex + 1, headerRowIndex + 6), // First 5 data rows as sample
          total_rows: data.length - headerRowIndex - 1,
          header_row_index: headerRowIndex
        };
        
        console.log('Template structure analyzed:');
        console.log('  - Headers:', structure.headers);
        console.log('  - Total rows:', structure.total_rows);
      } catch (error) {
        console.error('Error analyzing template:', error);
      }
    }
    
    console.log('Creating format with:');
    console.log('  - Name:', name);
    console.log('  - School column:', school_column);
    console.log('  - Template path:', req.file.path);
    console.log('  - Structure headers count:', structure.headers?.length || 0);
    
    const format = new ReportFormat({
      user: userId,
      name,
      description: description || '',
      structure,
      template_file_path: req.file ? req.file.path : null,
      column_mappings: {
        school_column,
        data_columns: parsedDataColumns
      },
      signature_sections: {
        sector_inspector: parsedSignatureConfig.sector_inspector || { enabled: true },
        executive_secretary: parsedSignatureConfig.executive_secretary || { enabled: true },
        head_teacher: parsedSignatureConfig.head_teacher || { enabled: true }
      }
    });
    
    await format.save();
    console.log('Format saved successfully with ID:', format._id.toString());
    
    res.status(201).json({
      message: 'Format created successfully',
      format: { ...format.toObject(), id: format._id.toString() }
    });
  } catch (error) {
    console.error('Error creating format:', error);
    res.status(500).json({ error: 'Error creating format: ' + error.message });
  }
});

// Update format (with optional file upload)
router.put('/:formatId', authenticateToken, upload.single('template'), async (req, res) => {
  try {
    const { formatId } = req.params;
    const userId = req.user.userId;
    const { name, description, school_column, data_columns, signature_config, is_active } = req.body;
    
    console.log('=== UPDATE FORMAT DEBUG ===');
    console.log('Format ID:', formatId);
    console.log('Request body:', req.body);
    console.log('File uploaded:', req.file ? req.file.originalname : 'No file');
    
    const format = await ReportFormat.findOne({ _id: formatId, user: userId });
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }
    
    if (name) format.name = name;
    if (description !== undefined) format.description = description;
    if (school_column) format.column_mappings.school_column = school_column;
    if (data_columns) {
      format.column_mappings.data_columns = typeof data_columns === 'string' 
        ? JSON.parse(data_columns) 
        : data_columns;
    }
    if (signature_config) {
      const parsed = typeof signature_config === 'string' ? JSON.parse(signature_config) : signature_config;
      format.signature_sections = {
        sector_inspector: parsed.sector_inspector || format.signature_sections.sector_inspector,
        executive_secretary: parsed.executive_secretary || format.signature_sections.executive_secretary,
        head_teacher: parsed.head_teacher || format.signature_sections.head_teacher
      };
    }
    if (is_active !== undefined) format.is_active = is_active;
    
    // If a new template file is uploaded, update the structure and file path
    if (req.file) {
      console.log('New template file uploaded, analyzing structure...');
      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        format.structure = {
          headers: data[0] || [],
          sample_rows: data.slice(1, 6), // First 5 data rows as sample
          total_rows: data.length - 1
        };
        
        // Delete old template file if it exists
        if (format.template_file_path && fs.existsSync(format.template_file_path)) {
          try {
            fs.unlinkSync(format.template_file_path);
            console.log('Deleted old template file:', format.template_file_path);
          } catch (err) {
            console.error('Error deleting old template file:', err);
          }
        }
        
        format.template_file_path = req.file.path;
        console.log('Template file updated:', req.file.path);
      } catch (error) {
        console.error('Error analyzing new template:', error);
        // Don't fail the update if template analysis fails
      }
    }
    
    await format.save();
    
    console.log('Format updated successfully');
    res.json({
      message: 'Format updated successfully',
      format: { ...format.toObject(), id: format._id.toString() }
    });
  } catch (error) {
    console.error('Error updating format:', error);
    res.status(500).json({ error: 'Error updating format: ' + error.message });
  }
});

// Delete format
router.delete('/:formatId', authenticateToken, async (req, res) => {
  try {
    const { formatId } = req.params;
    const userId = req.user.userId;
    
    const format = await ReportFormat.findOne({ _id: formatId, user: userId });
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }
    
    // Delete template file if exists
    if (format.template_file_path && fs.existsSync(format.template_file_path)) {
      fs.unlinkSync(format.template_file_path);
    }
    
    await ReportFormat.deleteOne({ _id: formatId });
    
    res.json({ message: 'Format deleted successfully' });
  } catch (error) {
    console.error('Error deleting format:', error);
    res.status(500).json({ error: 'Error deleting format' });
  }
});

export default router;

