import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

export function sanitizeFilename(filename = 'resume.pdf') {
  const safe = String(filename).replace(/[^\w.\-() ]/g, '_').trim() || 'resume.pdf';
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

export function buildResumeFileName(candidateName, originalFilename) {
  if (candidateName) {
    const safe = String(candidateName).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    if (safe) return `${safe}_CV.pdf`;
  }
  return sanitizeFilename(originalFilename || 'resume.pdf');
}

export async function uploadResume(buffer, filename) {
  const safeName = sanitizeFilename(filename);
  const base = safeName.replace(/\.pdf$/i, '').replace(/\s+/g, '_');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'hr-resumes',
        resource_type: 'raw',
        public_id:     `resume_${Date.now()}_${base}.pdf`,
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

/** Force browser download with correct .pdf filename */
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

/** URL to open/view PDF in browser */
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
