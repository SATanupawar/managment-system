import connectDB from '../../lib/mongodb';
import { Candidate } from '../../lib/models';
import { authMiddleware } from '../../lib/auth';
import { getAuthenticatedDownloadUrl, buildResumeFileName } from '../../lib/cloudinary';
import https from 'https';
import http from 'http';

export const config = { api: { responseLimit: '20mb' } };

function fetchUrl(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchUrl(next, redirectCount + 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || '',
        status: res.statusCode,
      }));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  try {
    // Accept token from Authorization header OR ?token= query param
    // (browser <a> link clicks cannot send custom Authorization headers)
    let user = authMiddleware(req);
    if (!user && req.query.token) {
      const { verifyToken } = await import('../../lib/auth');
      user = verifyToken(req.query.token);
    }
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Candidate id required' });

    await connectDB();
    const candidate = await Candidate.findById(id)
      .select('name resumePublicId resumeFileName');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (!candidate.resumePublicId) {
      return res.status(404).json({ error: 'No CV uploaded for this candidate' });
    }

    const filename = buildResumeFileName(candidate.name, candidate.resumeFileName);

    // Generate a fresh authenticated signed URL every request.
    // This bypasses Cloudinary "Blocked for delivery" / "untrusted account" restrictions
    // because it includes API key + HMAC signature (valid for 2 hours).
    const signedUrl = getAuthenticatedDownloadUrl(candidate.resumePublicId, filename);
    console.log(`[download-cv] Fetching signed URL for publicId: ${candidate.resumePublicId}`);

    const { buffer, status } = await fetchUrl(signedUrl);

    // Validate we got an actual PDF (magic bytes %PDF)
    if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
      const preview = buffer.slice(0, 300).toString('utf8');
      console.error(`[download-cv] Non-PDF content (HTTP ${status}). Preview:`, preview);
      return res.status(502).json({
        error: 'The stored CV file is corrupted or inaccessible. Please re-upload the CV.',
      });
    }

    const safeFilename = filename.replace(/"/g, '\\"');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (err) {
    console.error('[download-cv] Error:', err);
    return res.status(500).json({ error: err.message || 'Download failed' });
  }
}
