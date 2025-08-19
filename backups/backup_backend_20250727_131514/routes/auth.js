/**
 * Authentication Routes
 * Main auth routes that delegate to versioned implementations
 */

import express from 'express';
import authV1 from './v1/auth.js';

const router = express.Router();

// Use v1 auth routes as default
router.use('/', authV1);

export default router;