const { DataTypes } = require('sequelize');

const ORDER_STATUSES = ['new', 'accepted', 'rejected', 'in_progress', 'ready', 'completed'];

// Матрица допустимых переходов статуса
const STATUS_TRANSITIONS = {
  new: ['accepted', 'rejected'],
  accepted: ['in_progress'],
  rejected: [],
  in_progress: ['ready'],
  ready: ['completed'],
  completed: [],
};

const OrderModel = (sequelize) => {
  return sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'new',
    },
    mechanism: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    case_type: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    dial: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    strap: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    engraving: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    budget: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};

module.exports = OrderModel;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
