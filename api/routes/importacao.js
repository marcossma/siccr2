const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { padronizarCodigo } = require("../lib/codigo.js");

const router = express.Router();

const MAX_LINHAS = 20000; // a grade de disciplinas tem milhares de linhas

// Normaliza texto p/ comparação: maiúsculas, sem acento, espaços colapsados
function normalizar(s) {
    return String(s || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();
}

// "dd/mm/yyyy" → "yyyy-mm-dd" (ou null se inválido)
function parseDataBr(v) {
    if (!v) return null;
    const s = String(v).trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const dia = Number(dd), mes = Number(mm);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${yyyy}-${mm}-${dd}`;
}

// Lê um campo da linha tolerando espaços no cabeçalho
function campo(linha, nome) {
    if (linha[nome] !== undefined) return linha[nome];
    const chave = Object.keys(linha).find((k) => k.trim() === nome);
    return chave ? linha[chave] : undefined;
}

// "03.36.00.00.0.0" → "03.36" (remove segmentos finais só de zeros,
// pra bater com o formato curto já usado em subunidades.subunidade_codigo)
function normalizarCodigo(cod) {
    const partes = String(cod || "").trim().split(".");
    while (partes.length > 1 && /^0+$/.test(partes[partes.length - 1])) partes.pop();
    return partes.join(".");
}

// Processa as linhas cruas → linhas mapeadas + resumo, usando os dados de apoio
function processar(linhas, subunidadesPorNome, siapesExistentes) {
    const resultado = [];
    const deptosNaoEncontrados = new Set();
    let novos = 0, atualizar = 0, erros = 0;

    for (const linha of linhas) {
        const siapeRaw = campo(linha, "MATR_EXTERNA");
        const nome = String(campo(linha, "NOME_FUNCIONARIO") || "").trim();
        const nascimento = parseDataBr(campo(linha, "DT_NASCIMENTO"));
        const deptoDescr = String(campo(linha, "DESCR_LOT_OFICIAL") || "").trim();
        const cargo = String(campo(linha, "CARGO") || "").trim() || null;
        const tipoRaw = String(campo(linha, "TIPO_SERVIDOR") || "").trim().toUpperCase();
        const tipo_servidor = tipoRaw === "D" || tipoRaw === "T" ? tipoRaw : null;

        const siape = String(siapeRaw || "").trim();
        const item = {
            siape, nome, nascimento, cargo, tipo_servidor,
            departamento: deptoDescr, subunidade_id: null, subunidade_nome: null,
            status: "novo", erro: null,
        };

        // Validação mínima
        if (!/^\d+$/.test(siape)) {
            item.status = "erro"; item.erro = "SIAPE (MATR_EXTERNA) ausente ou não numérico.";
            erros++; resultado.push(item); continue;
        }
        if (!nome) {
            item.status = "erro"; item.erro = "Nome ausente.";
            erros++; resultado.push(item); continue;
        }

        // Mapeamento do departamento → subunidade (por nome normalizado)
        if (deptoDescr) {
            const match = subunidadesPorNome.get(normalizar(deptoDescr));
            if (match) {
                item.subunidade_id = match.subunidade_id;
                item.subunidade_nome = match.subunidade_nome;
            } else {
                deptosNaoEncontrados.add(deptoDescr);
            }
        }

        item.status = siapesExistentes.has(siape) ? "atualizar" : "novo";
        if (item.status === "novo") novos++; else atualizar++;
        resultado.push(item);
    }

    return {
        linhas: resultado,
        resumo: {
            total: linhas.length,
            novos, atualizar, erros,
            departamentos_nao_encontrados: [...deptosNaoEncontrados].sort(),
        },
    };
}

// Carrega dados de apoio (subunidades + siapes já cadastrados)
async function carregarApoio(client = pool) {
    const subs = await client.query("SELECT subunidade_id, subunidade_nome FROM subunidades");
    const subunidadesPorNome = new Map();
    for (const s of subs.rows) subunidadesPorNome.set(normalizar(s.subunidade_nome), s);

    const users = await client.query("SELECT siape FROM users WHERE siape IS NOT NULL");
    const siapesExistentes = new Set(users.rows.map((r) => String(r.siape).trim()));

    return { subunidadesPorNome, siapesExistentes };
}

function validarEntrada(req, res) {
    const linhas = req.body?.linhas;
    if (!Array.isArray(linhas) || linhas.length === 0) {
        res.status(400).json({ status: "error", message: "Envie um array 'linhas' com ao menos uma linha.", data: null });
        return null;
    }
    if (linhas.length > MAX_LINHAS) {
        res.status(400).json({ status: "error", message: `Máximo de ${MAX_LINHAS} linhas por importação.`, data: null });
        return null;
    }
    return linhas;
}

// ───────────────────────────────────────────────────────────────
// POST /servidores/preview — processa sem gravar (dry-run)
// ───────────────────────────────────────────────────────────────
router.post("/servidores/preview", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;
    try {
        const { subunidadesPorNome, siapesExistentes } = await carregarApoio();
        const resultado = processar(linhas, subunidadesPorNome, siapesExistentes);
        return res.status(200).json({ status: "success", message: "", data: resultado });
    } catch (error) {
        logger.error({ err: error }, "Erro no preview de importação");
        return res.status(500).json({ status: "error", message: "Erro ao processar arquivo.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// POST /servidores — grava (insert novos + upsert existentes por siape)
//   Novos recebem senha inicial = SIAPE (bcrypt) e permissao 'servidor'.
//   Existentes: atualiza nome/nascimento/depto/cargo/tipo; NÃO mexe em
//   senha/email/permissao.
// ───────────────────────────────────────────────────────────────
router.post("/servidores", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;

    try {
        const apoio = await carregarApoio();
        const { linhas: processadas } = processar(linhas, apoio.subunidadesPorNome, apoio.siapesExistentes);

        const validas = processadas.filter((l) => l.status !== "erro");
        const novos = validas.filter((l) => l.status === "novo");

        // Hash das senhas dos novos em paralelo (antes da transação, p/ não segurar conexão)
        const hashPorSiape = new Map();
        await Promise.all(novos.map(async (l) => {
            hashPorSiape.set(l.siape, await bcrypt.hash(l.siape, 10));
        }));

        const client = await pool.connect();
        let inseridos = 0, atualizados = 0;
        try {
            await client.query("BEGIN");
            for (const l of validas) {
                if (l.status === "novo") {
                    await client.query(
                        `INSERT INTO users (nome, siape, senha, data_nascimento, subunidade_id, cargo, tipo_servidor, permissao)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'servidor')`,
                        [l.nome, l.siape, hashPorSiape.get(l.siape), l.nascimento, l.subunidade_id, l.cargo, l.tipo_servidor]
                    );
                    inseridos++;
                } else {
                    // Modo aditivo: só preenche campos vazios; nunca sobrescreve
                    // valor já existente. Credenciais (senha/email/whatsapp/permissao)
                    // não entram no SET → sempre preservadas.
                    await client.query(
                        `UPDATE users SET
                            nome            = COALESCE(NULLIF(nome, ''), $1),
                            data_nascimento = COALESCE(data_nascimento, $2),
                            subunidade_id   = COALESCE(subunidade_id, $3),
                            cargo           = COALESCE(NULLIF(cargo, ''), $4),
                            tipo_servidor   = COALESCE(NULLIF(tipo_servidor, ''), $5)
                         WHERE siape = $6`,
                        [l.nome, l.nascimento, l.subunidade_id, l.cargo, l.tipo_servidor, l.siape]
                    );
                    atualizados++;
                }
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        return res.status(200).json({
            status: "success",
            message: `Importação concluída: ${inseridos} novo(s), ${atualizados} atualizado(s).`,
            data: { inseridos, atualizados, ignorados: processadas.length - validas.length },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao importar servidores");
        return res.status(500).json({ status: "error", message: "Erro ao gravar importação.", data: null });
    }
});

// ═══════════════════════════════════════════════════════════════
// SUBUNIDADES — extraídas de DESCR_LOT_OFICIAL / COD_LOT_OFICIAL
// (mesmo arquivo de servidores). Só CCR (código 03.xx); ignora o
// próprio centro (03.00) e lotações de outros centros.
// ═══════════════════════════════════════════════════════════════

// Carrega subunidades existentes (por nome e por código) + unidade padrão (CCR)
async function carregarApoioSubunidades(client = pool) {
    const subs = await client.query("SELECT subunidade_id, subunidade_nome, subunidade_codigo FROM subunidades");
    const porNome = new Map();
    const porCodigo = new Map();
    for (const s of subs.rows) {
        porNome.set(normalizar(s.subunidade_nome), s);
        const cod = normalizarCodigo(s.subunidade_codigo);
        if (cod) porCodigo.set(cod, s);
    }

    const uni = await client.query("SELECT unidade_id FROM unidades ORDER BY unidade_id LIMIT 1");
    const unidadePadrao = uni.rows[0] ? uni.rows[0].unidade_id : null;

    return { porNome, porCodigo, unidadePadrao };
}

// Extrai subunidades distintas (CCR) das linhas + classifica novo/atualizar.
// Dedup contra existentes por código OU nome normalizado.
function processarSubunidades(linhas, porNome, porCodigo) {
    const distintas = new Map(); // chave: código (fallback nome)
    let ignoradas = 0;

    for (const linha of linhas) {
        const nome = String(campo(linha, "DESCR_LOT_OFICIAL") || "").trim();
        // codigoCurto (sem zeros à direita) é usado só para dedup/comparação
        const codigoCurto = normalizarCodigo(campo(linha, "COD_LOT_OFICIAL"));
        if (!nome) { continue; }
        // Só CCR: código começa com "03."; ignora o próprio centro (03 / 03.00)
        if (!codigoCurto.startsWith("03.") || codigoCurto === "03.00") { ignoradas++; continue; }
        if (normalizar(nome) === "CENTRO DE CIENCIAS RURAIS") { ignoradas++; continue; }

        const chave = codigoCurto || normalizar(nome);
        if (!distintas.has(chave)) distintas.set(chave, { nome, codigoCurto });
    }

    let novos = 0, atualizar = 0;
    const resultado = [...distintas.values()].map((s) => {
        const existente = porCodigo.get(s.codigoCurto) || porNome.get(normalizar(s.nome));
        const status = existente ? "atualizar" : "novo";
        if (existente) atualizar++; else novos++;
        return {
            // Armazena/exibe no formato completo XX.XX.XX.XX.X.X
            nome: s.nome, codigo: padronizarCodigo(s.codigoCurto), status,
            subunidade_id_existente: existente ? existente.subunidade_id : null,
        };
    });
    resultado.sort((a, b) => a.nome.localeCompare(b.nome));

    return { linhas: resultado, resumo: { total: resultado.length, novos, atualizar, erros: 0, ignoradas } };
}

// POST /subunidades/preview
router.post("/subunidades/preview", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;
    try {
        const { porNome, porCodigo } = await carregarApoioSubunidades();
        return res.status(200).json({ status: "success", message: "", data: processarSubunidades(linhas, porNome, porCodigo) });
    } catch (error) {
        logger.error({ err: error }, "Erro no preview de subunidades");
        return res.status(500).json({ status: "error", message: "Erro ao processar arquivo.", data: null });
    }
});

// POST /subunidades — insere novas / atualiza código das existentes
router.post("/subunidades", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;
    try {
        const { porNome, porCodigo, unidadePadrao } = await carregarApoioSubunidades();
        if (!unidadePadrao) {
            return res.status(400).json({ status: "error", message: "Nenhuma unidade cadastrada para vincular as subunidades.", data: null });
        }
        const { linhas: processadas } = processarSubunidades(linhas, porNome, porCodigo);

        const client = await pool.connect();
        let inseridos = 0, atualizados = 0;
        try {
            await client.query("BEGIN");
            for (const s of processadas) {
                if (s.status === "novo") {
                    await client.query(
                        `INSERT INTO subunidades (subunidade_nome, subunidade_codigo, unidade_id, is_direcao_centro)
                         VALUES ($1, $2, $3, FALSE)`,
                        [s.nome, s.codigo, unidadePadrao]
                    );
                    inseridos++;
                } else {
                    // Modo aditivo: só preenche o código quando está vazio;
                    // se já existe um código, mantém intacto. Não mexe em nome/sigla/etc.
                    await client.query(
                        `UPDATE subunidades SET subunidade_codigo = COALESCE(NULLIF(subunidade_codigo, ''), $1)
                         WHERE subunidade_id = $2`,
                        [s.codigo, s.subunidade_id_existente]
                    );
                    atualizados++;
                }
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        return res.status(200).json({
            status: "success",
            message: `Importação concluída: ${inseridos} nova(s), ${atualizados} atualizada(s).`,
            data: { inseridos, atualizados },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao importar subunidades");
        return res.status(500).json({ status: "error", message: "Erro ao gravar importação.", data: null });
    }
});

// ═══════════════════════════════════════════════════════════════
// DISCIPLINAS / GRADE HORÁRIA (planilha do SIA)
// Cada linha = (turma × slot de horário × professor). Agrupamos por
// ID_TURMA para reconstruir turmas, horários (co-docência) e professores.
// Importa só linhas com dia+horário (ignora orientação/TCC/estágio/EAD).
// ═══════════════════════════════════════════════════════════════

function parseHora(v) {
    const s = String(v || "").trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return `${m[1].padStart(2, "0")}:${m[2]}:00`;
}

// CSV usa 1=domingo..7=sábado; nosso banco usa 0=dom..6=sáb
function parseDiaSemana(v) {
    const n = parseInt(String(v || "").trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 7) return null;
    return n - 1;
}

function parseEncargo(v) {
    const s = String(v === null || v === undefined ? "" : v).replace(",", ".").trim();
    if (s === "") return null;
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
}

function normalizarTipoAula(v) {
    const t = normalizar(v);
    if (t.startsWith("TEORICA")) return t.includes("EXT") ? "teorica_ext" : "teorica";
    if (t.startsWith("PRATICA")) return t.includes("EXT") ? "pratica_ext" : "pratica";
    return null;
}

// Nome do período letivo a partir de ANO + PERIODO ("1. Semestre" → "2026.1")
function nomePeriodo(ano, periodo) {
    const a = String(ano || "").trim();
    const m = String(periodo || "").match(/(\d)/);
    if (!a || !m) return null;
    return `${a}.${m[1]}`;
}

// Analisa as linhas cruas e reconstrói as entidades da grade
function analisarDisciplinas(linhas) {
    const periodos = new Map();      // nome -> { nome, data_inicio, data_fim }
    const cursos = new Map();        // cod_curso -> { cod_curso, nome }
    const disciplinas = new Map();   // codigo(norm) -> { codigo, nome, carga_horaria }
    const professores = new Map();   // siape -> { siape, nome }
    const turmas = new Map();        // id_turma_externo -> {...}
    let comHorario = 0, semHorario = 0;

    for (const linha of linhas) {
        const dia = parseDiaSemana(campo(linha, "DIA_SEMANA_ITEM"));
        const horaIni = parseHora(campo(linha, "HR_INICIO"));
        // Só aulas com dia + horário (descarta orientação/TCC/dissertação/estágio/EAD)
        if (dia === null || !horaIni) { semHorario++; continue; }
        comHorario++;

        const idTurma = parseInt(String(campo(linha, "ID_TURMA") || "").trim(), 10);
        if (Number.isNaN(idTurma)) continue;

        const codCurso = String(campo(linha, "COD_CURSO") || "").trim();
        const nomeCurso = String(campo(linha, "UNIDADE_CURSO") || "").trim();
        const codDisc = String(campo(linha, "COD_DISCIPLINA") || "").trim();
        const nomeDisc = String(campo(linha, "NOME_DISCIPLINA") || "").trim();
        const ch = parseCargaHorariaLocal(campo(linha, "CH_DISCIPLINA"));
        const periodoNome = nomePeriodo(campo(linha, "ANO"), campo(linha, "PERIODO"));
        const dtIni = parseDataBr(campo(linha, "DT_INICIO_PERIODO"));
        const dtFim = parseDataBr(campo(linha, "DT_FIM_PERIODO"));
        const siape = String(campo(linha, "MATR_EXTERNA") || "").trim();
        const nomeDoc = String(campo(linha, "NOME_DOCENTE") || "").trim();

        // Período (datas = min início / max fim entre as linhas)
        if (periodoNome) {
            const p = periodos.get(periodoNome) || { nome: periodoNome, data_inicio: dtIni, data_fim: dtFim };
            if (dtIni && (!p.data_inicio || dtIni < p.data_inicio)) p.data_inicio = dtIni;
            if (dtFim && (!p.data_fim || dtFim > p.data_fim)) p.data_fim = dtFim;
            periodos.set(periodoNome, p);
        }
        if (codCurso && !cursos.has(codCurso)) cursos.set(codCurso, { cod_curso: codCurso, nome: nomeCurso });
        const dkey = normalizar(codDisc);
        if (dkey && !disciplinas.has(dkey)) disciplinas.set(dkey, { codigo: codDisc, nome: nomeDisc, carga_horaria: ch });
        if (siape && /^\d+$/.test(siape) && !professores.has(siape)) professores.set(siape, { siape, nome: nomeDoc });

        // Turma
        let t = turmas.get(idTurma);
        if (!t) {
            t = {
                id_turma_externo: idTurma,
                cod_curso: codCurso, codigoDisc: dkey, periodoNome,
                nome_turma: String(campo(linha, "COD_TURMA") || "").trim().slice(0, 30),
                vagas: parseCargaHorariaLocal(campo(linha, "VAGAS_OFERECIDAS")),
                professores: new Map(), // siape -> encargo
                horarios: new Map(),
            };
            turmas.set(idTurma, t);
        }

        // Professor da turma (co-docência) + encargo (guarda o maior)
        if (siape && /^\d+$/.test(siape)) {
            const enc = parseEncargo(campo(linha, "ENCARGO_DOCENT"));
            const atual = t.professores.get(siape);
            if (atual === undefined || (enc !== null && (atual === null || enc > atual))) {
                t.professores.set(siape, enc);
            }
        }

        // Horário (dedup por dia+hora+tipo+datas cruas da linha)
        const horaFim = parseHora(campo(linha, "HR_FIM"));
        const tipo = normalizarTipoAula(campo(linha, "TIPO_AULA"));
        const hkey = [dia, horaIni, horaFim, tipo || "", dtIni || "", dtFim || ""].join("|");
        if (!t.horarios.has(hkey)) {
            t.horarios.set(hkey, { dia_semana: dia, hora_inicio: horaIni, hora_fim: horaFim, tipo_aula: tipo, data_inicio: dtIni, data_fim: dtFim });
        }
    }

    // Normaliza blocos: horário que cobre o período inteiro → datas nulas
    // (só os modulares guardam sub-range). Feito após o loop, com o período completo.
    for (const t of turmas.values()) {
        const p = periodos.get(t.periodoNome);
        if (!p) continue;
        for (const h of t.horarios.values()) {
            if (h.data_inicio === p.data_inicio && h.data_fim === p.data_fim) {
                h.data_inicio = null;
                h.data_fim = null;
            }
        }
    }

    return { periodos, cursos, disciplinas, professores, turmas, comHorario, semHorario };
}

function parseCargaHorariaLocal(v) {
    if (v === undefined || v === null || String(v).trim() === "") return null;
    const n = parseInt(String(v).trim(), 10);
    return Number.isNaN(n) || n < 0 ? null : n;
}

async function carregarApoioDisciplinas(client = pool) {
    const [per, cur, dis, usr, tur] = await Promise.all([
        client.query("SELECT id_periodo, nome FROM periodos_letivos"),
        client.query("SELECT id_curso, cod_curso FROM cursos"),
        client.query("SELECT id_disciplina, codigo FROM disciplinas"),
        client.query("SELECT user_id, siape FROM users WHERE siape IS NOT NULL"),
        client.query("SELECT id_turma, id_turma_externo FROM turmas WHERE id_turma_externo IS NOT NULL"),
    ]);
    return {
        periodosPorNome: new Map(per.rows.map((r) => [r.nome, r.id_periodo])),
        cursosPorCod: new Map(cur.rows.map((r) => [String(r.cod_curso), r.id_curso])),
        disciplinasPorCodigo: new Map(dis.rows.filter((r) => r.codigo).map((r) => [normalizar(r.codigo), r.id_disciplina])),
        usersPorSiape: new Map(usr.rows.map((r) => [String(r.siape).trim(), r.user_id])),
        turmasPorExterno: new Map(tur.rows.map((r) => [r.id_turma_externo, r.id_turma])),
    };
}

// POST /disciplinas/preview — dry-run com agregados
router.post("/disciplinas/preview", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;
    try {
        const a = analisarDisciplinas(linhas);
        const apoio = await carregarApoioDisciplinas();

        const professoresACriar = [...a.professores.values()]
            .filter((p) => !apoio.usersPorSiape.has(p.siape));
        const cursosNovos = [...a.cursos.keys()].filter((c) => !apoio.cursosPorCod.has(String(c))).length;
        const discNovas = [...a.disciplinas.keys()].filter((c) => !apoio.disciplinasPorCodigo.has(c)).length;
        const turmasNovas = [...a.turmas.keys()].filter((id) => !apoio.turmasPorExterno.has(id)).length;
        let totalHorarios = 0;
        for (const t of a.turmas.values()) totalHorarios += t.horarios.size;

        // Amostra p/ conferência
        const amostra = [...a.turmas.values()].slice(0, 15).map((t) => ({
            id_turma_externo: t.id_turma_externo,
            curso: a.cursos.get(t.cod_curso)?.nome || t.cod_curso,
            disciplina: a.disciplinas.get(t.codigoDisc)?.nome || t.codigoDisc,
            turma: t.nome_turma,
            horarios: t.horarios.size,
            professores: t.professores.size,
        }));

        return res.status(200).json({
            status: "success", message: "",
            data: {
                resumo: {
                    linhas_total: linhas.length,
                    linhas_aula: a.comHorario,
                    linhas_ignoradas: a.semHorario,
                    periodos: a.periodos.size,
                    cursos: a.cursos.size, cursos_novos: cursosNovos,
                    disciplinas: a.disciplinas.size, disciplinas_novas: discNovas,
                    turmas: a.turmas.size, turmas_novas: turmasNovas,
                    horarios: totalHorarios,
                    professores: a.professores.size,
                    professores_a_criar: professoresACriar.length,
                },
                periodos: [...a.periodos.values()],
                professores_a_criar: professoresACriar.slice(0, 100),
                amostra,
            },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro no preview de disciplinas");
        return res.status(500).json({ status: "error", message: "Erro ao processar arquivo.", data: null });
    }
});

// POST /disciplinas — grava a grade (idempotente por id_turma_externo)
router.post("/disciplinas", async (req, res) => {
    const linhas = validarEntrada(req, res);
    if (!linhas) return;
    try {
        const a = analisarDisciplinas(linhas);
        const apoio = await carregarApoioDisciplinas();

        // Hash das senhas dos professores novos (senha inicial = SIAPE), em paralelo
        const novos = [...a.professores.values()].filter((p) => !apoio.usersPorSiape.has(p.siape));
        const hashPorSiape = new Map();
        await Promise.all(novos.map(async (p) => {
            hashPorSiape.set(p.siape, await bcrypt.hash(p.siape, 10));
        }));

        const client = await pool.connect();
        const contadores = { periodos: 0, cursos: 0, disciplinas: 0, professores_criados: 0, turmas: 0, horarios: 0, vinculos: 0 };
        try {
            await client.query("BEGIN");

            // 1) Períodos (upsert por nome)
            const periodoId = new Map();
            for (const p of a.periodos.values()) {
                const r = await client.query(
                    `INSERT INTO periodos_letivos (nome, data_inicio, data_fim, ativo)
                     VALUES ($1, $2, $3, FALSE)
                     ON CONFLICT (nome) DO UPDATE SET
                       data_inicio = COALESCE(periodos_letivos.data_inicio, EXCLUDED.data_inicio),
                       data_fim    = COALESCE(periodos_letivos.data_fim, EXCLUDED.data_fim)
                     RETURNING id_periodo`,
                    [p.nome, p.data_inicio, p.data_fim]
                );
                periodoId.set(p.nome, r.rows[0].id_periodo);
                contadores.periodos++;
            }

            // 2) Cursos (upsert por cod_curso)
            const cursoId = new Map();
            for (const c of a.cursos.values()) {
                const r = await client.query(
                    `INSERT INTO cursos (cod_curso, nome) VALUES ($1, $2)
                     ON CONFLICT (cod_curso) DO UPDATE SET nome = EXCLUDED.nome
                     RETURNING id_curso`,
                    [c.cod_curso, c.nome]
                );
                cursoId.set(c.cod_curso, r.rows[0].id_curso);
                contadores.cursos++;
            }

            // 3) Disciplinas (upsert por código; nome/carga só preenchem se vazios)
            const discId = new Map();
            for (const [dkey, d] of a.disciplinas) {
                let id = apoio.disciplinasPorCodigo.get(dkey);
                if (id) {
                    await client.query(
                        `UPDATE disciplinas SET
                           nome = COALESCE(NULLIF(nome, ''), $1),
                           carga_horaria = COALESCE(carga_horaria, $2)
                         WHERE id_disciplina = $3`,
                        [d.nome, d.carga_horaria, id]
                    );
                } else {
                    const r = await client.query(
                        `INSERT INTO disciplinas (codigo, nome, carga_horaria) VALUES ($1, $2, $3) RETURNING id_disciplina`,
                        [d.codigo, d.nome, d.carga_horaria]
                    );
                    id = r.rows[0].id_disciplina;
                }
                discId.set(dkey, id);
                contadores.disciplinas++;
            }

            // 4) Professores (por SIAPE; cria mínimo se faltar)
            const userIdPorSiape = new Map(apoio.usersPorSiape);
            for (const p of a.professores.values()) {
                if (userIdPorSiape.has(p.siape)) continue;
                const r = await client.query(
                    `INSERT INTO users (nome, siape, senha, permissao, tipo_servidor)
                     VALUES ($1, $2, $3, 'servidor', 'D') RETURNING user_id`,
                    [p.nome || `Docente ${p.siape}`, p.siape, hashPorSiape.get(p.siape)]
                );
                userIdPorSiape.set(p.siape, r.rows[0].user_id);
                contadores.professores_criados++;
            }

            // 5) Turmas (upsert por id_turma_externo) + 6) professores e horários
            for (const t of a.turmas.values()) {
                const cId = cursoId.get(t.cod_curso) || null;
                const dId = discId.get(t.codigoDisc) || null;
                const pId = periodoId.get(t.periodoNome) || null;
                if (!dId || !pId) continue; // sem disciplina/período não há turma válida
                const principal = [...t.professores.keys()].map((s) => userIdPorSiape.get(s)).find(Boolean) || null;

                const r = await client.query(
                    `INSERT INTO turmas (id_turma_externo, curso_id, disciplina_id, periodo_letivo_id, nome_turma, vagas, professor_user_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (id_turma_externo) DO UPDATE SET
                       curso_id = EXCLUDED.curso_id, disciplina_id = EXCLUDED.disciplina_id,
                       periodo_letivo_id = EXCLUDED.periodo_letivo_id, nome_turma = EXCLUDED.nome_turma,
                       vagas = EXCLUDED.vagas,
                       professor_user_id = COALESCE(turmas.professor_user_id, EXCLUDED.professor_user_id)
                     RETURNING id_turma`,
                    [t.id_turma_externo, cId, dId, pId, t.nome_turma || "-", t.vagas, principal]
                );
                const turmaId = r.rows[0].id_turma;
                contadores.turmas++;

                // Co-docência (aditivo: insere vínculos faltantes / atualiza encargo)
                for (const [siape, enc] of t.professores) {
                    const uid = userIdPorSiape.get(siape);
                    if (!uid) continue;
                    await client.query(
                        `INSERT INTO turmas_professores (turma_id, user_id, encargo) VALUES ($1, $2, $3)
                         ON CONFLICT (turma_id, user_id) DO UPDATE SET encargo = COALESCE(EXCLUDED.encargo, turmas_professores.encargo)`,
                        [turmaId, uid, enc]
                    );
                    contadores.vinculos++;
                }

                // Horários (aditivo: só insere os que ainda não existem; preserva sala já alocada)
                for (const h of t.horarios.values()) {
                    const existe = await client.query(
                        `SELECT 1 FROM turmas_horarios
                         WHERE turma_id = $1 AND dia_semana = $2 AND hora_inicio = $3 AND hora_fim = $4
                           AND COALESCE(tipo_aula,'') = COALESCE($5,'')
                           AND COALESCE(data_inicio, DATE '0001-01-01') = COALESCE($6::date, DATE '0001-01-01')
                           AND COALESCE(data_fim, DATE '0001-01-01') = COALESCE($7::date, DATE '0001-01-01')`,
                        [turmaId, h.dia_semana, h.hora_inicio, h.hora_fim, h.tipo_aula, h.data_inicio, h.data_fim]
                    );
                    if (existe.rowCount === 0) {
                        await client.query(
                            `INSERT INTO turmas_horarios (turma_id, dia_semana, hora_inicio, hora_fim, sala_id, tipo_aula, data_inicio, data_fim)
                             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)`,
                            [turmaId, h.dia_semana, h.hora_inicio, h.hora_fim, h.tipo_aula, h.data_inicio, h.data_fim]
                        );
                        contadores.horarios++;
                    }
                }
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        return res.status(200).json({
            status: "success",
            message: `Grade importada: ${contadores.turmas} turma(s), ${contadores.horarios} horário(s), ${contadores.professores_criados} professor(es) criado(s).`,
            data: contadores,
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao importar disciplinas");
        return res.status(500).json({ status: "error", message: "Erro ao gravar a grade.", data: null });
    }
});

module.exports = router;
