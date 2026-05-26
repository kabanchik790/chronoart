const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 МБ

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('INVALID_MIME');
    cb(err);
  }
}

function makeStorage(folder) {
  return multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads', folder),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const uploadProject = multer({
  storage: makeStorage('projects'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('image');

const uploadMessage = multer({
  storage: makeStorage('messages'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('image');

module.exports = { uploadProject, uploadMessage };
