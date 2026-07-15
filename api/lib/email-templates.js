"use strict";

/**
 * Layout e templates de e-mail do SICCR (HTML), compartilhados entre
 * comunicados e notificações transacionais. O logo é embutido por CID
 * (cid:siccr-logo) — inclua `logoInfo().attachments` no envio.
 */

const fs = require("fs");
const path = require("path");

// Logo embutido (carregado uma vez)
let _logo = null;
function logoInfo() {
    if (_logo !== null) return _logo;
    try {
        const buf = fs.readFileSync(path.join(__dirname, "../public/img/logo.png"));
        _logo = { attachments: [{ filename: "logo.png", content: buf, cid: "siccr-logo" }], comLogo: true };
    } catch {
        _logo = { attachments: [], comLogo: false };
    }
    return _logo;
}

// Envolve um corpo HTML no template com a identidade do SICCR.
function layout(corpoHtml) {
    const info = logoInfo();
    const header = info.comLogo
        ? `<img src="cid:siccr-logo" alt="SICCR — Centro de Ciências Rurais" style="max-height:52px;max-width:80%">`
        : `<span style="font-size:20px;font-weight:bold;color:#009536">SICCR</span> <span style="color:#555">— Centro de Ciências Rurais</span>`;
    return `<div style="font-family:Verdana,Arial,sans-serif;max-width:640px;margin:auto;color:#222">
        <div style="text-align:center;padding:16px;background:#fff;border:1px solid #e0e0e0;border-bottom:3px solid #009536;border-radius:8px 8px 0 0">${header}</div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;line-height:1.5">${corpoHtml}</div>
        <p style="color:#999;font-size:11px;margin-top:12px;text-align:center">Mensagem enviada pelo SICCR — Centro de Ciências Rurais.</p>
    </div>`;
}

// ── Formatadores (espelham lib/whatsapp.js) ──────────────────────────
function formatarDataBr(valor) {
    if (!valor) return "";
    const s = typeof valor === "string" ? valor.slice(0, 10) : new Date(valor).toISOString().slice(0, 10);
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}
function descreverHorario(ag) {
    if (ag.dia_inteiro) return "Dia inteiro";
    return `${String(ag.hora_inicio || "").slice(0, 5)} às ${String(ag.hora_fim || "").slice(0, 5)}`;
}
function descreverPeriodo(ag) {
    if (ag.tipo_recorrencia === "pontual") return formatarDataBr(ag.data_inicio);
    const tipo = ag.tipo_recorrencia === "semanal" ? "semanal" : "mensal";
    return `${tipo}, de ${formatarDataBr(ag.data_inicio)} até ${formatarDataBr(ag.data_fim_recorrencia)}`;
}
function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
}
function linhaDetalhe(rotulo, valor) {
    return `<tr><td style="padding:3px 10px 3px 0;color:#666;white-space:nowrap">${rotulo}</td><td style="padding:3px 0"><strong>${escapeHtml(valor)}</strong></td></tr>`;
}

// ── Templates de agendamento ─────────────────────────────────────────
function agendamentoAprovado(ag) {
    const detalhes = `<table style="border-collapse:collapse;margin:12px 0">
        ${linhaDetalhe("Sala:", ag.sala_nome)}
        ${linhaDetalhe("Motivo:", ag.motivo)}
        ${linhaDetalhe("Data:", descreverPeriodo(ag))}
        ${linhaDetalhe("Horário:", descreverHorario(ag))}
    </table>`;
    const corpo = `<p>Olá, <strong>${escapeHtml(primeiroNome(ag.solicitante_nome))}</strong>!</p>
        <p>Sua solicitação de agendamento de sala foi <strong style="color:#009536">APROVADA</strong> ✅</p>
        ${detalhes}
        <p style="color:#555">Decisão de ${escapeHtml(ag.aprovador_nome || "direção")}.</p>`;
    const text = `SICCR — Agendamento aprovado\n\nSua solicitação foi aprovada.\n\nSala: ${ag.sala_nome}\nMotivo: ${ag.motivo}\nData: ${descreverPeriodo(ag)}\nHorário: ${descreverHorario(ag)}\n\nDecisão de ${ag.aprovador_nome || "direção"}.`;
    return { subject: `SICCR — Agendamento aprovado: ${ag.sala_nome}`, html: layout(corpo), text };
}

function agendamentoRejeitado(ag) {
    const detalhes = `<table style="border-collapse:collapse;margin:12px 0">
        ${linhaDetalhe("Sala:", ag.sala_nome)}
        ${linhaDetalhe("Motivo:", ag.motivo)}
        ${linhaDetalhe("Data:", descreverPeriodo(ag))}
        ${linhaDetalhe("Horário:", descreverHorario(ag))}
    </table>`;
    const corpo = `<p>Olá, <strong>${escapeHtml(primeiroNome(ag.solicitante_nome))}</strong>!</p>
        <p>Sua solicitação de agendamento de sala <strong style="color:#c0392b">não foi aprovada</strong>.</p>
        ${detalhes}
        <p style="background:#fff3f3;border:1px solid #f0c0c0;border-radius:6px;padding:10px"><strong>Motivo da rejeição:</strong><br>${escapeHtml(ag.motivo_rejeicao)}</p>
        <p style="color:#555">Decisão de ${escapeHtml(ag.aprovador_nome || "direção")}.</p>`;
    const text = `SICCR — Agendamento não aprovado\n\nSua solicitação foi recusada.\n\nSala: ${ag.sala_nome}\nMotivo: ${ag.motivo}\nData: ${descreverPeriodo(ag)}\nHorário: ${descreverHorario(ag)}\n\nMotivo da rejeição: ${ag.motivo_rejeicao}\n\nDecisão de ${ag.aprovador_nome || "direção"}.`;
    return { subject: `SICCR — Agendamento não aprovado: ${ag.sala_nome}`, html: layout(corpo), text };
}

// ── Template de aniversário ──────────────────────────────────────────
function aniversarioParabens(nome) {
    const primeiro = primeiroNome(nome);
    const corpo = `<div style="text-align:center">
        <div style="font-size:40px">🎉🎂</div>
        <h2 style="color:#009536;margin:8px 0">Feliz aniversário, ${escapeHtml(primeiro)}!</h2>
        <p>O Centro de Ciências Rurais deseja a você um dia especial e um novo ano repleto de saúde, alegria e realizações.</p>
        <p style="color:#555">Com carinho,<br>Direção do CCR</p>
    </div>`;
    return {
        subject: `Feliz aniversário, ${primeiro}! 🎉`,
        html: layout(corpo),
        text: `Feliz aniversário, ${primeiro}!\n\nO Centro de Ciências Rurais deseja a você um dia especial e um novo ano repleto de saúde, alegria e realizações.\n\nCom carinho,\nDireção do CCR`,
    };
}

module.exports = { layout, logoInfo, agendamentoAprovado, agendamentoRejeitado, aniversarioParabens };
