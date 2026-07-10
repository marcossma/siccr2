"use strict";

module.exports = {
    // Catch-up: a migration anterior semeou o nível antes da regra "PG" existir,
    // deixando cursos como "PG ... - D/M" (sem a palavra Mestrado/Doutorado) como
    // graduação. Reaplica a heurística já com PG. Idempotente para instalações novas.
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE cursos SET nivel = 'pos_graduacao'
            WHERE nivel <> 'pos_graduacao'
              AND nome ~* '(MESTRADO|DOUTORADO|P[OÓ]S[- ]?GRADUA[ÇC][AÃ]O|ESPECIALIZA[ÇC][AÃ]O|\\yP?PG\\y)'
        `);
    },

    async down() {
        // Sem rollback: reclassificação de dados não é revertível com segurança.
    },
};
