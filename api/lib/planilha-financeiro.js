/**
 * Parser da planilha do setor financeiro ("Transparência NOr_CCR.xlsx").
 *
 * O arquivo tem ~26 abas e o layout MUDA a cada ano (nome, ordem e quantidade
 * de colunas), além de misturar três origens: dump cru do SIE, planilha
 * digitada à mão e tabelas dinâmicas. Por isso:
 *
 *  - O front manda a aba como array-de-arrays (AoA), sem interpretar nada.
 *  - Aqui localizamos a linha de cabeçalho (não é sempre a primeira: algumas
 *    abas começam com uma linha de observação) escolhendo a que casa com mais
 *    sinônimos conhecidos.
 *  - Cada campo tem uma LISTA de sinônimos, em ordem de prioridade, cobrindo
 *    todas as variações vistas nos anos de 2024 a 2026.
 *
 * Abas de PIVÔ (Resumo, Saldos, Almoxarifado 2026, SCDP 2024) não são
 * importáveis por construção: não casam sinônimos suficientes e caem em
 * "não reconhecida". Isso é intencional — esses números são recalculados
 * pelo sistema a partir dos fatos.
 */

// Normaliza cabeçalho/rótulo: NFKD (º→o), sem acento, maiúsculas, pontuação
// vira espaço, espaços colapsados. "Nº SIE" e "NUM_EMPENHO" ficam comparáveis.
function norm(s) {
    return String(s === null || s === undefined ? "" : s)
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .trim();
}

// Texto útil da célula ("", "-", "#N/A", "#REF!" → null)
function texto(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "" || s === "-" || s === "--") return null;
    if (/^#(N\/?A|REF|VALUE|DIV|NAME|NULL|NUM)/i.test(s)) return null;
    return s;
}

