import mongoose from 'mongoose';

const reportFormatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Structure of the report (column mappings, layout, etc.)
  structure: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Template file path (if uploaded)
  template_file_path: {
    type: String
  },
  // Column mappings (which columns to use, how to identify schools, etc.)
  column_mappings: {
    school_column: {
      type: String,
      required: true
    },
    // Other important columns
    data_columns: [{
      name: {
        type: String
      },
      required: {
        type: Boolean,
        default: false
      }
    }]
  },
  // Signature sections configuration
  signature_sections: {
    sector_inspector: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Sector Education Inspector' },
      position: { type: String, default: 'bottom' } // top, bottom
    },
    executive_secretary: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Executive Secretary of the Sector' },
      position: { type: String, default: 'bottom' }
    },
    head_teacher: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Head Teacher' },
      position: { type: String, default: 'bottom' }
    }
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
reportFormatSchema.index({ user: 1, is_active: 1 });

const ReportFormat = mongoose.model('ReportFormat', reportFormatSchema);

export default ReportFormat;

