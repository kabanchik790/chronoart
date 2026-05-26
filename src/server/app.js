require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const multer = require('multer');

const checkUser = require('./middleware/checkUser');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const messagesRouter = require('./routes/messages');
const projectsRouter = require('./routes/projects');

const app = express();

// За nginx Express не видит HTTPS; без trust proxy cookie.secure не работает
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  store: new FileStore({
    path: path.join(__dirname, 'sessions'),
    ttl: 604800,
    retries: 0,
  }),
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 604800000,
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Публичная раздача фото портфолио
app.use('/uploads/projects', express.static(path.join(__dirname, 'uploads', 'projects')));
// uploads/messages НЕ раздаётся — только через защищённый endpoint

app.use(checkUser);

app.use('/auth', authRouter);
app.use('/api', ordersRouter);
app.use('/api', messagesRouter);
app.use('/api', projectsRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Глобальный error handler — подключается после всех маршрутов
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ code: err.code, message: err.message });
  }
  if (err.message === 'INVALID_MIME') {
    return res.status(400).json({ code: 'INVALID_MIME', message: 'Invalid file type. Allowed: jpeg, png, webp' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
