'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn("subunidades", "email", "subunidade_email");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn("subunidades", "subunidade_email", "email");
  }
};
