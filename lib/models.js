import mongoose from 'mongoose';

// ─── CANDIDATE MODEL ────────────────────────────────────────────────
const CandidateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true, unique: true },
  phone:       { type: String, required: true, trim: true },
  position:    { type: String, required: true },          // Applied for
  vacancyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vacancy' },
  resumeUrl:   { type: String },                          // Cloudinary view URL
  resumeDownloadUrl: { type: String },                  // Cloudinary download URL
  resumeFileName: { type: String },                       // Original filename
  resumePublicId: { type: String },                       // Cloudinary public_id (for delete)
  status: {
    type: String,
    enum: ['Applied', 'Interview Scheduled', 'Interviewed', 'Selected', 'Rejected', 'On Hold'],
    default: 'Applied',
  },
  interviewDate:  { type: Date },
  interviewTime:  { type: String },
  interviewMode:  { type: String, enum: ['In-Person', 'Phone', 'Video'], default: 'In-Person' },
  joiningDate:    { type: Date },
  joiningConfirmed: { type: Boolean, default: false },
  notes:          { type: String },
  appliedAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

// ─── VACANCY MODEL ───────────────────────────────────────────────────
const VacancySchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  department:   { type: String, required: true },
  location:     { type: String, required: true },
  type:         { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship'], default: 'Full-Time' },
  openings:     { type: Number, default: 1 },
  description:  { type: String },
  requirements: { type: String },
  salary:       { type: String },
  status:       { type: String, enum: ['Open', 'Closed', 'On Hold'], default: 'Open' },
  postedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

export const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);
export const Vacancy   = mongoose.models.Vacancy   || mongoose.model('Vacancy',   VacancySchema);
