"use strict";

// Broadcaster WebSocket compartilhado — um único ponto para emitir eventos
// em tempo real a partir de qualquer rota, sem precisar passar `wss` por
// factory. O server.js chama setWss(wss) uma vez no boot.
//
// Convenção de eventos (o cliente escuta em scripts.js):
//   agendamento_pendente / agendamento_decidido → solicitações (em agendamentos.js)
//   agenda_atualizada                            → aulas alocadas/editadas/removidas
//   pedido_pendente / pedido_atendido            → almoxarifado

const WebSocket = require("ws");
const logger = require("./logger.js");

let _wss = null;

function setWss(wss) {
    _wss = wss;
}

// Envia { tipo, ...payload } aos clientes autenticados que passam no predicado.
// predicado default = todos os autenticados.
function broadcast(tipo, payload = {}, predicado = () => true) {
    if (!_wss) return;
    const msg = JSON.stringify({ tipo, ...payload });
    _wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN || !client.usuario) return;
        try {
            if (predicado(client.usuario)) client.send(msg);
        } catch (err) {
            logger.warn({ err }, "Falha ao enviar mensagem WS a um cliente");
        }
    });
}

module.exports = { setWss, broadcast };
