'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('funcionalidades', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      descricao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      modulo: {
        type: Sequelize.STRING(50),
        allowNull: false
      }
    });

    // Pré-popular com as funcionalidades do sistema
    await queryInterface.bulkInsert('funcionalidades', [
      // Módulo: usuários
      { nome: 'ver_usuarios',            descricao: 'Visualizar lista de usuários',              modulo: 'usuarios' },
      { nome: 'criar_usuario',           descricao: 'Cadastrar novo usuário',                    modulo: 'usuarios' },
      { nome: 'editar_usuario',          descricao: 'Editar dados de usuário',                   modulo: 'usuarios' },
      { nome: 'excluir_usuario',         descricao: 'Excluir usuário',                           modulo: 'usuarios' },
      { nome: 'gerenciar_permissoes',    descricao: 'Conceder/revogar permissões de servidores', modulo: 'usuarios' },
      // Módulo: financeiro
      { nome: 'ver_despesas',            descricao: 'Visualizar despesas',                       modulo: 'financeiro' },
      { nome: 'criar_despesa',           descricao: 'Registrar nova despesa',                    modulo: 'financeiro' },
      { nome: 'editar_despesa',          descricao: 'Editar despesa',                            modulo: 'financeiro' },
      { nome: 'excluir_despesa',         descricao: 'Excluir despesa',                           modulo: 'financeiro' },
      { nome: 'ver_tipos_despesas',      descricao: 'Visualizar tipos de despesas',              modulo: 'financeiro' },
      { nome: 'gerenciar_tipos_despesas',descricao: 'Criar/editar tipos de despesas',            modulo: 'financeiro' },
      { nome: 'ver_recursos',            descricao: 'Visualizar recursos recebidos',             modulo: 'financeiro' },
      { nome: 'criar_recurso',           descricao: 'Registrar recurso recebido',                modulo: 'financeiro' },
      { nome: 'editar_recurso',          descricao: 'Editar recurso recebido',                   modulo: 'financeiro' },
      { nome: 'ver_tipos_recursos',      descricao: 'Visualizar tipos de recursos',              modulo: 'financeiro' },
      { nome: 'gerenciar_tipos_recursos',descricao: 'Criar/editar tipos de recursos',            modulo: 'financeiro' },
      // Módulo: patrimônio
      { nome: 'ver_predios',             descricao: 'Visualizar prédios',                        modulo: 'patrimonio' },
      { nome: 'gerenciar_predios',       descricao: 'Criar/editar prédios',                      modulo: 'patrimonio' },
      { nome: 'ver_salas',               descricao: 'Visualizar salas',                          modulo: 'patrimonio' },
      { nome: 'gerenciar_salas',         descricao: 'Criar/editar salas',                        modulo: 'patrimonio' },
      { nome: 'ver_tipos_sala',          descricao: 'Visualizar tipos de sala',                  modulo: 'patrimonio' },
      { nome: 'gerenciar_tipos_sala',    descricao: 'Criar/editar tipos de sala',                modulo: 'patrimonio' },
      // Módulo: infraestrutura
      { nome: 'ver_subunidades',         descricao: 'Visualizar subunidades',                    modulo: 'infraestrutura' },
      { nome: 'gerenciar_subunidades',   descricao: 'Criar/editar subunidades',                  modulo: 'infraestrutura' },
      { nome: 'ver_unidades',            descricao: 'Visualizar unidades',                       modulo: 'infraestrutura' },
      // Módulo: almoxarifado
      { nome: 'ver_pedidos_almoxarifado',    descricao: 'Visualizar pedidos ao almoxarifado',   modulo: 'almoxarifado' },
      { nome: 'criar_pedido_almoxarifado',   descricao: 'Criar pedido ao almoxarifado',         modulo: 'almoxarifado' },
      { nome: 'gerenciar_pedidos_almoxarifado', descricao: 'Gerenciar pedidos ao almoxarifado', modulo: 'almoxarifado' },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('funcionalidades');
  }
};
