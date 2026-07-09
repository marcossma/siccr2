"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("cursos", {
            id_curso: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            // Código institucional do curso (ex: 401 Agronomia, 403 Medicina Veterinária)
            cod_curso: { type: Sequelize.STRING(20), allowNull: false, unique: true },
            nome: { type: Sequelize.STRING(255), allowNull: false },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("cursos");
    },
};
