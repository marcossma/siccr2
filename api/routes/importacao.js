const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

const MAX_LINHAS = 5000;

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
                    await client.query(
                        `UPDATE users
                         SET nome = $1, data_nascimento = $2, subunidade_id = COALESCE($3, subunidade_id),
                             cargo = $4, tipo_servidor = $5
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

module.exports = router;
