import mongoose from 'mongoose';

const authoritySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Sector-level authorities (same for all schools)
  sector_inspector: {
    name: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      default: 'Sector Education Inspector'
    },
    telephone: {
      type: String,
      trim: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  executive_secretary: {
    name: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      default: 'Executive Secretary of the Sector'
    },
    telephone: {
      type: String,
      trim: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  // School-level authorities (different for each school)
  head_teachers: [{
    school_name: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      default: 'Head Teacher'
    },
    telephone: {
      type: String,
      trim: true
    },
    effective_from: {
      type: Date,
      default: Date.now
    },
    effective_to: {
      type: Date // null means currently active
    },
    is_active: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
authoritySchema.index({ user: 1 });
authoritySchema.index({ 'head_teachers.school_name': 1, 'head_teachers.is_active': 1 });

// Method to get current head teacher for a school
authoritySchema.methods.getCurrentHeadTeacher = function(schoolName) {
  const headTeacher = this.head_teachers
    .find(ht => 
      ht.school_name.toLowerCase() === schoolName.toLowerCase() && 
      ht.is_active &&
      (!ht.effective_to || ht.effective_to > new Date())
    );
  return headTeacher || null;
};

// Method to update head teacher (marks old as inactive, creates new)
authoritySchema.methods.updateHeadTeacher = function(schoolName, newName) {
  // Mark current as inactive
  this.head_teachers.forEach(ht => {
    if (ht.school_name.toLowerCase() === schoolName.toLowerCase() && ht.is_active) {
      ht.is_active = false;
      ht.effective_to = new Date();
    }
  });
  
  // Add new head teacher
  this.head_teachers.push({
    school_name: schoolName,
    name: newName,
    effective_from: new Date(),
    is_active: true
  });
};

const Authority = mongoose.model('Authority', authoritySchema);

export default Authority;

