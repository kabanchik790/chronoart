const { Sequelize } = require('sequelize');

const UserModel = require('./User');
const OrderModel = require('./Order');
const MessageModel = require('./Message');
const ProjectModel = require('./Project');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

const User = UserModel(sequelize);
const Order = OrderModel(sequelize);
const Message = MessageModel(sequelize);
const Project = ProjectModel(sequelize);

User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Order.hasMany(Message, { foreignKey: 'order_id', as: 'messages' });
Message.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

User.hasMany(Message, { foreignKey: 'user_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'user_id', as: 'sender' });

module.exports = { sequelize, Sequelize, User, Order, Message, Project };
