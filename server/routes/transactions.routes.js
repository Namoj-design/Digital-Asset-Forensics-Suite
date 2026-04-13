import { Router } from 'express';
import {
  postTransaction,
  getTransactionsByAddress,
} from '../controllers/transactionController.js';

const router = Router();
router.post('/', postTransaction);
router.get('/:address', getTransactionsByAddress);

export default router;
