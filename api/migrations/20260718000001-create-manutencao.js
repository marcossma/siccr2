"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Categorias de manutenção (configuráveis; geridas pela direção)
        await queryInterface.createTable("manutencao_tipos", {
            id_tipo: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            nome: { type: Sequelize.STRING(120), allowNull: false },
            ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.bulkInsert("manutencao_tipos", [
            "Datashow/Projetor", "Ar-condicionado", "Mobiliário", "Informática",
            "Elétrica", "Hidráulica", "Estrutura/Alvenaria", "Limpeza", "Outros",
        ].map((nome) => ({ nome, ativo: true })));

        // Ocorrências de manutenção (chamados)
        await queryInterface.createTable("manutencoes", {
            id_manutencao: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            sala_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "salas", key: "sala_id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            tipo_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "manutencao_tipos", key: "id_tipo" }, onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            descricao: { type: Sequelize.TEXT, allowNull: false },
            prioridade: { type: Sequelize.STRING(10), allowNull: false, defaultValue: "media" }, // baixa|media|alta
            status: { type: Sequelize.STRING(15), allowNull: false, defaultValue: "aberta" }, // aberta|em_andamento|concluida|cancelada
            created_by_user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            resolucao: { type: Sequelize.TEXT, allowNull: true },
            data_conclusao: { type: Sequelize.DATE, allowNull: true },
            concluido_por_user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
            updatedat: { type: Sequelize.DATE, allowNull: true },
        });
        await queryInterface.addIndex("manutencoes", ["sala_id"]);
        await queryInterface.addIndex("manutencoes", ["status"]);
        await queryInterface.addIndex("manutencoes", ["tipo_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("manutencoes");
        await queryInterface.dropTable("manutencao_tipos");
    },
};
