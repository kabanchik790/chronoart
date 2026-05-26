const { Order } = require('../models');

// Используется после requireAuth — req.user гарантированно не null
async function requireOrderAccess(req, res, next) {
  const orderId = req.params.id;
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.order = order;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireOrderAccess;
