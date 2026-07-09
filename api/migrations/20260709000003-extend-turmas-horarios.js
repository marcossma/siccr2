"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Horário pode existir sem sala (aguardando ensalamento)
        await queryInterface.changeColumn("turmas_horarios", "sala_id", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
        // Tipo de aula: teorica / pratica / teorica_ext / pratica_ext
        await queryInterface.addColumn("turmas_horarios", "tipo_aula", {
            type: Sequelize.STRING(20),
            allowNull: true,
        });
        // Sub-período do horário (aulas modulares por blocos de data).
        // NULL = usa o período letivo inteiro.
        await queryInterface.addColumn("turmas_horarios", "data_inicio", {
            type: Sequelize.DATEONLY,
            allowNull: true,
        });
        await queryInterface.addColumn("turmas_horarios", "data_fim", {
            type: Sequelize.DATEONLY,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("turmas_horarios", "data_fim");
        await queryInterface.removeColumn("turmas_horarios", "data_inicio");
        await queryInterface.removeColumn("turmas_horarios", "tipo_aula");
        await queryInterface.changeColumn("turmas_horarios", "sala_id", {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    },
};
