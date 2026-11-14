import express from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', getAnalyticsSummary);

export default router;
