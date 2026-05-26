'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('new', 'accepted', 'rejected', 'in_progress', 'ready', 'completed'),
        allowNull: false,
        defaultValue: 'new',
      },
      mechanism: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      case_type: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      dial: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      strap: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      engraving: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      budget: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status"');
  },
};
