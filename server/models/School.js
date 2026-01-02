import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  school_name: {
    type: String,
    required: true
  },
  excel_file_path: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
schoolSchema.index({ report: 1 });

const School = mongoose.model('School', schoolSchema);

export default School;


