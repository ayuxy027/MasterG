import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import env from '../config/env';
import { SUPPORTED_FILE_TYPES } from '../config/constants';

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = Object.values(SUPPORTED_FILE_TYPES);
  
  if (allowedMimes.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and images are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});
