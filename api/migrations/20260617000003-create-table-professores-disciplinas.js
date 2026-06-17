"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("professores_disciplinas", {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "users", key: "user_id" },
                onDelete: "CASCADE",
            },
            disciplina_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "disciplinas", key: "id_disciplina" },
                onDelete: "CASCADE",
            },
        });

        // Um professor não pode estar vinculado duas vezes à mesma disciplina
        await queryInterface.addConstraint("professores_disciplinas", {
            fields: ["user_id", "disciplina_id"],
            type: "unique",
            name: "professores_disciplinas_user_disciplina_unique",
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("professores_disciplinas");
    },
};
