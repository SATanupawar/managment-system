import connectDB from '../lib/mongodb';
import { Candidate } from '../lib/models';
import { authMiddleware } from '../lib/auth';
import { uploadResume, deleteResume } from '../lib/cloudinary';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  // ── GET: list candidates (optional filter by vacancyId or status) ──
  if (req.method === 'GET') {
    const { vacancyId, status, search } = req.query;
    const filter = {};
    if (vacancyId) filter.vacancyId = vacancyId;
    if (status)    filter.status    = status;
    if (search)    filter.$or = [
      { name:     { $regex: search, $options: 'i' } },
      { email:    { $regex: search, $options: 'i' } },
      { position: { $regex: search, $options: 'i' } },
    ];
    const candidates = await Candidate.find(filter)
      .populate('vacancyId', 'title department')
      .sort({ createdAt: -1 });
    return res.status(200).json(candidates);
  }

  // ── POST: add new candidate with optional CV upload ──
  if (req.method === 'POST') {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB
    const [fields, files] = await form.parse(req);

    const data = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    );

    let resumeUrl = null;
    let resumePublicId = null;

    if (files.resume?.[0]) {
      const file = files.resume[0];
      const buffer = fs.readFileSync(file.filepath);
      const result = await uploadResume(buffer, file.originalFilename || 'resume');
      resumeUrl      = result.secure_url;
      resumePublicId = result.public_id;
      fs.unlinkSync(file.filepath);
    }

    const candidate = await Candidate.create({ ...data, resumeUrl, resumePublicId });
    return res.status(201).json(candidate);
  }

  // ── PUT: update candidate (status, interview date, joining, notes) ──
  if (req.method === 'PUT') {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);

    const data = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    );
    const { id, ...updateData } = data;

    // New CV uploaded?
    if (files.resume?.[0]) {
      const existing = await Candidate.findById(id);
      if (existing?.resumePublicId) await deleteResume(existing.resumePublicId);

      const file = files.resume[0];
      const buffer = fs.readFileSync(file.filepath);
      const result = await uploadResume(buffer, file.originalFilename || 'resume');
      updateData.resumeUrl      = result.secure_url;
      updateData.resumePublicId = result.public_id;
      fs.unlinkSync(file.filepath);
    }

    const candidate = await Candidate.findByIdAndUpdate(id, updateData, { new: true });
    return res.status(200).json(candidate);
  }

  // ── DELETE ──
  if (req.method === 'DELETE') {
    const { id } = req.query;
    const candidate = await Candidate.findById(id);
    if (candidate?.resumePublicId) await deleteResume(candidate.resumePublicId);
    await Candidate.findByIdAndDelete(id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
