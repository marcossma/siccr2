'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn("tipos_despesas", "id", "id_tipo_despesa");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn("tipos_despesas", "id_tipo_despesa", "id");
  }
};
