'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      subunidade_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'subunidades', key: 'subunidade_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      api_key: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true
      },
      descricao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
  }
};
