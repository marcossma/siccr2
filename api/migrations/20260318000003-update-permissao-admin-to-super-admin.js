'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET permissao = 'super_admin' WHERE permissao = 'admin'`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET permissao = 'admin' WHERE permissao = 'super_admin'`
    );
  }
};
