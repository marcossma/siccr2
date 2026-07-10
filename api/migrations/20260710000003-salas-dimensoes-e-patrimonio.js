"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Dimensões físicas da sala (em metros). Nullable — preenchidas no mapeamento.
        await queryInterface.addColumn("salas", "sala_largura", {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
        });
        await queryInterface.addColumn("salas", "sala_comprimento", {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
        });
        await queryInterface.addColumn("salas", "sala_altura", {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
        });

        // Bens permanentes (levantamento patrimonial por sala)
        await queryInterface.createTable("bens_permanentes", {
            id_bem: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            numero_registro: {
                type: Sequelize.STRING(60),
                allowNull: false,
                unique: true,
            },
            descricao: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            sala_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "salas", key: "sala_id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            subunidade_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "subunidades", key: "subunidade_id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            estado_conservacao: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            observacao: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            data_levantamento: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
        await queryInterface.addIndex("bens_permanentes", ["sala_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("bens_permanentes");
        await queryInterface.removeColumn("salas", "sala_altura");
        await queryInterface.removeColumn("salas", "sala_comprimento");
        await queryInterface.removeColumn("salas", "sala_largura");
    },
};
