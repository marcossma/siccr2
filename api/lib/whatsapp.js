"use strict";

/**
 * Integração com PoolZap (https://poolzap-api.infai.com.br).
 * Envio é fire-and-forget: erros são logados mas nunca propagados,
 * porque a notificação é cortesia — não pode bloquear uma aprovação.
 */

const logger = require("./logger.js");

const API_URL = (process.env.WHATSAPP_API_URL || "https://poolzap-api.infai.com.br").replace(/\/$/, "");
const API_KEY = process.env.WHATSAPP_API_KEY;

/**
 * Normaliza o número para o formato esperado pelo PoolZap:
 * DDI + DDD + número, apenas dígitos (ex: "5555999998888").
 * Aceita entradas como "(55) 99999-8888", "+55 55 99999-8888", "55999998888".
 * Retorna null se o número for inválido ou vazio.
 */
function normalizarNumero(raw) {
    if (!raw) return null;
    const digitos = String(raw).replace(/\D/g, "");
    if (!digitos) return null;
    // 12 ou 13 dígitos começando com 55 → já tem DDI
    if (digitos.length >= 12 && digitos.length <= 13 && digitos.startsWith("55")) {
        return digitos;
    }
    // 10 ou 11 dígitos → DDD + número sem DDI; assume Brasil
    if (digitos.length >= 10 && digitos.length <= 11) {
        return "55" + digitos;
    }
    return null;
}

/** Mostra apenas os 4 últimos dígitos no log */
function mascarar(numero) {
    if (!numero) return "—";
    return numero.length > 4 ? `***${numero.slice(-4)}` : "***";
}

/**
 * Envia uma mensagem de texto via PoolZap.
 * @returns {Promise<{ok: boolean, motivo?: string, messageId?: string}>}
 *          A promise nunca rejeita — falhas viram { ok: false, motivo: ... }.
 */
async function enviarMensagem(numeroRaw, mensagem) {
    if (!API_KEY) {
        logger.debug("WhatsApp desabilitado (WHATSAPP_API_KEY ausente)");
        return { ok: false, motivo: "sem_chave" };
    }

    const numero = normalizarNumero(numeroRaw);
    if (!numero) {
        logger.warn({ numeroRawTipo: typeof numeroRaw }, "Número WhatsApp inválido — envio ignorado");
        return { ok: false, motivo: "numero_invalido" };
    }

    try {
        const resp = await fetch(`${API_URL}/messages/send`, {
            method: "POST",
            headers: {
                "x-api-key": API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ to: numero, message: mensagem }),
        });
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            logger.warn(
                { status: resp.status, error: data.error, numero: mascarar(numero) },
                "WhatsApp não enviado (PoolZap retornou erro)"
            );
            return { ok: false, motivo: data.error || `http_${resp.status}` };
        }

        logger.info(
            { messageId: data.messageId, numero: mascarar(numero) },
            "WhatsApp enfileirado"
        );
        return { ok: true, messageId: data.messageId };
    } catch (err) {
        logger.warn(
            { err: err.message, numero: mascarar(numero) },
            "Falha de rede ao chamar PoolZap"
        );
        return { ok: false, motivo: "rede" };
    }
}

// ──────────────────────────────────────────────────────────
// Templates de mensagem para agendamentos
// ──────────────────────────────────────────────────────────

function formatarDataBr(valor) {
    if (!valor) return "";
    const s = typeof valor === "string" ? valor.slice(0, 10) : new Date(valor).toISOString().slice(0, 10);
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}

function descreverHorario(ag) {
    if (ag.dia_inteiro) return "Dia inteiro";
    const hi = String(ag.hora_inicio || "").slice(0, 5);
    const hf = String(ag.hora_fim || "").slice(0, 5);
    return `${hi} às ${hf}`;
}

function descreverPeriodo(ag) {
    if (ag.tipo_recorrencia === "pontual") {
        return formatarDataBr(ag.data_inicio);
    }
    const tipo = ag.tipo_recorrencia === "semanal" ? "semanal" : "mensal";
    return `${tipo}, de ${formatarDataBr(ag.data_inicio)} até ${formatarDataBr(ag.data_fim_recorrencia)}`;
}

function mensagemAprovacao(ag) {
    return (
        `*SICCR — Agendamento aprovado* ✅\n\n` +
        `Sua solicitação foi aprovada.\n\n` +
        `*Sala:* ${ag.sala_nome}\n` +
        `*Motivo:* ${ag.motivo}\n` +
        `*Data:* ${descreverPeriodo(ag)}\n` +
        `*Horário:* ${descreverHorario(ag)}\n\n` +
        `_Aprovada por ${ag.aprovador_nome || "direção"}._`
    );
}

function mensagemRejeicao(ag) {
    return (
        `*SICCR — Agendamento não aprovado* ❌\n\n` +
        `Sua solicitação foi recusada.\n\n` +
        `*Sala:* ${ag.sala_nome}\n` +
        `*Motivo:* ${ag.motivo}\n` +
        `*Data:* ${descreverPeriodo(ag)}\n` +
        `*Horário:* ${descreverHorario(ag)}\n\n` +
        `*Motivo da rejeição:* ${ag.motivo_rejeicao}\n\n` +
        `_Decidida por ${ag.aprovador_nome || "direção"}._`
    );
}

module.exports = {
    enviarMensagem,
    normalizarNumero,
    mensagemAprovacao,
    mensagemRejeicao,
};
