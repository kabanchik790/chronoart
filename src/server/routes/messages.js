const router = require('express').Router();
const path = require('path');
const { Op } = require('sequelize');
const { Message, Order, User } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const requireOrderAccess = require('../middleware/requireOrderAccess');
const { uploadMessage } = require('../middleware/upload');
const { sendMail, buildMessageEmail } = require('../email/transporter');

// GET /api/orders/:id/messages
router.get('/orders/:id/messages', requireAuth, requireOrderAccess, async (req, res, next) => {
  try {
    const messages = await Message.findAll({
      where: { order_id: req.params.id },
      attributes: ['id', 'type', 'user_id', 'text', 'image_url', 'created_at', 'read_at'],
      order: [['created_at', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/messages
router.post('/orders/:id/messages', requireAuth, requireOrderAccess, uploadMessage, async (req, res, next) => {
  try {
    const text = req.body.text ? req.body.text.trim() : null;
    const imageUrl = req.file ? `uploads/messages/${req.file.filename}` : null;

    if (!text && !imageUrl) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Text or image required' });
    }

    const message = await Message.create({
      order_id: parseInt(req.params.id, 10),
      user_id: req.user.id,
      type: 'user',
      text: text || null,
      image_url: imageUrl,
    });

    if (req.user.role === 'admin') {
      // FR-18: fire-and-forget после INSERT, ошибка SMTP не блокирует ответ
      Order.findByPk(req.params.id, { attributes: ['user_id'] }).then((ord) => {
        if (!ord) return;
        return User.findByPk(ord.user_id, { attributes: ['email'] }).then((owner) => {
          if (owner) {
            sendMail(buildMessageEmail(owner.email, req.params.id, text))
              .catch((err) => console.error('[email] FR-18 sendMail error:', err));
          }
        });
      }).catch((err) => console.error('[email] FR-18 DB error:', err));
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/messages/mark-read
router.post('/orders/:id/messages/mark-read', requireAuth, requireOrderAccess, async (req, res, next) => {
  try {
    const [count] = await Message.update(
      { read_at: new Date() },
      {
        where: {
          order_id: req.params.id,
          type: 'user',
          user_id: { [Op.ne]: req.user.id },
          read_at: null,
        },
      }
    );
    res.json({ updated: count });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/messages/:messageId/image
router.get('/orders/:id/messages/:messageId/image', requireAuth, requireOrderAccess, async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.messageId, {
      attributes: ['id', 'order_id', 'image_url'],
    });

    if (!message || message.order_id !== parseInt(req.params.id, 10)) {
      return res.status(404).json({ message: 'Not found' });
    }

    if (!message.image_url) {
      return res.status(404).json({ message: 'No image' });
    }

    const absPath = path.join(__dirname, '..', message.image_url);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
