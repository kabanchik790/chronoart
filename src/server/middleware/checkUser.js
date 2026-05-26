const { User } = require('../models');

async function checkUser(req, res, next) {
  req.user = null;
  if (!req.session.userId) return next();
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ['id', 'name', 'email', 'role'],
    });
    req.user = user || null;
    // Если сессия ссылается на удалённого пользователя — чистим её
    if (!user) req.session.userId = undefined;
  } catch (err) {
    console.error('checkUser error:', err);
  }
  next();
}

module.exports = checkUser;
