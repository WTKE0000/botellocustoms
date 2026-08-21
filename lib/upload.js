const multer = require('multer');
const { adminClient } = require('./supabase');

const BUCKET = 'uploads';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
  }
});

// Uploads a multer memory-buffer file to Supabase Storage and returns its public URL
async function uploadToStorage(file, folder = 'misc') {
  if (!file) return null;
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await adminClient().storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = adminClient().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { upload, uploadToStorage };
