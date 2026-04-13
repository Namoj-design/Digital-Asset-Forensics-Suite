import { Router } from 'express';
import { createEvidenceUploader } from '../config/uploadMulter.js';
import { postUpload } from '../controllers/evidenceController.js';

const upload = createEvidenceUploader();
const router = Router();
router.post('/', upload.single('file'), postUpload);

export default router;
