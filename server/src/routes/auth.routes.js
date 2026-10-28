import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { requireAuth, setAuthCookie, clearAuthCookie } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// Register new user (customer or agent)
authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { user, token } = await AuthService.registerUser(req.body);
    setAuthCookie(res, token);
    res.status(201).json({
      message: 'Registration successful',
      user,
    });
  } catch (err) {
    next(err);
  }
});

// Login existing user
authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await AuthService.loginUser(req.body);
    setAuthCookie(res, token);
    res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (err) {
    next(err);
  }
});

// Logout user by clearing cookie
authRouter.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

// Get current session user
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});
