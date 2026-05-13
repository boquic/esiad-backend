import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { ENV } from '../config/env';

// Asegurar que la carpeta de destino existe
if (!fs.existsSync(ENV.UPLOAD_PATH)) {
  fs.mkdirSync(ENV.UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ENV.UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.dwg', '.dxf', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no permitido. Solo se aceptan .dwg, .dxf, .pdf'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.UPLOAD_MAX_SIZE_MB * 1024 * 1024 // MB a Bytes
  }
});

const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no permitido. Solo se aceptan imágenes (.jpg, .jpeg, .png)'));
  }
};

export const uploadImageMiddleware = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: ENV.UPLOAD_MAX_SIZE_MB * 1024 * 1024 // MB a Bytes
  }
});

type UploadErrorResponse = {
  status: number;
  message: string;
};

export function buildUploadErrorResponse(error: unknown): UploadErrorResponse | null {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 413,
        message: `El archivo excede el tamaño máximo permitido de ${ENV.UPLOAD_MAX_SIZE_MB}MB`
      };
    }

    return {
      status: 400,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      status: 400,
      message: error.message
    };
  }

  return null;
}
