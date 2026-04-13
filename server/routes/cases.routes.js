import { Router } from 'express';
import {
  postCase,
  getCases,
  getCase,
  putCase,
  removeCase,
} from '../controllers/caseController.js';

const router = Router();
router.post('/', postCase);
router.get('/', getCases);
router.get('/:id', getCase);
router.put('/:id', putCase);
router.delete('/:id', removeCase);

export default router;
