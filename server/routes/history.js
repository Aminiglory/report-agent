import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import Report from '../models/Report.js';
import School from '../models/School.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all reports (history) for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    // Build query
    const query = { user: userId };
    
    if (month && year) {
      query.month = month;
      query.year = parseInt(year);
    }

    const reports = await Report.find(query)
      .populate('format', 'name description')
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    // Transform _id to id for frontend compatibility and include format info
    const transformedReports = reports.map(report => ({
      ...report,
      id: report._id.toString(),
      created_at: report.createdAt,
      format_name: report.format?.name || 'No Format',
      format_description: report.format?.description || ''
    }));

    res.json({ reports: transformedReports });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Error fetching history' });
  }
});

// Get single report details
router.get('/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    const report = await Report.findOne({ _id: reportId, user: userId })
      .populate('format', 'name description')
      .lean();
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const schools = await School.find({ report: reportId })
      .select('school_name createdAt')
      .sort({ school_name: 1 })
      .lean();

    // Transform _id to id for frontend compatibility and include format info
    const transformedReport = {
      ...report,
      id: report._id.toString(),
      created_at: report.createdAt,
      format_name: report.format?.name || 'No Format',
      format_description: report.format?.description || ''
    };

    const transformedSchools = schools.map(school => ({
      ...school,
      id: school._id.toString(),
      created_at: school.createdAt
    }));

    res.json({
      report: transformedReport,
      schools: transformedSchools
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Error fetching report' });
  }
});

// Delete a report and all associated data
router.delete('/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    // Verify report belongs to user
    const report = await Report.findOne({ _id: reportId, user: userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete all associated schools
    const schools = await School.find({ report: reportId });
    await School.deleteMany({ report: reportId });

    // Delete associated files
    // Delete individual school files
    for (const school of schools) {
      if (school.excel_file_path && fs.existsSync(school.excel_file_path)) {
        try {
          fs.unlinkSync(school.excel_file_path);
        } catch (err) {
          console.error(`Error deleting file ${school.excel_file_path}:`, err);
        }
      }
    }

    // Delete combined file if exists
    if (report.combined_file_path && fs.existsSync(report.combined_file_path)) {
      try {
        fs.unlinkSync(report.combined_file_path);
      } catch (err) {
        console.error(`Error deleting combined file:`, err);
      }
    }

    // Delete original file if exists
    if (report.original_file_path && fs.existsSync(report.original_file_path)) {
      try {
        fs.unlinkSync(report.original_file_path);
      } catch (err) {
        console.error(`Error deleting original file:`, err);
      }
    }

    // Delete the report
    await Report.deleteOne({ _id: reportId });

    res.json({ 
      message: 'Report and all associated data deleted successfully',
      deletedSchools: schools.length
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Error deleting report' });
  }
});

export default router;
