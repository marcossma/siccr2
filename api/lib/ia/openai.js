"use strict";

/**
 * Cliente mínimo da API da OpenAI (Chat Completions + function calling).
 *
 * Usa `fetch` nativo do Node em vez do SDK oficial de propósito: evita mais uma
 * dependência e, principalmente, evita rebuild da imagem Docker a cada ajuste
 * (o `node_modules` não é bind-mount em dev — ver CLAUDE.md).
 *
 * Segue o mesmo contrato do lib/whatsapp.js e do lib/email.js: sem credencial,
 * a integração fica desabilitada em silêncio em vez de quebrar o sistema.
 */

const logger = require("../logger.js");

const API_URL = (process.env.OPENAI_API_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const API_KEY = process.env.OPENAI_API_KEY;
// Ajustável por .env conforme o que a conta tem liberado.
const MODELO = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 60000);

function habilitado() {
    return Boolean(API_KEY);
}

/**
 * Traduz a falha do provedor em algo que o usuário final possa ler — e que não
 * vaze detalhe de configuração. A OpenAI, por exemplo, devolve a chave
 * parcialmente mascarada dentro da mensagem de erro de autenticação.
 */
function mensagemSegura(status) {
    if (status === 401 || status === 403) {
        return "O assistente não está configurado corretamente no servidor. " +
               "Avise o administrador do sistema.";
    }
    if (status === 429) {
        return "O assistente está sobrecarregado ou atingiu o limite de uso. Tente de novo em instantes.";
    }
    if (status >= 500) {
        return "O serviço de IA está indisponível no momento. Tente de novo mais tarde.";
    }
    return "Não foi possível processar a pergunta agora.";
}

/**
 * Uma rodada de conversa. Não decide nada sobre ferramentas — só repassa o que
 * o modelo respondeu. Quem executa e itera é routes/assistente.js.
 *
 * @param {Array} mensagens  histórico no formato da OpenAI
 * @param {Array} ferramentas  esquema de tools (pode ser vazio)
 * @returns {Promise<{ok, mensagem?, uso?, erro?}>} nunca rejeita
 */
async function conversar(mensagens, ferramentas) {
    if (!habilitado()) {
        return { ok: false, erro: "Assistente desabilitado: falta OPENAI_API_KEY no .env." };
    }

    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
        const corpo = {
            model: MODELO,
            messages: mensagens,
            // Temperatura baixa: a tarefa é escolher a ferramenta certa e
            // relatar número, não escrever bonito.
            temperature: 0.2,
        };
        if (ferramentas && ferramentas.length > 0) {
            corpo.tools = ferramentas;
            corpo.tool_choice = "auto";
        }

        const resposta = await fetch(`${API_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(corpo),
            signal: controlador.signal,
        });

        const json = await resposta.json().catch(() => null);

        if (!resposta.ok) {
            const motivo = json?.error?.message || `HTTP ${resposta.status}`;
            logger.error({ status: resposta.status, motivo, modelo: MODELO }, "Erro na API da OpenAI");
            // A mensagem crua do provedor NÃO volta para o usuário: ela chega a
            // conter a chave parcialmente mascarada e nomes de modelo/conta.
            // O detalhe fica no log, que é onde o administrador vai procurar.
            return { ok: false, erro: mensagemSegura(resposta.status) };
        }

        const escolha = json?.choices?.[0];
        if (!escolha) return { ok: false, erro: "Resposta vazia do modelo." };

        return {
            ok: true,
            mensagem: escolha.message,
            motivo_parada: escolha.finish_reason,
            uso: {
                entrada: json?.usage?.prompt_tokens ?? null,
                saida: json?.usage?.completion_tokens ?? null,
            },
        };
    } catch (error) {
        const abortado = error.name === "AbortError";
        logger.error({ err: error, modelo: MODELO }, "Falha ao chamar a OpenAI");
        return {
            ok: false,
            erro: abortado ? "O modelo demorou demais para responder." : "Não foi possível falar com o serviço de IA.",
        };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { conversar, habilitado, MODELO };
