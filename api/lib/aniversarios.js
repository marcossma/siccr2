"use strict";

/**
 * Parabéns de aniversário por e-mail: envio manual (pelo painel) e agendador
 * diário opcional (ligado por configuração). Fire-and-forget.
 */

const pool = require("../config/database.js");
const logger = require("./logger.js");
const email = require("./email.js");
const tpl = require("./email-templates.js");

const TZ = "America/Sao_Paulo";

// "Hoje" no fuso de Brasília (dia/mês para casar aniversários)
function hojeBR() {
    const iso = new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
    const [ano, mes, dia] = iso.split("-").map(Number);
    return { ano, mes, dia, iso };
}

async function getConfig(chave, def = null) {
    const { rows } = await pool.query("SELECT valor FROM configuracoes WHERE chave = $1", [chave]);
    return rows.length ? rows[0].valor : def;
}
async function setConfig(chave, valor) {
    await pool.query(
        `INSERT INTO configuracoes (chave, valor, updatedat) VALUES ($1, $2, NOW())
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updatedat = NOW()`,
        [chave, valor]
    );
}
async function getAuto() {
    return (await getConfig("aniversario_automatico", "false")) === "true";
}
async function setAuto(ativo) {
    await setConfig("aniversario_automatico", ativo ? "true" : "false");
}

async function aniversariantesDeHoje() {
    const { mes, dia } = hojeBR();
    const { rows } = await pool.query(
        `SELECT user_id, nome, email FROM users
         WHERE email IS NOT NULL AND email <> ''
           AND EXTRACT(MONTH FROM data_nascimento AT TIME ZONE 'UTC') = $1
           AND EXTRACT(DAY   FROM data_nascimento AT TIME ZONE 'UTC') = $2`,
        [mes, dia]
    );
    return rows;
}

// Envia parabéns (individualmente) a cada aniversariante de hoje com e-mail.
async function enviarParabensDoDia() {
    const lista = await aniversariantesDeHoje();
    let enviados = 0, falhas = 0;
    for (const a of lista) {
        const t = tpl.aniversarioParabens(a.nome);
        const r = await email.enviarEmail({ to: a.email, subject: t.subject, html: t.html, text: t.text, attachments: tpl.logoInfo().attachments });
        if (r.ok) enviados++; else falhas++;
    }
    await setConfig("aniversario_ultimo_envio", hojeBR().iso);
    logger.info({ total: lista.length, enviados, falhas }, "Parabéns de aniversário processados");
    return { total: lista.length, enviados, falhas };
}

// Agendador: a cada 30 min, se o automático estiver ligado, já passou das ~08:00
// (Brasília) e ainda não enviou hoje, dispara. O guard por data evita duplicar.
function iniciarAgendador() {
    const HORA_MIN_UTC = 11; // ~08:00 em Brasília (UTC-3)
    const checar = async () => {
        try {
            if (!(await getAuto()) || !email.estaConfigurado()) return;
            if (new Date().getUTCHours() < HORA_MIN_UTC) return;
            const hoje = hojeBR().iso;
            if ((await getConfig("aniversario_ultimo_envio", null)) === hoje) return;
            await enviarParabensDoDia();
        } catch (err) {
            logger.error({ err: err.message }, "Falha no agendador de aniversários");
        }
    };
    setInterval(checar, 30 * 60 * 1000);
    setTimeout(checar, 15000); // uma checagem logo após o boot
    logger.info("Agendador de aniversários iniciado");
}

module.exports = { hojeBR, getAuto, setAuto, aniversariantesDeHoje, enviarParabensDoDia, iniciarAgendador };
