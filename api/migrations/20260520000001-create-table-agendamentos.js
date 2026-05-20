"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("agendamentos", {
            id_agendamento: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            sala_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "salas", key: "sala_id" },
                onDelete: "RESTRICT",
            },
            solicitante_user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "users", key: "user_id" },
                onDelete: "RESTRICT",
            },
            motivo: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            observacao: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            dia_inteiro: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            hora_inicio: {
                type: Sequelize.TIME,
                allowNull: true,
            },
            hora_fim: {
                type: Sequelize.TIME,
                allowNull: true,
            },
            data_inicio: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            data_fim_recorrencia: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            tipo_recorrencia: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: "pontual",
            },
            dias_semana: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            intervalo_semanas: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: "pendente",
            },
            aprovado_por_user_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "users", key: "user_id" },
                onDelete: "SET NULL",
            },
            data_decisao: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            motivo_rejeicao: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });

        await queryInterface.addIndex("agendamentos", ["sala_id"]);
        await queryInterface.addIndex("agendamentos", ["solicitante_user_id"]);
        await queryInterface.addIndex("agendamentos", ["status"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("agendamentos");
    },
};
