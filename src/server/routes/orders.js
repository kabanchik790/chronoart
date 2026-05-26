const router = require('express').Router();
const bcrypt = require('bcrypt');
const { sequelize, User, Order, Message } = require('../models');
const { STATUS_TRANSITIONS } = require('../models/Order');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requireOrderAccess = require('../middleware/requireOrderAccess');
const { sendMail, buildStatusEmail } = require('../email/transporter');

// ── Валидация полей заказа ──────────────────────────────────────────────────

function validateOrderFields(body) {
  const { mechanism, case_type, dial, strap, engraving, budget, notes } = body;
  const errors = [];

  for (const [key, val] of [['mechanism', mechanism], ['case_type', case_type], ['dial', dial], ['strap', strap]]) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      errors.push(`${key} is required`);
    } else if (val.trim().length > 100) {
      errors.push(`${key} must be ≤ 100 characters`);
    }
  }

  if (engraving !== undefined && engraving !== null && engraving !== '') {
    if (typeof engraving !== 'string' || engraving.trim().length > 50) {
      errors.push('engraving must be ≤ 50 characters');
    }
  }

  const budgetNum = parseInt(budget, 10);
  if (!budget || isNaN(budgetNum) || budgetNum <= 0) {
    errors.push('budget must be a positive integer');
  }

  return errors;
}

function validateGuestFields(body) {
  const { name, email, password } = body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('email is required and must be valid');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('password must be at least 6 characters');
  }

  return errors;
}

// ── POST /api/new-order ─────────────────────────────────────────────────────

router.post('/new-order', async (req, res, next) => {
  try {
    const orderErrors = validateOrderFields(req.body);
    if (orderErrors.length > 0) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: orderErrors });
    }

    const { mechanism, case_type, dial, strap, engraving, budget, notes } = req.body;
    const orderData = {
      mechanism: mechanism.trim(),
      case_type: case_type.trim(),
      dial: dial.trim(),
      strap: strap.trim(),
      engraving: engraving ? engraving.trim() : null,
      budget: parseInt(budget, 10),
      notes: notes || null,
    };

    // Авторизованный пользователь
    if (req.user) {
      const order = await Order.create({ ...orderData, user_id: req.user.id });
      return res.status(201).json({ order_id: order.id });
    }

    // Гость — сначала валидируем регистрационные поля
    const guestErrors = validateGuestFields(req.body);
    if (guestErrors.length > 0) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: guestErrors });
    }

    const { name, email, password } = req.body;

    // Проверяем занятость email до транзакции (FR-03a)
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_EXISTS' });
    }

    // Транзакция: создаём пользователя и заказ атомарно
    const password_hash = await bcrypt.hash(password, 10);

    let newOrder;
    await sequelize.transaction(async (t) => {
      const newUser = await User.create(
        { name: name.trim(), email: email.toLowerCase(), password_hash, role: 'customer' },
        { transaction: t }
      );
      newOrder = await Order.create(
        { ...orderData, user_id: newUser.id },
        { transaction: t }
      );
      // Устанавливаем сессию внутри транзакции — userId будет записан после COMMIT
      req.session.userId = newUser.id;
    });

    return res.status(201).json({ order_id: newOrder.id });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders ─────────────────────────────────────────────────────────

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const where = req.user.role === 'customer' ? { user_id: req.user.id } : {};
    const userId = parseInt(req.user.id, 10);

    const orders = await Order.findAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)::int FROM messages
              WHERE messages.order_id = "Order".id
                AND messages.type = 'user'
                AND messages.user_id <> ${userId}
                AND messages.read_at IS NULL
            )`),
            'unread_count',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:id ──────────────────────────────────────────────────────

router.get('/orders/:id', requireAuth, requireOrderAccess, async (req, res, next) => {
  try {
    const order = req.order;
    const [user, messages] = await Promise.all([
      User.findByPk(order.user_id, { attributes: ['id', 'name', 'email'] }),
      Message.findAll({
        where: { order_id: order.id },
        attributes: ['id', 'type', 'user_id', 'text', 'image_url', 'created_at', 'read_at'],
        order: [['created_at', 'ASC']],
      }),
    ]);
    return res.json({ order, user, messages });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/orders/:id/status ───────────────────────────────────────────────

router.put('/orders/:id/status', requireAdmin, requireOrderAccess, async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    const order = req.order;
    const oldStatus = order.status;

    const allowed = STATUS_TRANSITIONS[oldStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return res.status(400).json({ code: 'INVALID_TRANSITION' });
    }

    let updatedOrder, systemMessage;

    await sequelize.transaction(async (t) => {
      await order.update({ status: newStatus }, { transaction: t });
      systemMessage = await Message.create(
        {
          order_id: order.id,
          user_id: null,
          type: 'system',
          text: `Статус изменён: ${oldStatus}→${newStatus}`,
        },
        { transaction: t }
      );
    });

    updatedOrder = await Order.findByPk(order.id);

    // FR-17: fire-and-forget после COMMIT, ошибка SMTP не блокирует ответ
    User.findByPk(order.user_id, { attributes: ['email'] }).then((orderOwner) => {
      if (orderOwner) {
        sendMail(buildStatusEmail(orderOwner.email, order.id, oldStatus, newStatus))
          .catch((err) => console.error('[email] FR-17 sendMail error:', err));
      }
    }).catch((err) => console.error('[email] FR-17 DB error:', err));

    return res.json({ order: updatedOrder, systemMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
