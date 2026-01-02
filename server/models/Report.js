import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  sector_name: {
    type: String,
    default: 'Unknown'
  },
  total_schools: {
    type: Number,
    required: true
  },
  original_filename: {
    type: String
  },
  original_file_path: {
    type: String
  },
  combined_file_path: {
    type: String
  },
  format: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportFormat'
  },
  school_list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolList'
  }
}, {
  timestamps: true
});

// Index for faster queries
reportSchema.index({ user: 1, month: 1, year: 1 });
reportSchema.index({ user: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;

