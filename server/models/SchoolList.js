import mongoose from 'mongoose';

const schoolListSchema = new mongoose.Schema({
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
  schools: [{
    school_name: {
      type: String,
      required: true,
      trim: true
    },
    order: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Primary', 'Secondary', 'TVET'],
      trim: true,
      required: false
    },
    head_teacher: {
      name: {
        type: String,
        trim: true
      },
      title: {
        type: String,
        default: 'Head Teacher'
      },
      telephone: {
        type: String,
        trim: true
      }
    }
  }],
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
schoolListSchema.index({ user: 1, is_active: 1 });

const SchoolList = mongoose.model('SchoolList', schoolListSchema);

export default SchoolList;

