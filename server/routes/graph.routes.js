import { Router } from 'express';
import { getGraph } from '../controllers/graphController.js';

const router = Router();
router.get('/:address', getGraph);

export default router;
