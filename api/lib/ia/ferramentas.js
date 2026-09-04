"use strict";

/**
 * Ferramentas que o assistente pode usar.
 *
 * REGRA DE OURO: nenhuma ferramenta fala com o banco. Toda ferramenta chama
 * uma rota da própria API, por HTTP, **com o token do usuário que está
 * conversando**. Assim o RBAC que já existe (autenticar + autorizar + o
 * recorte por subunidade dentro das rotas) é quem decide o que a IA enxerga.
 *
 * Consequência prática: se um chefe do DSOL pedir "gastos do DZOT", a rota
 * devolve só o DSOL — e não porque o prompt mandou, mas porque o middleware
 * mandou. O modelo não tem como contornar, nem se for induzido a tentar.
 *
 * Só leitura. Nenhuma ferramenta escreve nada (fase 1).
 *
 * Cada resultado é dividido em duas partes:
 *   paraModelo → versão compacta, é o que vira contexto (e custa token)
 *   paraTela   → resultado completo, é o que a interface usa para montar a
 *                tabela e o PDF
 * Essa separação não é só economia: os NÚMEROS que o usuário vê saem do
 * `paraTela`, renderizados pelo front. O modelo comenta, não transcreve —
 * LLM erra ao copiar número, e num sistema financeiro isso é inaceitável.
 */

const logger = require("../logger.js");
const { redigir } = require("./redacao.js");

// Quantas linhas de uma listagem entram no contexto do modelo. O usuário
// continua vendo todas na tabela; o modelo só precisa de amostra + totais.
const LINHAS_PARA_MODELO = 25;

const ANO_ATUAL = () => new Date().getFullYear();

/** Monta a querystring ignorando vazios/nulos */
function query(params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params || {})) {
        if (v === undefined || v === null || v === "") continue;
        qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
}

// Parâmetros repetidos nas listagens detalhadas
const PARAMS_LISTAGEM = {
    ano: { type: "integer", description: "Exercício (ano). Se o usuário não disser, use o mais recente com dados." },
    subunidade_id: { type: "integer", description: "Filtra por subunidade. Os ids vêm de resumo_execucao (campo por_subunidade)." },
    q: { type: "string", description: "Busca livre em descrição, fornecedor, número de documento etc." },
    limit: { type: "integer", description: "Máximo de registros (padrão 300)." },
    ordenar: {
        type: "string", enum: ["data", "valor"],
        description:
            "Ordem do resultado. 'data' (padrão) traz os mais recentes; 'valor' traz os de " +
            "MAIOR valor primeiro. Use 'valor' SEMPRE que a pergunta for sobre 'maiores', " +
            "'principais', 'mais caros' ou 'top' — senão você apresentará os mais recentes " +
            "como se fossem os maiores.",
    },
};

