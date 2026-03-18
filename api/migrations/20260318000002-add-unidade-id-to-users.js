'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'unidade_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'unidades', key: 'unidade_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'unidade_id');
  }
};
