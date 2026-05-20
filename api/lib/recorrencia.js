"use strict";

const MAX_OCORRENCIAS = 200;
const JANELA_MAX_DIAS = 365;

function toDateOnlyString(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(str) {
    const [y, m, d] = String(str).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function diffDias(a, b) {
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDias(d, n) {
    const r = new Date(d.getTime());
    r.setUTCDate(r.getUTCDate() + n);
    return r;
}

function addMeses(d, n) {
    const r = new Date(d.getTime());
    const dia = r.getUTCDate();
    r.setUTCDate(1);
    r.setUTCMonth(r.getUTCMonth() + n);
    const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
    r.setUTCDate(Math.min(dia, ultimo));
    return r;
}

/**
 * Expande uma regra de recorrência em uma lista de datas (YYYY-MM-DD).
 *
 * regra = {
 *   tipo: 'pontual' | 'semanal' | 'mensal',
 *   data_inicio: 'YYYY-MM-DD',
 *   data_fim_recorrencia: 'YYYY-MM-DD' | null,
 *   dias_semana: '0,1,2,3,4,5,6' (domingo=0; só usado em 'semanal'),
 *   intervalo_semanas: número (default 1; só usado em 'semanal')
 * }
 *
 * Limites: máximo 200 ocorrências e janela de 365 dias.
 */
function expandirRecorrencia(regra) {
    const tipo = regra.tipo || "pontual";
    const inicio = parseDateOnly(regra.data_inicio);

    if (tipo === "pontual") {
        return [toDateOnlyString(inicio)];
    }

    if (!regra.data_fim_recorrencia) {
        throw new Error("data_fim_recorrencia é obrigatória para recorrências.");
    }
    const fim = parseDateOnly(regra.data_fim_recorrencia);

    if (fim < inicio) {
        throw new Error("data_fim_recorrencia deve ser >= data_inicio.");
    }
    if (diffDias(inicio, fim) > JANELA_MAX_DIAS) {
        throw new Error(`Janela máxima de recorrência é ${JANELA_MAX_DIAS} dias.`);
    }

    const datas = [];

    if (tipo === "semanal") {
        const diasSemana = String(regra.dias_semana || "")
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => n >= 0 && n <= 6);
        if (diasSemana.length === 0) {
            throw new Error("Informe ao menos um dia da semana para recorrência semanal.");
        }
        const intervalo = Math.max(1, parseInt(regra.intervalo_semanas, 10) || 1);

        // Semana base: a semana (domingo) em que cai data_inicio
        const inicioSemana = addDias(inicio, -inicio.getUTCDay());
        let semanaIdx = 0;
        let cursorSemana = inicioSemana;
        while (cursorSemana <= fim && datas.length < MAX_OCORRENCIAS) {
            if (semanaIdx % intervalo === 0) {
                for (const dow of diasSemana) {
                    const d = addDias(cursorSemana, dow);
                    if (d >= inicio && d <= fim) {
                        datas.push(toDateOnlyString(d));
                        if (datas.length >= MAX_OCORRENCIAS) break;
                    }
                }
            }
            semanaIdx++;
            cursorSemana = addDias(cursorSemana, 7);
        }
        datas.sort();
        return datas;
    }

    if (tipo === "mensal") {
        let cursor = inicio;
        while (cursor <= fim && datas.length < MAX_OCORRENCIAS) {
            datas.push(toDateOnlyString(cursor));
            cursor = addMeses(cursor, 1);
        }
        return datas;
    }

    throw new Error(`Tipo de recorrência inválido: ${tipo}`);
}

/**
 * Dado um conjunto de novas ocorrências (data + horário) e a lista de
 * ocorrências existentes da mesma sala, retorna as datas em conflito.
 *
 * novas = [{ data, hora_inicio, hora_fim, dia_inteiro }]
 * existentes = mesma forma
 */
function detectarConflitos(novas, existentes) {
    const mapaExistentes = new Map();
    for (const ex of existentes) {
        if (!mapaExistentes.has(ex.data)) mapaExistentes.set(ex.data, []);
        mapaExistentes.get(ex.data).push(ex);
    }

    const conflitos = [];
    for (const nova of novas) {
        const noMesmoDia = mapaExistentes.get(nova.data) || [];
        for (const ex of noMesmoDia) {
            if (nova.dia_inteiro || ex.dia_inteiro) {
                conflitos.push({ data: nova.data, comExistente: ex });
                break;
            }
            // Sobreposição de intervalos: A.inicio < B.fim AND A.fim > B.inicio
            if (nova.hora_inicio < ex.hora_fim && nova.hora_fim > ex.hora_inicio) {
                conflitos.push({ data: nova.data, comExistente: ex });
                break;
            }
        }
    }
    return conflitos;
}

module.exports = {
    expandirRecorrencia,
    detectarConflitos,
    MAX_OCORRENCIAS,
    JANELA_MAX_DIAS,
};