const FERRAMENTAS = [
    {
        nome: "listar_anos",
        descricao:
            "Lista os exercícios (anos) que têm dados de execução orçamentária importados, " +
            "com a quantidade de registros de cada um. Use antes de qualquer outra consulta " +
            "quando o usuário não disser o ano.",
        parametros: { type: "object", properties: {}, required: [] },
        rota: () => "/api/execucao-orcamentaria/anos",
        compactar: (data) => data,
        // Consulta auxiliar: o usuário não quer ver "anos disponíveis" como tabela
        linhas: () => [],
    },

    {
        nome: "resumo_execucao",
        descricao:
            "Panorama do exercício: total aplicado, liquidado, dotação e saldo (custeio e permanente); " +
            "aplicado por subunidade (COM O ID DE CADA UMA — use esses ids para filtrar as outras " +
            "ferramentas); aplicado por tipo de despesa; série mensal; maiores fornecedores; e os " +
            "agregados de diárias/passagens (SCDP) e licitações. " +
            "É a ferramenta certa para perguntas de visão geral, comparação entre departamentos e saldo.",
        parametros: {
            type: "object",
            properties: {
                ano: { type: "integer", description: "Exercício. Padrão: ano corrente." },
                incluir_estimativos: {
                    type: "boolean",
                    description:
                        "Padrão false. Empenhos 'Estimativo - X' são reserva de recurso, não gasto; " +
                        "incluí-los conta em dobro o que já aparece como requisição de almoxarifado " +
                        "ou viagem. Só use true se o usuário pedir explicitamente para ver as reservas.",
                },
            },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/resumo${query({
            ano: a.ano || ANO_ATUAL(),
            incluir_estimativos: a.incluir_estimativos ? "1" : undefined,
        })}`,
        // O resumo completo é grande; o modelo não precisa de tudo
        compactar: (d) => ({
            ano: d.ano,
            escopo_restrito: d.escopo_restrito,
            aviso_escopo: d.escopo_restrito
                ? "O usuário só tem acesso à própria subunidade; os totais abaixo já são só dela."
                : undefined,
            totais: d.totais,
            scdp: d.scdp,
            licitacoes: d.licitacoes,
            por_tipo: d.tipos,
            por_subunidade: (d.por_subunidade || []).map((s) => ({
                subunidade_id: s.subunidade_id,
                sigla: s.sigla,
                nome: s.nome,
                total_aplicado: s.total_aplicado,
                dotacao: s.dotacao_custeio + s.dotacao_capital,
                saldo_total: s.saldo_total,
            })),
            serie_mensal: d.serie_mensal,
            top_fornecedores: (d.top_fornecedores || []).slice(0, 8),
        }),
        // O resumo não é uma listagem, mas tem tabela útil: o quadro por
        // subunidade. Sem isto o modelo dizia "veja a tabela abaixo" e não
        // vinha tabela nenhuma.
        linhas: (d) => (d.por_subunidade || []).map((s) => ({
            subunidade: s.sigla || s.nome,
            aplicado: s.total_aplicado,
            dotacao: s.dotacao_custeio + s.dotacao_capital,
            saldo: s.saldo_total,
        })),
        titulo: "Aplicado por subunidade",
    },

    {
        nome: "listar_empenhos",
        descricao:
            "Empenhos, dispensas e transferências do exercício: data, nº SIE/SIAFI, espécie, tipo de " +
            "despesa, fornecedor, subunidade de entrega, resumo, valor empenhado e liquidado. " +
            "Use para 'o que foi comprado', 'quais empenhos', 'gastos com X fornecedor'.",
        parametros: {
            type: "object",
            properties: {
                ...PARAMS_LISTAGEM,
                tipo: { type: "string", description: "Tipo de despesa exato, ex.: 'Material de Consumo', 'Equipamentos e Material Permanente'." },
                especie: { type: "string", enum: ["Empenho", "Dispensa", "Transferência"] },
                incluir_estimativos: { type: "boolean", description: "Padrão false — ver resumo_execucao." },
            },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/empenhos${query({
            ano: a.ano || ANO_ATUAL(),
            subunidade_id: a.subunidade_id, tipo: a.tipo, especie: a.especie,
            q: a.q, limit: a.limit, ordenar: a.ordenar,
            incluir_estimativos: a.incluir_estimativos ? "1" : undefined,
        })}`,
    },

    {
        nome: "listar_almoxarifado",
        descricao:
            "Requisições de almoxarifado: data, nº da requisição, tipo de movimento (Saída, Entrada e " +
            "Saída Direta, Estorno de Saída), subunidade solicitante, solicitante, local de entrega e valor. " +
            "Use para 'o que o setor pediu no almoxarifado'.",
        parametros: {
            type: "object",
            properties: {
                ...PARAMS_LISTAGEM,
                tipo: { type: "string", description: "Tipo de movimento, ex.: 'Saída', 'Estorno de Saída'." },
            },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/almoxarifado${query({
            ano: a.ano || ANO_ATUAL(), subunidade_id: a.subunidade_id, tipo: a.tipo, q: a.q,
            limit: a.limit, ordenar: a.ordenar,
        })}`,
    },

    {
        nome: "listar_viagens",
        descricao:
            "Viagens do SCDP: PCDP, data, proposto (quem viajou), subunidade de origem, fonte do recurso, " +
            "nº e valor de diárias, passagens aéreas e rodoviárias, período. " +
            "Use para perguntas sobre diárias, passagens e viagens. " +
            "OBS: o CPF vem mascarado por proteção de dado pessoal — não peça nem tente reconstruir.",
        parametros: { type: "object", properties: { ...PARAMS_LISTAGEM }, required: [] },
        rota: (a) => `/api/execucao-orcamentaria/scdp${query({
            ano: a.ano || ANO_ATUAL(), subunidade_id: a.subunidade_id, q: a.q,
            limit: a.limit, ordenar: a.ordenar,
        })}`,
    },

    {
        nome: "listar_licitacoes",
        descricao:
            "Itens de licitação/compra: data, tipo (Biológicos, Químicos, Equipamentos…), subunidade, " +
            "interessado, código reduzido, descrição do item, quantidade, valor unitário e total, DFD/ETP. " +
            "Use para 'o que foi licitado', 'quanto custou o item X'.",
        parametros: {
            type: "object",
            properties: { ...PARAMS_LISTAGEM, tipo: { type: "string", description: "Categoria do item, ex.: 'Biológicos'." } },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/licitacoes${query({
            ano: a.ano || ANO_ATUAL(), subunidade_id: a.subunidade_id, tipo: a.tipo, q: a.q,
            limit: a.limit, ordenar: a.ordenar,
        })}`,
    },

    {
        nome: "listar_transferencias",
        descricao:
            "Transferências de recurso para outras gestoras (Almoxarifado Central, PROINFRA, Imprensa…): " +
            "data, nº, subunidade, gestora de destino, natureza e valor.",
        parametros: {
            type: "object",
            properties: { ...PARAMS_LISTAGEM, tipo: { type: "string", description: "Natureza da despesa." } },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/transferencias${query({
            ano: a.ano || ANO_ATUAL(), subunidade_id: a.subunidade_id, tipo: a.tipo, q: a.q,
            limit: a.limit, ordenar: a.ordenar,
        })}`,
    },

    {
        nome: "somar_por",
        descricao:
            "SOMA os valores agrupando por pessoa, fornecedor, setor ou categoria — e é a única " +
            "forma correta de responder 'quem mais...', 'qual fornecedor mais...', 'qual setor mais...'. " +
            "Ordenar uma listagem NÃO serve para isso: aquilo dá o maior registro isolado, e quem " +
            "aparece várias vezes fica de fora do topo. Devolve, por grupo, o total somado e a " +
            "quantidade de registros; para viagens, também diárias, passagens e nº de diárias.",
        parametros: {
            type: "object",
            properties: {
                fonte: {
                    type: "string",
                    enum: ["empenhos", "almoxarifado", "scdp", "licitacoes", "transferencias"],
                    description: "Onde somar. 'scdp' = viagens e diárias.",
                },
                por: {
                    type: "string",
                    description:
                        "Como agrupar. Válidos por fonte — " +
                        "empenhos: fornecedor, tipo_despesa, especie, natureza, subunidade; " +
                        "almoxarifado: solicitante, tipo_movimento, local_entrega, subunidade; " +
                        "scdp: proposto, solicitante, fonte_recurso, subunidade; " +
                        "licitacoes: tipo, interessado, elaborador_etp, subunidade; " +
                        "transferencias: gestora_destino, tipo_despesa, subunidade.",
                },
                ano: { type: "integer", description: "Exercício. Padrão: ano corrente." },
                subunidade_id: { type: "integer", description: "Restringe a uma subunidade." },
                q: { type: "string", description: "Busca livre antes de somar." },
                limit: { type: "integer", description: "Quantos grupos trazer (padrão 20)." },
            },
            required: ["fonte", "por"],
        },
        rota: (a) => {
            const fonte = ["empenhos", "almoxarifado", "scdp", "licitacoes", "transferencias"].includes(a.fonte)
                ? a.fonte : "empenhos";
            return `/api/execucao-orcamentaria/${fonte}/agrupado${query({
                por: a.por, ano: a.ano || ANO_ATUAL(),
                subunidade_id: a.subunidade_id, q: a.q, limit: a.limit,
            })}`;
        },
        compactar: (d) => ({
            agrupado_por: d.rotulo,
            grupos_no_total: d.total,
            grupos_exibidos: d.exibidos,
            soma_de_todos_os_grupos: d.soma,
            itens: d.itens,
            observacao: d.truncado
                ? `Mostrando os ${d.exibidos} maiores de ${d.total} grupos. A soma acima é de TODOS.`
                : undefined,
        }),
        linhas: (d) => d?.itens || [],
        titulo: "Totais agrupados",
    },

    {
        nome: "listar_dotacoes",
        descricao:
            "Distribuição do orçamento do exercício: por programa/ação (custeio) e por departamento " +
            "(permanente), com percentual, valor e subunidade responsável. " +
            "Use para 'quanto foi destinado a', 'qual a previsão', 'como o orçamento foi dividido'.",
        parametros: {
            type: "object",
            properties: { ano: { type: "integer", description: "Exercício. Padrão: ano corrente." } },
            required: [],
        },
        rota: (a) => `/api/execucao-orcamentaria/dotacoes${query({ ano: a.ano || ANO_ATUAL() })}`,
        // Esta rota devolve o array direto, não { itens: [...] }
        compactar: (d) => (Array.isArray(d) ? { total_de_registros: d.length, itens: d } : d),
        linhas: (d) => (Array.isArray(d) ? d : []),
    },
];

// ═══════════════════════════════════════════════════════════════════════
// Salas, agenda, manutenção e patrimônio
// Dado institucional; o RBAC de cada rota continua sendo quem decide.
// ═══════════════════════════════════════════════════════════════════════

FERRAMENTAS.push(
    {
        nome: "listar_salas",
        descricao:
            "Salas cadastradas: identificação, prédio, subunidade, tipo, capacidade (lugares), " +
            "dimensões, se é agendável e se está fora do ensalamento automático. " +
            "Use para 'quais salas existem', 'qual a capacidade da sala X', 'salas do prédio Y'.",
        parametros: { type: "object", properties: {}, required: [] },
        rota: () => "/api/salas",
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : [], total: (d || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : []),
        titulo: "Salas",
    },

    {
        nome: "salas_disponiveis",
        descricao:
            "Salas AGENDÁVEIS e LIVRES num horário, já descontando aulas e reservas existentes. " +
            "Responde 'tem sala livre na quinta de manhã para 40 pessoas?'. " +
            "Informe dia_semana (0=domingo … 6=sábado), hora_inicio e hora_fim em HH:MM, e " +
            "opcionalmente quantas vagas precisa. Auditórios e salas de agendamento manual " +
            "ficam fora por regra do ensalamento.",
        parametros: {
            type: "object",
            properties: {
                dia_semana: { type: "integer", minimum: 0, maximum: 6, description: "0=domingo, 1=segunda … 6=sábado." },
                hora_inicio: { type: "string", description: "HH:MM, ex.: '08:30'." },
                hora_fim: { type: "string", description: "HH:MM, ex.: '10:10'." },
                vagas: { type: "integer", description: "Quantas pessoas precisam caber." },
                predio_id: { type: "integer", description: "Restringe a um prédio." },
                data_inicio: { type: "string", description: "Início do período a considerar (AAAA-MM-DD). Se omitir, usa os próximos 30 dias a partir de hoje." },
                data_fim: { type: "string", description: "Fim do período (AAAA-MM-DD)." },
            },
            required: ["dia_semana", "hora_inicio", "hora_fim"],
        },
        // A rota exige um período (para saber contra quais ocorrências checar).
        // Quem pergunta "tem sala livre quinta de manhã?" não pensa nisso, então
        // assumimos os próximos 30 dias — o modelo só informa datas se a
        // pergunta trouxer um período específico.
        rota: (a) => {
            const hoje = new Date();
            const daqui30 = new Date(hoje.getTime() + 30 * 86400000);
            const iso = (d) => d.toISOString().slice(0, 10);
            return `/api/salas/disponiveis${query({
                dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
                vagas: a.vagas, predio_id: a.predio_id,
                data_inicio: a.data_inicio || iso(hoje),
                data_fim: a.data_fim || iso(daqui30),
            })}`;
        },
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : (d?.itens || []), total: (Array.isArray(d) ? d : d?.itens || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : d?.itens || []),
        titulo: "Salas livres no horário",
    },

    {
        nome: "agenda_de_salas",
        descricao:
            "O que está marcado nas salas num período: aulas e reservas, com sala, motivo, " +
            "solicitante e horário. Use para 'o que tem marcado na sala X essa semana', " +
            "'quais reservas existem em outubro'.",
        parametros: {
            type: "object",
            properties: {
                inicio: { type: "string", description: "Data inicial AAAA-MM-DD." },
                fim: { type: "string", description: "Data final AAAA-MM-DD." },
                sala_id: { type: "integer", description: "Restringe a uma sala (id vem de listar_salas)." },
                incluir_pendentes: { type: "boolean", description: "Inclui solicitações ainda não aprovadas." },
            },
            required: ["inicio", "fim"],
        },
        rota: (a) => `/api/agendamentos/visao/calendario${query({
            inicio: a.inicio, fim: a.fim, sala_id: a.sala_id,
            incluir_pendentes: a.incluir_pendentes ? "1" : undefined,
        })}`,
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : (d?.itens || []), total: (Array.isArray(d) ? d : d?.itens || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : d?.itens || []),
        titulo: "Agenda das salas",
    },

    {
        nome: "listar_manutencoes",
        descricao:
            "Chamados de manutenção: sala, categoria, descrição, prioridade, situação " +
            "(aberta, em_andamento, concluida, cancelada), quem registrou e quando concluiu. " +
            "Use para 'quais chamados estão abertos', 'a sala X tem problema registrado'.",
        parametros: {
            type: "object",
            properties: {
                status: { type: "string", enum: ["aberta", "em_andamento", "concluida", "cancelada"] },
                sala_id: { type: "integer", description: "Restringe a uma sala." },
            },
            required: [],
        },
        rota: (a) => `/api/manutencao${query({ status: a.status, sala_id: a.sala_id })}`,
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : (d?.itens || []), total: (Array.isArray(d) ? d : d?.itens || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : d?.itens || []),
        titulo: "Chamados de manutenção",
    },

    {
        nome: "patrimonio_por_sala",
        descricao:
            "Quantos bens patrimoniais estão cadastrados em cada sala (com prédio e subunidade). " +
            "Use para 'quantos bens tem na sala X', 'quais salas já foram levantadas'.",
        parametros: { type: "object", properties: {}, required: [] },
        rota: () => "/api/patrimonio/salas",
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : [], total: (d || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : []),
        titulo: "Bens por sala",
    },

    // ═══════════════════════════════════════════════════════════════════
    // Servidores
    // WhatsApp e data de nascimento NÃO chegam ao modelo — some em
    // lib/ia/redacao.js, na fronteira. Aqui só se descreve o que sobra.
    // ═══════════════════════════════════════════════════════════════════
    {
        nome: "listar_servidores",
        descricao:
            "Servidores cadastrados: nome, SIAPE, e-mail institucional, subunidade e nível de " +
            "permissão. Use para 'quem trabalha no Departamento de Solos', 'qual o e-mail do " +
            "fulano', 'quem é chefe de tal setor'. " +
            "Telefone e data de nascimento não estão disponíveis, por proteção de dado pessoal — " +
            "se pedirem, explique isso sem rodeios. " +
            "Restrito a chefe ou superior, e o chefe só enxerga a própria subunidade.",
        parametros: { type: "object", properties: {}, required: [] },
        rota: () => "/api/usuarios",
        compactar: (d) => compactarListagem({ itens: Array.isArray(d) ? d : [], total: (d || []).length }),
        linhas: (d) => (Array.isArray(d) ? d : []),
        titulo: "Servidores",
    },

    {
        nome: "aniversariantes",
        descricao:
            "Aniversariantes do mês: nome, dia e subunidade — o mesmo mural que a plataforma já " +
            "mostra internamente. Só dia e mês; o ano de nascimento não é exposto. " +
            "Use para 'quem faz aniversário esse mês', 'tem aniversário essa semana'.",
        parametros: {
            type: "object",
            properties: { mes: { type: "integer", minimum: 1, maximum: 12, description: "Mês. Padrão: mês atual." } },
            required: [],
        },
        rota: (a) => `/api/aniversariantes${query({ mes: a.mes || new Date().getMonth() + 1 })}`,
        compactar: (d) => ({ mes: d?.mes, total: (d?.aniversariantes || []).length, itens: d?.aniversariantes || [] }),
        linhas: (d) => d?.aniversariantes || [],
        titulo: "Aniversariantes do mês",
    }
);

const POR_NOME = new Map(FERRAMENTAS.map((f) => [f.nome, f]));

/**
 * Parâmetros de APRESENTAÇÃO, injetados em toda ferramenta.
 *
 * A tabela deixou de ser automática: aparecia embaixo de qualquer resposta,
 * inclusive quando a pergunta era só "quanto deu o total?". Agora o modelo
 * decide — e, quando o usuário pede campos específicos, pede só aqueles.
 *
 * Ficam aqui, num lugar só, em vez de repetidos em 17 ferramentas.
 */
const PARAMS_APRESENTACAO = {
    exibir_tabela: {
        type: "boolean",
        description:
            "Se true, os registros aparecem como TABELA abaixo da sua resposta. " +
            "Use APENAS quando o usuário pedir para ver/listar/detalhar os registros " +
            "('mostre', 'liste', 'quero ver', 'em tabela', 'detalhe'). " +
            "Para perguntas de número fechado ('quanto foi', 'qual o total', 'quem mais gastou') " +
            "deixe false: a resposta em texto basta e a tabela só polui.",
    },
    colunas: {
        type: "array",
        items: { type: "string" },
        description:
            "Quais campos mostrar na tabela, nos nomes usados pelos dados (ex.: " +
            "['data','fornecedor','valor_empenhado']). Só faz sentido com exibir_tabela=true. " +
            "Se o usuário disse quais informações quer, passe exatamente essas. " +
            "Omita para mostrar todos os campos.",
    },
};

/** Formato que a API da OpenAI espera em `tools` */
function esquemaOpenAI() {
    return FERRAMENTAS.map((f) => ({
        type: "function",
        function: {
            name: f.nome,
            description: f.descricao,
            parameters: {
                ...f.parametros,
                properties: { ...(f.parametros.properties || {}), ...PARAMS_APRESENTACAO },
            },
        },
    }));
}

/**
 * Reduz as linhas às colunas pedidas. Casa sem diferenciar maiúscula/acento e
 * aceita o rótulo amigável além do nome do campo. Se nada casar, devolve tudo —
 * uma tabela com colunas demais é melhor que uma tabela vazia.
 */
function selecionarColunas(linhas, colunas) {
    if (!Array.isArray(linhas) || linhas.length === 0) return linhas;
    if (!Array.isArray(colunas) || colunas.length === 0) return linhas;

    const simplificar = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]/g, "");

    const disponiveis = Object.keys(linhas[0]);
    const mapa = new Map(disponiveis.map((c) => [simplificar(c), c]));
    const escolhidas = [];
    for (const pedida of colunas) {
        const alvo = mapa.get(simplificar(pedida));
        if (alvo && !escolhidas.includes(alvo)) escolhidas.push(alvo);
    }
    if (escolhidas.length === 0) return linhas;

    return linhas.map((linha) => {
        const nova = {};
        for (const c of escolhidas) nova[c] = linha[c];
        return nova;
    });
}

/**
 * Compacta uma listagem: o modelo recebe amostra + agregados, a tela recebe tudo.
 * Sem isso, 595 itens de licitação viram dezenas de milhares de tokens por pergunta.
 */
function compactarListagem(data) {
    if (!data || !Array.isArray(data.itens)) return data;
    return {
        total_de_registros: data.total,
        soma_dos_valores: data.soma,
        truncado_na_consulta: data.truncado || false,
        amostra_dos_primeiros: data.itens.slice(0, LINHAS_PARA_MODELO),
        observacao: data.itens.length > LINHAS_PARA_MODELO
            ? `Mostrando ${LINHAS_PARA_MODELO} de ${data.itens.length} registros carregados. ` +
              "O total e a soma acima consideram TODOS os registros — use-os para responder, " +
              "não some a amostra. A tabela completa já está sendo exibida ao usuário."
            : undefined,
    };
}

/**
 * Executa uma ferramenta chamando a própria API com o token do usuário.
 *
 * @param {string} nome
 * @param {object} argumentos  vindos do modelo — tratados como não confiáveis
 * @param {object} ctx  { baseUrl, token }
 * @returns {Promise<{ok, paraModelo, paraTela, rota, erro?}>}
 */
async function executar(nome, argumentos, ctx) {
    const ferramenta = POR_NOME.get(nome);
    if (!ferramenta) {
        return { ok: false, erro: `Ferramenta desconhecida: ${nome}`, paraModelo: { erro: "ferramenta inexistente" } };
    }

    let rota;
    try {
        rota = ferramenta.rota(argumentos || {});
    } catch (error) {
        return { ok: false, erro: "Argumentos inválidos", paraModelo: { erro: "argumentos inválidos" }, rota: null };
    }

    try {
        const resposta = await fetch(`${ctx.baseUrl}${rota}`, {
            headers: { Authorization: `Bearer ${ctx.token}` },
        });
        const corpo = await resposta.json().catch(() => null);

        if (!resposta.ok) {
            // 403 aqui é o RBAC funcionando — devolvemos ao modelo como texto
            // para ele explicar ao usuário, nunca como algo a contornar.
            const motivo = corpo?.message || `HTTP ${resposta.status}`;
            return {
                ok: false, rota, erro: motivo,
                paraModelo: {
                    erro: motivo,
                    orientacao: resposta.status === 403
                        ? "O usuário não tem permissão para esses dados. Explique isso a ele com naturalidade, sem sugerir formas de contornar."
                        : "Informe que não foi possível obter os dados.",
                },
            };
        }

        const dados = corpo?.data ?? null;
        const seguro = redigir(dados);
        const compacto = ferramenta.compactar ? ferramenta.compactar(seguro) : compactarListagem(seguro);
        // Linhas da tabela que a tela vai montar. Por padrão é uma listagem
        // ({itens}); ferramentas com formato próprio declaram `linhas`.
        const brutas = ferramenta.linhas
            ? ferramenta.linhas(seguro)
            : (Array.isArray(seguro?.itens) ? seguro.itens : []);
        // Colunas pedidas pelo usuário (via modelo); sem isso, todas.
        const linhas = selecionarColunas(brutas, argumentos?.colunas);

        return {
            ok: true, rota,
            paraModelo: compacto,
            paraTela: seguro,
            linhas,
            // Quem decide se a tabela aparece é a pergunta do usuário, traduzida
            // pelo modelo neste parâmetro — não o simples fato de haver linhas.
            exibirTabela: argumentos?.exibir_tabela === true,
            titulo: ferramenta.titulo || null,
            total: seguro?.total ?? brutas.length,
            soma: seguro?.soma,
        };
    } catch (error) {
        logger.error({ err: error, ferramenta: nome }, "Falha ao executar ferramenta do assistente");
        return {
            ok: false, rota, erro: error.message,
            paraModelo: { erro: "falha ao consultar a plataforma" },
        };
    }
}

module.exports = { FERRAMENTAS, esquemaOpenAI, executar, LINHAS_PARA_MODELO };
