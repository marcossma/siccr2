"use strict";

module.exports = {
    // Índice único case/espaço-insensível na identificação da sala (à prova de corrida).
    // A checagem amigável fica no route; este índice é a garantia final no banco.
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            "CREATE UNIQUE INDEX IF NOT EXISTS salas_nome_unico ON salas (LOWER(TRIM(sala_nome)))"
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query("DROP INDEX IF EXISTS salas_nome_unico");
    },
};
