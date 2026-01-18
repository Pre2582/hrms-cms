import express from 'express';
import { login, verifyToken, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/verify', protect, verifyToken);
router.post('/logout', logout);

export default router;
