/**
 * Activity Routes Module
 * Router principale per le API Activity
 * 
 * @module routes/activity
 */

import express from 'express';
import logsRouter from './logs.js';
import analyticsRouter from './analytics.js';

const router = express.Router();

// Mount sub-routers
router.use('/', logsRouter);
router.use('/analytics', analyticsRouter);

export default router;