// Número tolerante: aceita 1234.56, "1.234,56", "R$ 1.234,56", "-", "#N/A"
function numero(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = texto(v);
    if (s === null) return null;
    let t = s.replace(/[R$\s]/gi, "");
    // "1.234,56" (pt-BR) → "1234.56"; "1234.56" fica como está
    if (/,/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
}

// Serial do Excel → "yyyy-mm-dd". Base 1899-12-30 (o bug do ano bissexto de
// 1900 já está embutido nessa base, é assim que o Excel conta).
function serialParaData(n) {
    if (!Number.isFinite(n) || n < 20000 || n > 80000) return null; // ~1954..2119
    const ms = Math.round(n) * 86400000;
    const d = new Date(Date.UTC(1899, 11, 30) + ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/**
 * Data tolerante. A mesma coluna mistura: serial do Excel (46034), Date já
 * convertido pelo SheetJS, ISO e "dd/mm/yyyy". Texto que não for uma data
 * única (ex.: "26/01/2026 a 27/01/2026") devolve null — quem quiser o
 * conteúdo cru guarda em outro campo.
 */
function data(v) {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    if (typeof v === "number") return serialParaData(v);
    const s = String(v).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    // Só aceita dd/mm/yyyy quando é a string inteira (evita capturar a 1ª
    // data de um intervalo "01/02/2026 a 05/02/2026")
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) {
        const [, d, m, y] = br;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Serial em forma de texto ("46034" ou "46034.0")
    const n = parseFloat(s);
    if (/^\d+(\.\d+)?$/.test(s) && Number.isFinite(n)) return serialParaData(n);
    return null;
}

function booleano(v) {
    const s = norm(v);
    if (s === "") return null;
    if (["SIM", "S", "TRUE", "1", "X"].includes(s)) return true;
    if (["NAO", "N", "FALSE", "0"].includes(s)) return false;
    return null;
}

// Código estruturado "03.36.00.00.0.0" → "03.36" (formato curto usado em
// subunidades.subunidade_codigo pelo import de subunidades)
function codigoCurto(v) {
    const s = texto(v);
    if (!s) return null;
    // O SIE às vezes entrega o código como número (03.11 vira 3.11)
    const partes = s.split(".");
    if (partes.length < 2) return null;
    while (partes.length > 1 && /^0+$/.test(partes[partes.length - 1])) partes.pop();
    const curto = partes.join(".");
    return /^\d/.test(curto) ? curto : null;
}

// ═══════════════════════════════════════════════════════════════════════
// Mapas de campo → sinônimos de cabeçalho (já normalizados), em ordem de
// prioridade. `req` lista os campos que precisam existir para a aba ser
// considerada reconhecida.
// ═══════════════════════════════════════════════════════════════════════

const MAPAS = {
    empenhos: {
        req: ["valor_empenhado"],
        campos: {
            data_cadastro: ["DATA CADASTRO", "DT CADASTRO", "LON"],
            num_sie: ["NO SIE", "EMPENHO SIE", "NUM EMPENHO", "NO EMPENHO"],
            num_siafi: ["EMPENHO SIAFI", "SIAFI"],
            especie: ["EMPENHO DISPENSA TRANSFERENCIA", "DESCR EVENTO", "DESCR ESPECIE"],
            cod_natureza: ["CODIGO DE NAT DESP", "COD DESPESA", "CODIGO", "NATUREZA"],
            tipo_despesa: ["TIPO DE DESPESA", "NAT DESP", "NAT DESPESA", "NATUREZA DA DESPESA"],
            fornecedor: ["FORNECEDOR", "NOME FORNECEDOR"],
            pagadora_texto: ["UGR PAGADORA", "GESTORA", "UNIDADE ADMINISTRATIVA", "NOME GESTORA", "NOME UNIDADE"],
            entrega_texto: ["UNIDADE ENTREGA", "UND ENTREGA"],
            entrega_codigo: ["COD UNIDADE ADM"],
            resumo: ["RESUMO EMPENHO", "RESUMO"],
            valor_empenhado: ["VALOR EMPENHADO", "VL EMPENHADO", "VL EMPENHO"],
            valor_liquidado: ["VLLIQUIDADO", "VL LIQUIDADO", "VALOR LIQUIDADO"],
            processo: ["PROCESSO LIQUIDACAO", "PROCESSO DE LIQUIDACAO", "NUM PROCESSO"],
            observacao: ["OBSERVACAO", "OBSERVACOES", "OBS"],
        },
    },
    almoxarifado: {
        req: ["valor_total"],
        campos: {
            data_lancamento: ["LANCADA EM", "DT MOVIMENTO", "DATA"],
            num_requisicao: ["NO REQUISICAO", "NUM PROCESSO", "REQUISICAO"],
            subunidade_texto: ["UND SOL", "UN SOLICITANTE", "UNIDADE SOLICITANTE"],
            subunidade_codigo: ["COD UN SOLICITANTE"],
            solicitante: ["SOLICITANTE"],
            usuario_sie: ["USUARIO NO SIE", "USUARIO SIE"],
            valor_total: ["VALOR TOTAL", "VL MOVIMENTADO", "VL SOLICITADO"],
            local_entrega: ["LOCAL DE ENTREGA", "LOCAL ENTREGA"],
            situacao: ["SITUACAO"],
            tipo_movimento: ["TIPO DE MOVIMENTO"],
            observacao: ["OBSERVACOES", "OBSERVACAO"],
            tramitacao: ["TRAMITACAO"],
        },
    },
    scdp: {
        req: ["pcdp"],
        campos: {
            solicitante: ["SOLICITANTE DE VIAGEM", "SOLICITANTE"],
            data_cadastro: ["DATA DO CADASTRO", "DATA CADASTRO"],
            grupo_tipo: ["GRUPO TIPO PROPOSTO", "GRUPO TIPO"],
            cpf: ["CPF"],
            proposto: ["PROPOSTO"],
            subunidade_texto: ["SUBUNIDADE ORIGEM", "SUBUNIDADE"],
            pcdp: ["PCDP"],
            fonte_recurso: ["FONTE DO RECURSO", "FONTE"],
            num_diarias: ["N DIARIAS", "NO DIARIAS", "NUM DIARIAS"],
            valor_diarias: ["VALOR DIARIAS"],
            valor_passagens_aereas: ["PASSAGENS AEREAS"],
            valor_passagens_rodoviarias: ["PASSAGENS RODOVIARIAS"],
            periodo_viagem: ["PERIODO DA VIAGEM", "PERIODO"],
        },
    },
    licitacoes: {
        req: ["descricao"],
        campos: {
            data: ["DATA"],
            tipo: ["TIPO"],
            subunidade_texto: ["SUBUNIDADE", "SETOR"],
            interessado: ["DISC PROJ INTERESSADO", "INTERESSADO"],
            elaborador_etp: ["ELABORADOR ETP"],
            usuario_sie: ["USUARIO SIE"],
            cod_reduzido: ["COD RED", "CODIGO REDUZIDO"],
            descricao: ["DESCRICAO"],
            unidades: ["UNIDADES", "QUANTIDADE", "QTD"],
            valor_unitario: ["VALOR UNIT", "VALOR UNITARIO"],
            valor_total: ["VALOR TOTAL"],
            dfd: ["DFD"],
            etp: ["ETP"],
            solicitacao_sie: ["SOLICITACAO SIE"],
        },
    },
    transferencias: {
        req: ["valor"],
        campos: {
            data: ["DATA"],
            subunidade_texto: ["UND ENTREGA", "UNIDADE ENTREGA"],
            num_transferencia: ["NO TRANSF", "NUM TRANSF", "N TRANSF"],
            solicitante: ["SOLICITANTE"],
            usuario_sie: ["USUARIO SIE"],
            gestora_destino: ["GESTORA DESTINO"],
            cod_natureza: ["COD DESPESA", "CODIGO"],
            tipo_despesa: ["NAT DESPESA", "NAT DESP"],
            valor: ["VALOR"],
            observacao: ["OBSERVACOES", "OBSERVACAO"],
            contado_em_outra_guia: ["CONTADO EM OUTRA GUIA"],
        },
    },
    naturezas: {
        req: [],
        campos: {}, // layout posicional: col0 = código, col1 = nome
    },
    apelidos: {
        req: [],
        campos: {}, // layout posicional: col0 = código estruturado, col1 = sigla, col2 = nome
    },
    orcamento: {
        req: [],
        campos: {}, // layout próprio, ver extrairOrcamento()
    },
};

// Abas conhecidas que deliberadamente NÃO importamos, com o motivo.
const IGNORADAS = [
    [/^RESUMO\b/, "tabela dinâmica — o sistema recalcula a partir dos fatos"],
    [/^SALDOS/, "tabela dinâmica — o saldo é calculado (dotação − aplicado)"],
    [/^LIQUIDADOS/, "notas fiscais liquidadas — já refletido em 'valor liquidado' dos empenhos"],
    [/^SOL DE EMPENHO/, "formulário externo (Google Forms) — candidato a virar fluxo nativo"],
    [/^LISTA SERVIDORES/, "use o importador de servidores (/adm/importar-servidores)"],
    [/^PAGINA\s*\d+$/, "aba de apoio sem cabeçalho reconhecido"],
];

/**
 * Classifica uma aba pelo nome → { tipo, ano } ou { tipo: null, motivo }.
 * O ano sai do próprio nome da aba ("Empenhos 2026" → 2026).
 */
function classificarAba(nome) {
    const n = norm(nome);
    const anoMatch = n.match(/\b(20\d{2})\b/);
    const ano = anoMatch ? Number(anoMatch[1]) : null;

    // "Página43" é o catálogo de naturezas (código ↔ nome), sem cabeçalho.
    if (/^PAGINA\s*43$/.test(n)) return { tipo: "naturezas", ano: null };
    if (/^ORCAMENTO/.test(n)) return { tipo: "orcamento", ano };
    // A aba "Subunidades CCR" não vira fato: ela é o de-para
    // sigla ↔ código estruturado ↔ nome, e alimenta subunidades_apelidos.
    if (/^SUBUNIDADES/.test(n)) return { tipo: "apelidos", ano: null };

    for (const [re, motivo] of IGNORADAS) {
        if (re.test(n)) return { tipo: null, ano, motivo };
    }

    if (/^(EMPENHOS|EMPENHOSDISPENSAS|VALORES SPROJ|SIE)\b/.test(n)) return { tipo: "empenhos", ano };
    if (/^ALMOXARIFADO/.test(n)) return { tipo: "almoxarifado", ano };
    if (/^SCDP/.test(n)) return { tipo: "scdp", ano };
    if (/^LICITACOES/.test(n)) return { tipo: "licitacoes", ano };
    if (/^TRANSFERENCIAS/.test(n)) return { tipo: "transferencias", ano };

    return { tipo: null, ano, motivo: "aba desconhecida" };
}

/**
 * Acha a linha de cabeçalho nas primeiras `limite` linhas: é a que casa com
 * mais sinônimos. Devolve { idx, indices: { campo: coluna } }.
 */
function localizarCabecalho(aoa, mapa, limite = 6) {
    let melhor = { idx: -1, indices: {}, casados: 0 };
    for (let i = 0; i < Math.min(limite, aoa.length); i++) {
        const cabecalho = (aoa[i] || []).map(norm);
        const indices = {};
        let casados = 0;
        for (const [campo, sinonimos] of Object.entries(mapa.campos)) {
            for (const s of sinonimos) {
                const col = cabecalho.indexOf(s);
                if (col >= 0) { indices[campo] = col; casados++; break; }
            }
        }
        if (casados > melhor.casados) melhor = { idx: i, indices, casados };
    }
    return melhor;
}

// Lê uma célula pelo nome do campo mapeado
function celula(linha, indices, campo) {
    const col = indices[campo];
    return col === undefined ? null : linha[col];
}

// "Estimativo - Almoxarifado", "Estimativo - Bolsas"… são empenhos de
// provisionamento: dinheiro reservado, não consumo. Somá-los junto com o
// consumo (requisições de almoxarifado, diárias do SCDP) duplicaria o gasto,
// que é justamente o que as abas Resumo evitam.
function ehEstimativo(tipoDespesa) {
    return /^ESTIMATIVO\b/.test(norm(tipoDespesa));
}

// ═══════════════════════════════════════════════════════════════════════
// Extratores por tipo. Todos devolvem { itens, ignoradas, cabecalho }.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Tamanho máximo dos campos de texto, espelhando as colunas do banco.
 * A planilha é digitada à mão e vez ou outra alguém empilha três números de
 * processo numa célula só; truncar aqui evita que uma célula derrube a
 * importação inteira da aba.
 */
const LIMITES = {
    empenhos: {
        num_sie: 30, num_siafi: 30, especie: 30, cod_natureza: 20, tipo_despesa: 120,
        fornecedor: 255, pagadora_texto: 255, entrega_texto: 255, processo: 255,
    },
    almoxarifado: {
        num_requisicao: 30, subunidade_texto: 255, solicitante: 255, usuario_sie: 255,
        local_entrega: 255, situacao: 120, tipo_movimento: 60, tramitacao: 120,
    },
    scdp: {
        pcdp: 30, solicitante: 255, grupo_tipo: 120, cpf: 20, proposto: 255,
        subunidade_texto: 255, fonte_recurso: 120, periodo_viagem: 120,
    },
    licitacoes: {
        tipo: 120, subunidade_texto: 255, interessado: 255, elaborador_etp: 255,
        usuario_sie: 255, cod_reduzido: 40, dfd: 40, etp: 40, solicitacao_sie: 40,
    },
    transferencias: {
        num_transferencia: 30, subunidade_texto: 255, solicitante: 255, usuario_sie: 255,
        gestora_destino: 255, cod_natureza: 20, tipo_despesa: 120,
    },
};

function aplicarLimites(item, tipo) {
    const limites = LIMITES[tipo];
    if (!limites) return item;
    for (const [campo, max] of Object.entries(limites)) {
        const v = item[campo];
        if (typeof v === "string" && v.length > max) item[campo] = v.slice(0, max);
    }
    return item;
}

function extrairGenerico(aoa, tipo, aba, ano) {
    const mapa = MAPAS[tipo];
    const { idx, indices, casados } = localizarCabecalho(aoa, mapa);
    if (idx < 0 || mapa.req.some((c) => indices[c] === undefined)) {
        return { itens: [], ignoradas: 0, cabecalho: null, casados };
    }

    const itens = [];
    let ignoradas = 0;
    for (let i = idx + 1; i < aoa.length; i++) {
        const linha = aoa[i] || [];
        const g = (campo) => celula(linha, indices, campo);
        const item = montar[tipo](g, aba, ano);
        if (item === null) { ignoradas++; continue; }
        itens.push(aplicarLimites(item, tipo));
    }
    return { itens, ignoradas, cabecalho: idx, casados };
}

const montar = {
    empenhos: (g, aba, ano) => {
        const valor = numero(g("valor_empenhado"));
        const numSie = texto(g("num_sie"));
        // Sem valor E sem identificação a linha é lixo (rodapé, linha em branco)
        if (valor === null && !numSie) return null;
        const tipoDespesa = texto(g("tipo_despesa"));
        return {
            ano,
            data_cadastro: data(g("data_cadastro")),
            num_sie: numSie,
            num_siafi: texto(g("num_siafi")),
            especie: texto(g("especie")),
            cod_natureza: texto(g("cod_natureza")),
            tipo_despesa: tipoDespesa,
            estimativo: ehEstimativo(tipoDespesa),
            fornecedor: texto(g("fornecedor")),
            pagadora_texto: texto(g("pagadora_texto")),
            entrega_texto: texto(g("entrega_texto")),
            entrega_codigo: codigoCurto(g("entrega_codigo")),
            resumo: texto(g("resumo")),
            valor_empenhado: valor,
            valor_liquidado: numero(g("valor_liquidado")),
            processo: texto(g("processo")),
            observacao: texto(g("observacao")),
            origem_aba: aba,
        };
    },

    almoxarifado: (g, aba, ano) => {
        const valor = numero(g("valor_total"));
        const num = texto(g("num_requisicao"));
        if (valor === null && !num) return null;
        return {
            ano,
            data_lancamento: data(g("data_lancamento")),
            num_requisicao: num,
            subunidade_texto: texto(g("subunidade_texto")),
            subunidade_codigo: codigoCurto(g("subunidade_codigo")),
            solicitante: texto(g("solicitante")),
            usuario_sie: texto(g("usuario_sie")),
            valor_total: valor,
            local_entrega: texto(g("local_entrega")),
            situacao: texto(g("situacao")),
            tipo_movimento: texto(g("tipo_movimento")),
            observacao: texto(g("observacao")),
            tramitacao: texto(g("tramitacao")),
            origem_aba: aba,
        };
    },

    scdp: (g, aba, ano) => {
        const pcdp = texto(g("pcdp"));
        if (!pcdp) return null;
        return {
            ano,
            data_cadastro: data(g("data_cadastro")),
            pcdp,
            solicitante: texto(g("solicitante")),
            grupo_tipo: texto(g("grupo_tipo")),
            cpf: texto(g("cpf")),
            proposto: texto(g("proposto")),
            subunidade_texto: texto(g("subunidade_texto")),
            fonte_recurso: texto(g("fonte_recurso")),
            num_diarias: numero(g("num_diarias")),
            valor_diarias: numero(g("valor_diarias")),
            valor_passagens_aereas: numero(g("valor_passagens_aereas")),
            valor_passagens_rodoviarias: numero(g("valor_passagens_rodoviarias")),
            // Coluna bagunçada: ora serial de data, ora "26/01 a 27/01". O
            // texto cru é mais informativo que uma data só, então guardamos ele.
            periodo_viagem: (() => {
                const v = g("periodo_viagem");
                const d = data(v);
                if (d) return d.split("-").reverse().join("/");
                const t = texto(v);
                return t ? t.slice(0, 120) : null;
            })(),
            origem_aba: aba,
        };
    },

    licitacoes: (g, aba, ano) => {
        const descricao = texto(g("descricao"));
        if (!descricao) return null;
        return {
            ano,
            data: data(g("data")),
            tipo: texto(g("tipo")),
            subunidade_texto: texto(g("subunidade_texto")),
            interessado: texto(g("interessado")),
            elaborador_etp: texto(g("elaborador_etp")),
            usuario_sie: texto(g("usuario_sie")),
            cod_reduzido: texto(g("cod_reduzido")),
            descricao,
            unidades: numero(g("unidades")),
            valor_unitario: numero(g("valor_unitario")),
            valor_total: numero(g("valor_total")),
            dfd: texto(g("dfd")),
            etp: texto(g("etp")),
            solicitacao_sie: texto(g("solicitacao_sie")),
            origem_aba: aba,
        };
    },

    transferencias: (g, aba, ano) => {
        const valor = numero(g("valor"));
        if (valor === null) return null;
        return {
            ano,
            data: data(g("data")),
            num_transferencia: texto(g("num_transferencia")),
            subunidade_texto: texto(g("subunidade_texto")),
            solicitante: texto(g("solicitante")),
            usuario_sie: texto(g("usuario_sie")),
            gestora_destino: texto(g("gestora_destino")),
            cod_natureza: texto(g("cod_natureza")),
            tipo_despesa: texto(g("tipo_despesa")),
            valor,
            contado_em_outra_guia: booleano(g("contado_em_outra_guia")),
            observacao: texto(g("observacao")),
            origem_aba: aba,
        };
    },
};

/**
 * Aba "Página43": catálogo posicional código → nome, sem cabeçalho.
 * O mesmo código aparece com dois nomes (3.3.9.0.39.00 = PJ e PF) — é assim
 * na origem e a tabela aceita, a chave única é (codigo, nome).
 */
function extrairNaturezas(aoa, aba) {
    const itens = [];
    let ignoradas = 0;
    for (const linha of aoa) {
        const codigo = texto(linha?.[0]);
        const nome = texto(linha?.[1]);
        if (!codigo || !nome || !/^\d[\d.]+$/.test(codigo)) { ignoradas++; continue; }
        itens.push({ codigo, nome: nome.slice(0, 120), origem_aba: aba });
    }
    return { itens, ignoradas, cabecalho: null };
}

/**
 * Aba "Subunidades CCR": de-para oficial da estrutura, três colunas úteis
 * (código estruturado | sigla | nome). Não é fato — serve para ensinar ao
 * sistema os apelidos com que as outras abas chamam cada subunidade
 * ("DTCA", "SID/CCR", "DZOT"), que é justamente o que falta no cadastro.
 * As duas primeiras linhas são títulos; filtramos pelo formato do código.
 */
function extrairApelidos(aoa, aba) {
    const itens = [];
    let ignoradas = 0;
    for (const linha of aoa) {
        const codigo = codigoCurto((linha || [])[0]);
        const sigla = texto((linha || [])[1]);
        const nome = texto((linha || [])[2]);
        if (!codigo || !nome) { ignoradas++; continue; }
        itens.push({ codigo, sigla, nome, origem_aba: aba });
    }
    return { itens, ignoradas, cabecalho: null };
}

/**
 * Aba "Orçamento": layout próprio, com DUAS tabelas empilhadas.
 *
 *  linhas 0-2  → totais declarados (CUSTEIO / EQUIPAMENTOS / TOTAL)
 *
 *  (A) CUSTEIO, por programa/ação — cabeçalho contém "PROGRAMA ou AÇÃO":
 *      col0 = grupo (só na 1ª linha do grupo, propaga p/ baixo)
 *      col1 = programa | col2 = % | col3 = R$ | col4 = subunidade responsável
 *
 *  (B) PERMANENTE, por departamento — começa em "DISTRIBUIÇÃO RECURSOS
 *      PERMANENTES", cabeçalho "Cod. - Nome do Departamento":
 *      col0 = departamento | col1 = % | col2 = R$
 *
 * Linhas de fechamento ("soma", ou programa vazio com só o total) são
 * descartadas — o total é recalculado a partir dos itens.
 *
 * A aba não tem ano no nome — quem chama informa (o front pergunta).
 */
function extrairOrcamento(aoa, aba, ano) {
    const ehInicioCapital = (linha) =>
        /DISTRIBUICAO RECURSOS PERMANENTES/.test(norm((linha || [])[0]));
    const ehCabecalhoCapital = (linha) => /NOME DO DEPARTAMENTO/.test(norm((linha || [])[0]));
    const ehCabecalhoCusteio = (linha) => (linha || []).some((c) => /^PROGRAMA/.test(norm(c)));

    let idxCusteio = -1, idxCapital = -1;
    for (let i = 0; i < aoa.length; i++) {
        if (idxCusteio < 0 && ehCabecalhoCusteio(aoa[i])) idxCusteio = i;
        if (idxCapital < 0 && (ehInicioCapital(aoa[i]) || ehCabecalhoCapital(aoa[i]))) idxCapital = i;
    }
    if (idxCusteio < 0 && idxCapital < 0) {
        return { itens: [], ignoradas: 0, cabecalho: null, totais: {} };
    }

    // Totais declarados no topo da aba
    const totais = {};
    for (let i = 0; i < (idxCusteio < 0 ? 3 : idxCusteio); i++) {
        const rotulo = norm((aoa[i] || [])[0]);
        const valor = numero((aoa[i] || [])[1]);
        if (!rotulo || valor === null) continue;
        if (rotulo === "CUSTEIO") totais.custeio = valor;
        else if (/EQUIPAMENTO|PERMANENTE|CAPITAL/.test(rotulo)) totais.capital = valor;
        else if (rotulo === "TOTAL") totais.total = valor;
    }

    const itens = [];
    let ignoradas = 0;

    // (A) Custeio por programa/ação
    if (idxCusteio >= 0) {
        const fim = idxCapital > idxCusteio ? idxCapital : aoa.length;
        let grupo = null;
        for (let i = idxCusteio + 1; i < fim; i++) {
            const linha = aoa[i] || [];
            const g0 = texto(linha[0]);
            if (g0) grupo = g0; // cabeçalho de grupo: propaga p/ as linhas seguintes
            const programa = texto(linha[1]);
            const valor = numero(linha[3]);
            if (!programa || valor === null || norm(programa) === "SOMA") { ignoradas++; continue; }
            itens.push({
                ano, categoria: "custeio", grupo,
                programa: programa.slice(0, 255),
                percentual: numero(linha[2]),
                valor,
                subunidade_texto: texto(linha[4]),
                origem_aba: aba,
            });
        }
    }

    // (B) Permanente por departamento
    if (idxCapital >= 0) {
        for (let i = idxCapital + 1; i < aoa.length; i++) {
            const linha = aoa[i] || [];
            const nome = texto(linha[0]);
            const valor = numero(linha[2]);
            if (!nome || valor === null || norm(nome) === "SOMA") { ignoradas++; continue; }
            if (ehCabecalhoCapital(linha)) { ignoradas++; continue; }
            itens.push({
                ano, categoria: "capital", grupo: "Recursos permanentes",
                programa: nome.slice(0, 255),
                percentual: numero(linha[1]),
                valor,
                subunidade_texto: nome,
                origem_aba: aba,
            });
        }
    }

    return { itens, ignoradas, cabecalho: idxCusteio >= 0 ? idxCusteio : idxCapital, totais };
}

/**
 * Ponto de entrada: recebe uma aba crua e devolve os itens normalizados.
 * `anoInformado` só é usado quando a aba não traz ano no nome (Orçamento).
 */
function extrairAba(aba, aoa, anoInformado) {
    const { tipo, ano: anoNome, motivo } = classificarAba(aba);
    const ano = anoNome || anoInformado || null;

    if (!tipo) return { aba, tipo: null, ano, motivo, itens: [], ignoradas: 0 };
    if (!Array.isArray(aoa) || aoa.length === 0) {
        return { aba, tipo, ano, motivo: "aba vazia", itens: [], ignoradas: 0 };
    }
    if (tipo !== "naturezas" && tipo !== "apelidos" && !ano) {
        return { aba, tipo, ano: null, motivo: "não foi possível determinar o ano", itens: [], ignoradas: 0 };
    }

    let r;
    if (tipo === "naturezas") r = extrairNaturezas(aoa, aba);
    else if (tipo === "apelidos") r = extrairApelidos(aoa, aba);
    else if (tipo === "orcamento") r = extrairOrcamento(aoa, aba, ano);
    else r = extrairGenerico(aoa, tipo, aba, ano);

    if (r.itens.length === 0 && r.cabecalho === null) {
        return {
            aba, tipo, ano, itens: [], ignoradas: r.ignoradas,
            motivo: "layout não reconhecido (provável tabela dinâmica/pivô — esses números o sistema recalcula)",
        };
    }
    return { aba, tipo, ano, itens: r.itens, ignoradas: r.ignoradas, totais: r.totais };
}

// Chave natural de um item, usada só para detectar abas sobrepostas
const CHAVE = {
    empenhos: (i) => i.num_sie,
    almoxarifado: (i) => i.num_requisicao,
    scdp: (i) => i.pcdp,
    licitacoes: (i) => `${i.solicitacao_sie || ""}|${i.cod_reduzido || ""}|${(i.descricao || "").slice(0, 40)}`,
    transferencias: (i) => i.num_transferencia,
};

/**
 * A planilha mantém o mesmo fato em mais de uma aba: "SIE 2024" é o dump cru
 * do SIE e está inteiramente contido na planilha curada "Empenhos 2024";
 * "Valores SPROJ 2024" idem em relação a "Empenhos SPROJ 2024". Importar as
 * duas dobraria o valor.
 *
 * Aqui, dentro de cada (tipo, ano), marcamos os blocos cujas chaves são
 * subconjunto das de outro bloco maior. O bloco contido entra com
 * `recomendado: false` e o front deixa ele desmarcado.
 */
function detectarSobreposicao(blocos) {
    const grupos = new Map();
    for (const b of blocos) {
        if (!b.tipo || !CHAVE[b.tipo] || b.itens.length === 0) continue;
        const g = `${b.tipo}|${b.ano}`;
        if (!grupos.has(g)) grupos.set(g, []);
        grupos.get(g).push(b);
    }

    for (const lista of grupos.values()) {
        if (lista.length < 2) continue;
        const chaves = new Map(
            lista.map((b) => [b.aba, new Set(b.itens.map(CHAVE[b.tipo]).filter(Boolean))])
        );
        // Do maior para o menor: um bloco menor contido noutro maior é redundante
        const ordenado = [...lista].sort((a, b) => b.itens.length - a.itens.length);
        for (let i = 0; i < ordenado.length; i++) {
            const menor = chaves.get(ordenado[i].aba);
            if (!menor || menor.size === 0) continue;
            for (let j = 0; j < i; j++) {
                if (ordenado[j].contido_em) continue; // não encadeia containment
                const maior = chaves.get(ordenado[j].aba);
                const contido = [...menor].every((k) => maior.has(k));
                if (contido) {
                    ordenado[i].contido_em = ordenado[j].aba;
                    ordenado[i].recomendado = false;
                    break;
                }
            }
        }
    }

    for (const b of blocos) {
        if (b.recomendado === undefined) b.recomendado = Boolean(b.tipo) && b.itens.length > 0;
    }
    return blocos;
}

module.exports = {
    norm, texto, numero, data, booleano, codigoCurto,
    classificarAba, extrairAba, ehEstimativo, detectarSobreposicao,
    TIPOS: Object.keys(MAPAS),
};
