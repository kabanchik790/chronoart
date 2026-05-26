const router = require('express').Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');

const BCRYPT_ROUNDS = 10;

function formatUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validateRegisterBody(body) {
  const { name, email, password } = body;
  if (!name || typeof name !== 'string' || !name.trim()) return 'name is required';
  if (!email || typeof email !== 'string' || !email.trim()) return 'email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'email is invalid';
  if (!password || typeof password !== 'string') return 'password is required';
  if (password.length < 6) return 'password must be at least 6 characters';
  return null;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const validationError = validateRegisterBody(req.body);
  if (validationError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: validationError });
  }

  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_EXISTS', message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, password_hash, role: 'customer' });

    req.session.userId = user.id;
    return res.status(201).json({ user: formatUser(user) });
  } catch (err) {
    // Sequelize unique constraint race condition
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ code: 'EMAIL_EXISTS', message: 'Email already registered' });
    }
    throw err;
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'email and password are required' });
  }

  const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  req.session.userId = user.id;
  return res.json({ user: formatUser(user) });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('session destroy error:', err);
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

// GET /auth/check
// checkUser уже выполнен глобально в app.js — req.user готов
router.get('/check', (req, res) => {
  if (!req.user) return res.json({ user: null });
  return res.json({ user: formatUser(req.user) });
});

module.exports = router;
