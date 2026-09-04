/**
 * Verificação da camada de ferramentas do assistente, SEM depender da OpenAI.
 *
 * É aqui que mora a garantia de segurança da funcionalidade: cada ferramenta
 * chama a API com o token de um usuário e o RBAC existente decide o que volta.
 * Este script prova isso com dois perfis diferentes, comparando o que cada um
 * enxerga da MESMA pergunta.
 *
 * Uso (dentro do container):  node scripts/testar-ferramentas-ia.js
 */
"use strict";

const jwt = require("jsonwebtoken");
const { executar, FERRAMENTAS } = require("../lib/ia/ferramentas.js");

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 15000}`;

function token(payload) {
    return jwt.sign(
        { unidade: 1, funcionalidades: [], is_direcao_centro: false, ...payload },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
    );
}

const PERFIS = {
    diretor: token({ id: 1, nome: "Direção", siape: "1", permissao: "diretor", subunidade: null, is_direcao_centro: true }),
    chefeDFT: token({ id: 1, nome: "Chefe DFT", siape: "2", permissao: "chefe", subunidade: 1 }),
    servidor: token({ id: 3, nome: "Servidor", siape: "3", permissao: "servidor", subunidade: 1 }),
};

const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

(async () => {
    let falhas = 0;

    console.log("═══ 1. Todas as ferramentas respondem (perfil direção) ═══\n");
    // Argumentos mínimos por ferramenta; as que não aparecem aqui só precisam do ano
    const ARGS = {
        somar_por: { fonte: "empenhos", por: "fornecedor" },
        salas_disponiveis: { dia_semana: 4, hora_inicio: "08:30", hora_fim: "10:10", vagas: 40 },
        agenda_de_salas: { inicio: "2026-09-01", fim: "2026-09-30" },
    };
    for (const f of FERRAMENTAS) {
        const r = await executar(f.nome, { ano: 2026, ...(ARGS[f.nome] || {}) }, { baseUrl: BASE_URL, token: PERFIS.diretor });
        const linhas = Array.isArray(r.linhas) ? r.linhas.length : "—";
        console.log(`  ${r.ok ? "ok " : "ERR"} ${f.nome.padEnd(24)} linhas=${String(linhas).padStart(5)}  ${r.erro || ""}`);
        if (!r.ok) falhas++;
    }

    console.log("\n═══ 2. RBAC: o mesmo pedido, perfis diferentes ═══\n");
    const pedido = { nome: "resumo_execucao", args: { ano: 2026 } };

    const comoDiretor = await executar(pedido.nome, pedido.args, { baseUrl: BASE_URL, token: PERFIS.diretor });
    const comoChefe = await executar(pedido.nome, pedido.args, { baseUrl: BASE_URL, token: PERFIS.chefeDFT });

    const subsDiretor = comoDiretor.paraModelo?.por_subunidade || [];
    const subsChefe = comoChefe.paraModelo?.por_subunidade || [];
    console.log(`  direção  → ${subsDiretor.length} subunidade(s), aplicado ${brl(comoDiretor.paraModelo?.totais?.aplicado)}`);
    console.log(`  chefe DFT→ ${subsChefe.length} subunidade(s), aplicado ${brl(comoChefe.paraModelo?.totais?.aplicado)}`);
    console.log(`  chefe vê: ${subsChefe.map((s) => s.sigla || s.nome).join(", ") || "(nada)"}`);

    if (subsChefe.length !== 1) {
        console.log("  >>> FALHA: chefe deveria ver exatamente a própria subunidade");
        falhas++;
    } else if (!comoChefe.paraModelo?.escopo_restrito) {
        console.log("  >>> FALHA: o resultado do chefe deveria vir marcado como escopo restrito");
        falhas++;
    } else {
        console.log("  >>> ok: o recorte veio do RBAC da rota, não do prompt");
    }

    console.log("\n═══ 3. Ferramenta tentando furar o escopo ═══\n");
    // Simula o modelo sendo induzido a pedir outra subunidade
    const furo = await executar("listar_empenhos", { ano: 2026, subunidade_id: 18 }, { baseUrl: BASE_URL, token: PERFIS.chefeDFT });
    const siglas = [...new Set((furo.paraTela?.itens || []).map((i) => i.subunidade_sigla))];
    console.log(`  chefe DFT pediu subunidade_id=18 (Zootecnia) → ${furo.paraTela?.total ?? 0} registro(s), siglas: ${siglas.join(", ") || "(nenhuma)"}`);
    if (siglas.some((s) => s && s !== "DFT")) {
        console.log("  >>> FALHA: vazou dado de outra subunidade");
        falhas++;
    } else {
        console.log("  >>> ok: o filtro pedido foi ignorado em favor do escopo do usuário");
    }

    console.log("\n═══ 4. Servidor comum é barrado pelo RBAC financeiro ═══\n");
    const negado = await executar("resumo_execucao", { ano: 2026 }, { baseUrl: BASE_URL, token: PERFIS.servidor });
    console.log(`  ok=${negado.ok} · devolvido ao modelo: ${JSON.stringify(negado.paraModelo).slice(0, 120)}`);
    if (negado.ok) {
        console.log("  >>> FALHA: servidor não deveria acessar o financeiro");
        falhas++;
    } else {
        console.log("  >>> ok: negado, e com orientação para o modelo explicar em vez de contornar");
    }

    console.log("\n═══ 3b. Salas e servidores: RBAC por domínio ═══\n");
    // Salas e manutenção são abertas a qualquer logado; a lista de servidores
    // exige chefe+. O assistente não muda isso — herda de cada rota.
    for (const [ferramenta, args] of [
        ["listar_salas", {}],
        ["listar_manutencoes", {}],
        ["patrimonio_por_sala", {}],
        ["aniversariantes", {}],
        ["listar_servidores", {}],
    ]) {
        const comoServidor = await executar(ferramenta, args, { baseUrl: BASE_URL, token: PERFIS.servidor });
        const comoDiretor = await executar(ferramenta, args, { baseUrl: BASE_URL, token: PERFIS.diretor });
        const n = (r) => (Array.isArray(r.linhas) ? r.linhas.length : "—");
        console.log(`  ${ferramenta.padEnd(22)} servidor: ${comoServidor.ok ? `ok (${n(comoServidor)})` : "negado"} · direção: ${comoDiretor.ok ? `ok (${n(comoDiretor)})` : "negado"}`);
        if (!comoDiretor.ok) { console.log("  >>> FALHA: direção deveria conseguir"); falhas++; }
    }
    const servidoresParaServidor = await executar("listar_servidores", {}, { baseUrl: BASE_URL, token: PERFIS.servidor });
    if (servidoresParaServidor.ok) {
        console.log("  >>> FALHA: servidor comum não deveria listar servidores");
        falhas++;
    } else {
        console.log("  >>> ok: lista de servidores exige chefe+, como a rota já define");
    }

    console.log("\n═══ 3c. Telefone e nascimento não chegam ao modelo ═══\n");
    const servidores = await executar("listar_servidores", {}, { baseUrl: BASE_URL, token: PERFIS.diretor });
    const amostraServ = servidores.paraModelo?.amostra_dos_primeiros || servidores.linhas || [];
    const camposServ = amostraServ.length ? Object.keys(amostraServ[0]) : [];
    const proibidos = camposServ.filter((c) => /whatsapp|telefone|celular|nascimento|senha/i.test(c));
    console.log(`  ${servidores.paraModelo?.total_de_registros ?? amostraServ.length} servidor(es); campos entregues: ${camposServ.join(", ") || "(nenhum)"}`);
    if (proibidos.length > 0) {
        console.log(`  >>> FALHA: dado pessoal vazando: ${proibidos.join(", ")}`);
        falhas++;
    } else {
        console.log("  >>> ok: sem telefone nem data de nascimento");
    }
    // O mural de aniversários continua funcionando (dia/mês, sem o ano)
    const aniv = await executar("aniversariantes", {}, { baseUrl: BASE_URL, token: PERFIS.diretor });
    const primeiro = (aniv.linhas || [])[0];
    console.log(`  aniversariantes do mês: ${(aniv.linhas || []).length}${primeiro ? ` · exemplo: ${JSON.stringify(primeiro)}` : ""}`);
    if (primeiro && /\d{4}/.test(JSON.stringify(primeiro))) {
        console.log("  >>> FALHA: parece haver ano de nascimento na resposta");
        falhas++;
    }

    console.log("\n═══ 4b. Agregação também respeita o escopo ═══\n");
    // O agrupamento é onde um vazamento seria mais grave: um chefe veria o
    // ranking do centro inteiro numa tacada.
    const aggDiretor = await executar("somar_por", { fonte: "almoxarifado", por: "subunidade", ano: 2025 }, { baseUrl: BASE_URL, token: PERFIS.diretor });
    const aggChefe = await executar("somar_por", { fonte: "almoxarifado", por: "subunidade", ano: 2025 }, { baseUrl: BASE_URL, token: PERFIS.chefeDFT });
    const gruposDiretor = aggDiretor.paraModelo?.grupos_no_total ?? 0;
    const gruposChefe = aggChefe.paraModelo?.grupos_no_total ?? 0;
    console.log(`  direção  → ${gruposDiretor} grupo(s), soma ${brl(aggDiretor.paraModelo?.soma_de_todos_os_grupos)}`);
    console.log(`  chefe DFT→ ${gruposChefe} grupo(s), soma ${brl(aggChefe.paraModelo?.soma_de_todos_os_grupos)}`);
    if (gruposChefe > 1) {
        console.log("  >>> FALHA: o chefe está vendo o ranking de outras subunidades");
        falhas++;
    } else {
        console.log("  >>> ok: o agrupamento fica restrito ao escopo do usuário");
    }

    // O `por` é interpolado no SQL — só pode sair de whitelist
    const injecao = await executar("somar_por", { fonte: "scdp", por: "proposto) FROM users--", ano: 2025 }, { baseUrl: BASE_URL, token: PERFIS.diretor });
    console.log(`  agrupamento forjado → ok=${injecao.ok} · ${String(injecao.erro || "").slice(0, 70)}`);
    if (injecao.ok) {
        console.log("  >>> FALHA: agrupamento fora da whitelist foi aceito");
        falhas++;
    } else {
        console.log("  >>> ok: recusado pela whitelist");
    }

    console.log("\n═══ 5. Dado pessoal não sai da plataforma (duas camadas) ═══\n");

    // Camada 1: a própria rota não seleciona o CPF
    const viagens = await executar("listar_viagens", { ano: 2026, limit: 5 }, { baseUrl: BASE_URL, token: PERFIS.diretor });
    const amostra = viagens.paraModelo?.amostra_dos_primeiros || [];
    const campos = amostra.length ? Object.keys(amostra[0]) : [];
    const expostos = campos.filter((c) => /cpf/i.test(c));
    console.log(`  camada 1 — a rota devolve ${campos.length} campos; com CPF: ${expostos.join(", ") || "nenhum"}`);
    if (expostos.length > 0) {
        console.log("  >>> FALHA: a listagem está expondo CPF");
        falhas++;
    }

    // Camada 2: ainda que passasse, a redação mascara — inclusive em texto livre
    const { redigir } = require("../lib/ia/redacao.js");
    const teste = redigir({
        cpf: "948.431.550-04",
        proposto: "FULANO DE TAL",
        observacao: "reembolso ao servidor 71529284449",
        processo: "23081.065673/2025-14",
        valor: 1234.56,
    });
    const sobrou = JSON.stringify(teste).match(/(?<!\d)(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})(?!\d)/);
    console.log(`  camada 2 — cpf="${teste.cpf}" · observacao="${teste.observacao}"`);
    console.log(`             preservou processo="${teste.processo}" e proposto="${teste.proposto}"`);
    if (sobrou) {
        console.log(`  >>> FALHA: sobrou CPF legível (${sobrou[0]})`);
        falhas++;
    } else if (teste.proposto !== "FULANO DE TAL" || teste.processo !== "23081.065673/2025-14") {
        console.log("  >>> FALHA: a redação mascarou o que não devia");
        falhas++;
    } else {
        console.log("  >>> ok: CPF coberto nas duas camadas, sem estragar nº de processo nem nome");
    }

    console.log(`\n${falhas === 0 ? "TUDO OK" : `${falhas} FALHA(S)`}\n`);
    process.exit(falhas === 0 ? 0 : 1);
})();
