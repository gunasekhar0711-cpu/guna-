import express from 'express';
import {
  createInspection,
  getInspections,
  getInspectionById,
  updateInspectionStatus,
  exportInspectionCsv
} from '../controllers/inspectionsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate, updateInspectionStatusSchema } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getInspections);
router.post('/', upload.single('image'), createInspection);
router.get('/:id', getInspectionById);
router.patch('/:id/status', validate(updateInspectionStatusSchema), updateInspectionStatus);
router.get('/:id/export/csv', exportInspectionCsv);

export default router;
