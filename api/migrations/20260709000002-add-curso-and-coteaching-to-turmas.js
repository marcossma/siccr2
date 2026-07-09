"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Curso ofertante da turma
        await queryInterface.addColumn("turmas", "curso_id", {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "cursos", key: "id_curso" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });
        // ID institucional único da turma (ID_TURMA da planilha) — chave de upsert
        await queryInterface.addColumn("turmas", "id_turma_externo", {
            type: Sequelize.INTEGER,
            allowNull: true,
            unique: true,
        });

        // Co-docência: N professores por turma (professor_user_id em turmas fica como "principal")
        await queryInterface.createTable("turmas_professores", {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            turma_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "turmas", key: "id_turma" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            // Encargo docente (horas) daquele professor na turma (ENCARGO_DOCENT)
            encargo: { type: Sequelize.DECIMAL(6, 1), allowNull: true },
        });
        await queryInterface.addConstraint("turmas_professores", {
            fields: ["turma_id", "user_id"],
            type: "unique",
            name: "turmas_professores_turma_user_unique",
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("turmas_professores");
        await queryInterface.removeColumn("turmas", "id_turma_externo");
        await queryInterface.removeColumn("turmas", "curso_id");
    },
};
