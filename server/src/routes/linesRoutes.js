import express from 'express';
import { getLines, createLine, getLineById } from '../controllers/linesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, createLineSchema } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getLines);
router.post('/', validate(createLineSchema), createLine);
router.get('/:id', getLineById);

export default router;
