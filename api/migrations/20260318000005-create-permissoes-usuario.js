'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissoes_usuario', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      funcionalidade_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'funcionalidades', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      concedido_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Índice único para evitar permissão duplicada
    await queryInterface.addIndex('permissoes_usuario', ['user_id', 'funcionalidade_id'], {
      unique: true,
      name: 'permissoes_usuario_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permissoes_usuario');
  }
};
