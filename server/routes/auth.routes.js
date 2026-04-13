import { Router } from 'express';
import { postLogin } from '../controllers/authController.js';

const router = Router();
router.post('/', postLogin);

export default router;
