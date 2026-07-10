"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Nível do curso: 'graduacao' (padrão) | 'pos_graduacao'.
        // Disciplinas de pós ficam fora da listagem de ensalamento por padrão,
        // mas podem ser incluídas sob demanda.
        await queryInterface.addColumn("cursos", "nivel", {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "graduacao",
        });
        // Semeia o nível dos cursos já existentes pela mesma heurística do import
        // (case/acento-insensível). Ajuste manual posterior é preservado.
        await queryInterface.sequelize.query(`
            UPDATE cursos SET nivel = 'pos_graduacao'
            WHERE nome ~* '(MESTRADO|DOUTORADO|P[OÓ]S[- ]?GRADUA[ÇC][AÃ]O|ESPECIALIZA[ÇC][AÃ]O|\\yP?PG\\y)'
        `);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("cursos", "nivel");
    },
};
