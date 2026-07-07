import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

const CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export function getResumeExtension(filename = '') {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.docx')) return '.docx';
  if (lower.endsWith('.doc')) return '.doc';
  return '.pdf';
}

export function sanitizeFilename(filename = 'resume.pdf') {
  const safe = String(filename).replace(/[^\w.\-() ]/g, '_').trim() || 'resume.pdf';
  const lower = safe.toLowerCase();
  if (CV_EXTENSIONS.some(ext => lower.endsWith(ext))) return safe;
  return `${safe}.pdf`;
}

export function buildResumeFileName(candidateName, originalFilename) {
  const ext = getResumeExtension(originalFilename);
  if (candidateName) {
    const safe = String(candidateName).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    if (safe) return `${safe}_CV${ext}`;
  }
  return sanitizeFilename(originalFilename || `resume${ext}`);
}

export function getResumeContentType(filename = 'resume.pdf') {
  const ext = getResumeExtension(filename);
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.doc') return 'application/msword';
  return 'application/pdf';
}

export function isValidCvBuffer(buffer, filename = 'resume.pdf') {
  if (!buffer || buffer.length < 4) return false;

  const ext = getResumeExtension(filename);
  if (ext === '.pdf') return buffer.slice(0, 4).toString('ascii') === '%PDF';
  if (ext === '.docx') return buffer[0] === 0x50 && buffer[1] === 0x4B;
  if (ext === '.doc') return buffer[0] === 0xD0 && buffer[1] === 0xCF;

  const preview = buffer.slice(0, 200).toString('utf8').toLowerCase();
  return !preview.includes('<!doctype') && !preview.includes('<html');
}

export async function uploadResume(buffer, filename) {
  const safeName = sanitizeFilename(filename);
  const ext = getResumeExtension(safeName);
  const base = safeName.replace(/\.(pdf|docx?)$/i, '').replace(/\s+/g, '_');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'hr-resumes',
        resource_type: 'raw',
        public_id:     `resume_${Date.now()}_${base}${ext}`,
        type:          'upload',
        access_mode:   'public',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/** Force browser download with correct filename */
export function getResumeDownloadUrl(publicId, filename = 'resume.pdf') {
  if (!publicId) return null;
  const name = sanitizeFilename(filename);
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type:          'upload',
    secure:        true,
    flags:         `attachment:${name}`,
  });
}

/** URL to open/view CV in browser */
export function getResumeViewUrl(publicId) {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type:          'upload',
    secure:        true,
  });
}

/**
 * Authenticated download URL via Cloudinary's private_download endpoint.
 * Includes API key + HMAC signature — works even when public delivery is blocked
 * ("Customer is marked as untrusted" / "Blocked for delivery").
 */
export function getAuthenticatedDownloadUrl(publicId, filename = 'resume.pdf') {
  if (!publicId) return null;
  const name = sanitizeFilename(filename);
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type:          'upload',
    attachment:    name,
    expires_at:    Math.floor(Date.now() / 1000) + 7200, // 2 h expiry
  });
}

export async function deleteResume(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

export default cloudinary;
