'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable("salas", {
      sala_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sala_nome: {
        type: Sequelize.STRING
      },
      predio_id: {
        type: Sequelize.INTEGER
      },
      departamento_id: {
        type: Sequelize.INTEGER
      },
      is_agendavel: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      }
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("salas");
  }
};
