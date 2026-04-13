import { Router } from 'express';
import { getAddressesByRisk } from '../controllers/addressController.js';

const router = Router();
router.get('/', getAddressesByRisk);

export default router;
