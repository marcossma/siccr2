"use strict";

/**
 * Redação de dado pessoal antes de sair da plataforma.
 *
 * O que a IA recebe é enviado para um serviço de terceiros (OpenAI). O SICCR é
 * de uma instituição pública e algumas tabelas carregam dado pessoal — o caso
 * concreto é `scdp_viagens.cpf`. Nada disso precisa ir para o modelo para ele
 * responder "quanto o DSOL gastou com diárias".
 *
 * O que mascaramos e por quê:
 *  - **CPF** — dado pessoal sensível, e inútil para qualquer pergunta analítica.
 *    Mascarado tanto no campo próprio quanto quando aparece solto em texto
 *    livre (acontece: gente digita CPF em observação).
 *  - **Nomes de servidor** (proposto, solicitante, fornecedor) ficam. A planilha
 *    de origem é literalmente um documento de transparência, e sem eles
 *    perguntas legítimas ("quem mais viajou?") deixariam de funcionar.
 *
 * Se um dia entrar outro campo sensível, é aqui que se acrescenta — a redação
 * roda em TODA resposta de ferramenta, antes de virar contexto do modelo.
 */

// 000.000.000-00 ou 00000000000 — com fronteira para não pegar pedaço de
// número de processo (23081.065673/2025-14) nem valor monetário
const RE_CPF = /(?<!\d)(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})(?!\d)/g;

const CHAVES_SENSIVEIS = /^(cpf|cpf_proposto|documento_pessoal)$/i;

/**
 * Campos que somem por completo do que vai ao modelo.
 *
 * `/api/usuarios` devolve 485 servidores COM whatsapp e data de nascimento.
 * São dados pessoais sem qualquer finalidade analítica — nenhuma pergunta do
 * tipo "quem trabalha no DSOL?" precisa do celular de ninguém. Some aqui, na
 * fronteira, em vez de depender de cada ferramenta lembrar de não pedir.
 *
 * Aniversários continuam funcionando: `/api/aniversariantes` devolve `dia` e
 * `dia_mes` como campos próprios, sem o ano — que é justamente a parte
 * sensível de uma data de nascimento.
 */
const CHAVES_REMOVIDAS = /^(whatsapp|telefone|celular|data_nascimento|nascimento|senha|password|token)$/i;

/** "948.431.550-04" → "***.***.550-04" (mantém o fim, que é o que a pessoa usa p/ conferir) */
function mascararCpf(_m, _a, _b, c, d) {
    return `***.***.${c}-${d}`;
}

function redigirTexto(valor) {
    if (typeof valor !== "string") return valor;
    return valor.replace(RE_CPF, mascararCpf);
}

/**
 * Percorre a estrutura devolvida por uma ferramenta e mascara o que for
 * pessoal. Não muda o formato: a IA continua vendo o mesmo shape.
 */
function redigir(valor) {
    if (valor === null || valor === undefined) return valor;
    if (typeof valor === "string") return redigirTexto(valor);
    if (typeof valor !== "object") return valor;
    if (Array.isArray(valor)) return valor.map(redigir);

    const saida = {};
    for (const [chave, v] of Object.entries(valor)) {
        if (CHAVES_REMOVIDAS.test(chave)) continue;          // nem chega ao modelo
        if (CHAVES_SENSIVEIS.test(chave)) {
            saida[chave] = typeof v === "string" && v.trim() ? redigirTexto(v) : null;
        } else {
            saida[chave] = redigir(v);
        }
    }
    return saida;
}

module.exports = { redigir, redigirTexto };
