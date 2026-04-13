import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.FORENSICS_PORT || process.env.PORT || 4000),
  databaseUrl:
    process.env.FORENSICS_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://localhost:5432/dafs_forensics',
  uploadDir: process.env.FORENSICS_UPLOAD_DIR || null,
};
