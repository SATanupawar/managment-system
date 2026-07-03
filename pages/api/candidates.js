import connectDB from '../../lib/mongodb';
import { Candidate } from '../../lib/models';
import { authMiddleware } from '../../lib/auth';
import { uploadResume, deleteResume, getResumeDownloadUrl, getResumeViewUrl, buildResumeFileName } from '../../lib/cloudinary';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

function normalizeCandidateData(raw = {}) {
  const data = { ...raw };
  delete data.id;

  if (data.vacancyId === '' || data.vacancyId === 'null' || data.vacancyId === 'undefined') {
    data.vacancyId = null;
  }

  if (data.interviewDate) data.interviewDate = new Date(data.interviewDate);
  else data.interviewDate = null;

  if (data.joiningDate) data.joiningDate = new Date(data.joiningDate);
  else data.joiningDate = null;

  if (data.joiningConfirmed !== undefined && data.joiningConfirmed !== '') {
    data.joiningConfirmed = data.joiningConfirmed === true || data.joiningConfirmed === 'true';
  }

  if (data.status === 'Screening') data.status = 'Applied';

  return data;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function parseRequest(req) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    const body = await readJsonBody(req);
    return { data: body || {}, files: {} };
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  const [fields, files] = await form.parse(req);
  const data = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );
  return { data, files };
}

function applyResumeUrls(payload, result, originalFilename) {
  const fileName = buildResumeFileName(payload.name, originalFilename);
  payload.resumePublicId  = result.public_id;
  payload.resumeFileName  = fileName;
  // Store the actual Cloudinary secure_url (includes version) — avoids URL-generation mismatches
  payload.resumeUrl       = result.secure_url || getResumeViewUrl(result.public_id);
  payload.resumeDownloadUrl = getResumeDownloadUrl(result.public_id, fileName);
}

function enrichCandidate(doc) {
  const c = doc.toObject ? doc.toObject() : { ...doc };
  if (c.status === 'Screening') c.status = 'Applied';
  if (c.resumePublicId) {
    const fileName = buildResumeFileName(c.name, c.resumeFileName);
    c.resumeFileName = fileName;
    c.resumeDownloadUrl = getResumeDownloadUrl(c.resumePublicId, fileName);
    if (!c.resumeUrl) c.resumeUrl = getResumeViewUrl(c.resumePublicId);
  }
  return c;
}

export default async function handler(req, res) {
  try {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await connectDB();

    if (req.method === 'GET') {
      const { vacancyId, status, search } = req.query;
      const filter = {};
      if (vacancyId) filter.vacancyId = vacancyId;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { position: { $regex: search, $options: 'i' } },
        ];
      }
      const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
      return res.status(200).json(candidates.map(enrichCandidate));
    }

    if (req.method === 'POST') {
      const { data, files } = await parseRequest(req);
      const payload = normalizeCandidateData(data);

      if (payload.email) {
        payload.email = payload.email.toLowerCase().trim();
        const exists = await Candidate.findOne({ email: payload.email });
        if (exists) {
          return res.status(409).json({ error: 'A candidate with this email already exists' });
        }
      }

      if (files.resume?.[0]) {
        const file = files.resume[0];
        const buffer = fs.readFileSync(file.filepath);
        try {
          const result = await uploadResume(buffer, file.originalFilename || file.newFilename || 'resume.pdf');
          applyResumeUrls(payload, result, file.originalFilename || file.newFilename);
        } finally {
          fs.unlinkSync(file.filepath);
        }
      }

      const candidate = await Candidate.create(payload);
      return res.status(201).json(candidate);
    }

    if (req.method === 'PUT') {
      const { data, files } = await parseRequest(req);
      const { id, ...rawUpdate } = data;
      if (!id) return res.status(400).json({ error: 'Candidate id is required' });

      const updateData = normalizeCandidateData(rawUpdate);

      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase().trim();
        const dup = await Candidate.findOne({ email: updateData.email, _id: { $ne: id } });
        if (dup) {
          return res.status(409).json({ error: 'A candidate with this email already exists' });
        }
      }

      if (files.resume?.[0]) {
        const existing = await Candidate.findById(id);
        if (existing?.resumePublicId) {
          try { await deleteResume(existing.resumePublicId); } catch (_) { /* ignore */ }
        }

        const file = files.resume[0];
        const buffer = fs.readFileSync(file.filepath);
        try {
          const result = await uploadResume(buffer, file.originalFilename || file.newFilename || 'resume.pdf');
          applyResumeUrls(updateData, result, file.originalFilename || file.newFilename);
        } finally {
          fs.unlinkSync(file.filepath);
        }
      }

      const candidate = await Candidate.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      return res.status(200).json(candidate);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Candidate id is required' });

      const candidate = await Candidate.findById(id);
      if (candidate?.resumePublicId) {
        try { await deleteResume(candidate.resumePublicId); } catch (_) { /* ignore */ }
      }
      await Candidate.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Candidates API error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A candidate with this email already exists' });
    }
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
