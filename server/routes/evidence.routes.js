import { Router } from 'express';
import { getEvidence } from '../controllers/evidenceController.js';

const router = Router();
router.get('/:case_id', getEvidence);

export default router;
