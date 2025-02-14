'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("predios", {
      predio_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      predio: {
        type: Sequelize.STRING
      },
      descricao: {
        type: Sequelize.STRING
      },
      createdat: {
        type: Sequelize.DATE
      },
      updatedat: {
        type: Sequelize.DATE
      },
      updatedforuser: {
        type: Sequelize.STRING
      }
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("predios");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
