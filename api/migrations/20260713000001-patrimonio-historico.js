"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Quem cadastrou o bem (desnormalizado p/ exibição rápida na lista)
        await queryInterface.addColumn("bens_permanentes", "created_by_user_id", {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "user_id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });

        // Log de eventos do patrimônio (auditoria/relatórios)
        await queryInterface.createTable("patrimonio_historico", {
            id_historico: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            // bem_id vira NULL ao excluir o bem — o evento de exclusão permanece p/ auditoria
            bem_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "bens_permanentes", key: "id_bem" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            numero_registro: { type: Sequelize.STRING(60), allowNull: true }, // snapshot (sobrevive à exclusão)
            acao: { type: Sequelize.STRING(20), allowNull: false }, // cadastro | edicao | movimentacao | exclusao
            user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            sala_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "salas", key: "sala_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            sala_anterior_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "salas", key: "sala_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            detalhe: { type: Sequelize.STRING(500), allowNull: true }, // descrição da mudança
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.addIndex("patrimonio_historico", ["bem_id"]);
        await queryInterface.addIndex("patrimonio_historico", ["numero_registro"]);

        // Funcionalidade concedível pelo chefe (RBAC do levantamento)
        await queryInterface.bulkInsert("funcionalidades", [{
            nome: "fazer_levantamento",
            descricao: "Cadastrar/editar/mover bens no levantamento patrimonial",
            modulo: "patrimonio",
        }]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("funcionalidades", { nome: { [Sequelize.Op.in]: ["fazer_levantamento"] } });
        await queryInterface.dropTable("patrimonio_historico");
        await queryInterface.removeColumn("bens_permanentes", "created_by_user_id");
    },
};
