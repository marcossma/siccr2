/**
 * <assistente-ia> — chat com o assistente do SICCR.
 *
 * Dois modos, mesmo componente (para não haver duas implementações do chat):
 *   <assistente-ia>               → botão flutuante no canto, abre um painel
 *   <assistente-ia modo="pagina"> → embutido, ocupa a área da página /assistente
 *
 * Light DOM, sem Shadow DOM (convenção do projeto).
 *
 * PRINCÍPIO IMPORTANTE: o texto do modelo é narrativa; os NÚMEROS que o usuário
 * vê saem de `blocos[].itens`, que é o dado cru devolvido pelas rotas da
 * plataforma — renderizado aqui, deterministicamente. O modelo comenta, não
 * transcreve. LLM erra ao copiar número, e isto é um sistema financeiro.
 */

const API = `${window.location.origin}/api`;

// Rótulos amigáveis por chave. O que não estiver aqui vira título a partir da
// própria chave (created_at → "Created at" fica feio, mas não quebra).
const ROTULOS = {
    data: "Data", ano: "Ano", num_sie: "Nº SIE", num_siafi: "SIAFI",
    especie: "Espécie", cod_natureza: "Cód. natureza", tipo_despesa: "Tipo de despesa",
    fornecedor: "Fornecedor", resumo: "Resumo", valor_empenhado: "Empenhado",
    valor_liquidado: "Liquidado", processo: "Processo", subunidade_texto: "Subunidade",
    subunidade_sigla: "Sigla", num_requisicao: "Requisição", tipo_movimento: "Movimento",
    solicitante: "Solicitante", local_entrega: "Local de entrega", situacao: "Situação",
    valor_total: "Valor", observacao: "Observação", pcdp: "PCDP", proposto: "Proposto",
    fonte_recurso: "Fonte", num_diarias: "Nº diárias", valor_diarias: "Diárias",
    valor_passagens_aereas: "Passagens aéreas", valor_passagens_rodoviarias: "Passagens rodoviárias",
    periodo_viagem: "Período", tipo: "Tipo", interessado: "Interessado",
    cod_reduzido: "Cód. reduzido", descricao: "Descrição", unidades: "Qtd",
    valor_unitario: "Valor unit.", dfd: "DFD", etp: "ETP", solicitacao_sie: "Solicitação SIE",
    num_transferencia: "Nº transf.", gestora_destino: "Gestora destino", valor: "Valor",
    categoria: "Categoria", grupo: "Grupo", programa: "Programa / ação", percentual: "%",
    origem: "Origem", cpf: "CPF", grupo_tipo: "Grupo/tipo", usuario_sie: "Usuário SIE",
    elaborador_etp: "Elaborador ETP", contado_em_outra_guia: "Contado em outra guia",
    subunidade: "Subunidade", aplicado: "Aplicado", dotacao: "Dotação", saldo: "Saldo",
    registros: "Registros", quantidade: "Qtd.", diarias: "Diárias", passagens: "Passagens",
    natureza: "Natureza",
    sala_nome: "Sala", predio_nome: "Prédio", sala_capacidade: "Capacidade", total_bens: "Bens",
    tipo_nome: "Categoria", prioridade: "Prioridade", status: "Situação", created_by_nome: "Registrado por",
    concluido_por_nome: "Concluído por", cabe: "Cabe", folga: "Folga", dia: "Dia", dia_mes: "Data",
    email: "E-mail", siape: "SIAPE", permissao: "Permissão", subunidade_nome: "Subunidade",
    is_agendavel: "Agendável", motivo: "Motivo", hora_inicio: "Início", hora_fim: "Fim",
    predio: "Prédio", predio_descricao: "Descrição do prédio", sala_descricao: "Descrição",
    sala_tipo_nome: "Tipo", sala_largura: "Largura (m)", sala_comprimento: "Comprimento (m)",
    sala_altura: "Altura (m)", agendamento_manual: "Só agendamento manual",
    presta_servicos_externos: "Serviços externos",
};

// Chaves técnicas que não interessam a quem lê a tabela (ids de relacionamento)
const OCULTAS_EXTRA = [
    "id", "id_dotacao", "sala_id", "predio_id", "subunidade_id", "sala_tipo_id",
    "unidade_id", "created_by_user_id", "user_id", "id_manutencao", "tipo_id",
];

// Colunas que nunca precisam aparecer na tabela (definida logo abaixo dos rótulos)
const OCULTAS = new Set(OCULTAS_EXTRA);

const TITULO_BLOCO = {
    listar_empenhos: "Empenhos", listar_almoxarifado: "Requisições de almoxarifado",
    listar_viagens: "Viagens e diárias", listar_licitacoes: "Itens de licitação",
    listar_transferencias: "Transferências de recurso", listar_dotacoes: "Orçamento",
    somar_por: "Totais agrupados", listar_salas: "Salas",
    salas_disponiveis: "Salas livres", agenda_de_salas: "Agenda",
    listar_manutencoes: "Manutenção", patrimonio_por_sala: "Bens por sala",
    listar_servidores: "Servidores", aniversariantes: "Aniversariantes",
};

// Campos monetários. Cuidado com o prefixo: "total" sozinho é dinheiro, mas
// "total_bens" é uma CONTAGEM — com /^total/ os 12 bens de uma sala viravam
// "R$ 12,00".
const CAMPOS_MOEDA = new Set(["soma", "total", "aplicado", "dotacao", "saldo", "diarias", "passagens"]);
// Colunas 0/1 que o banco guarda como inteiro
const CAMPOS_FLAG = new Set(["is_agendavel", "agendamento_manual", "presta_servicos_externos", "estimativo", "cabe"]);
const ehMoeda = (k) => /^valor/.test(k) || CAMPOS_MOEDA.has(k);

function brl(n) {
    return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarCelula(chave, valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (chave === "origem") {
        return valor === "manual"
            ? '<span class="ia-badge">manual</span>'
            : "importado";
    }
    if (chave === "contado_em_outra_guia") return valor ? "Sim" : "Não";
    // Flags do banco vêm como 0/1 e não dizem nada a quem lê
    if (CAMPOS_FLAG.has(chave)) return Number(valor) ? "Sim" : "Não";
    if (chave === "percentual") return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    if (ehMoeda(chave)) return brl(valor);
    if (chave === "data" && /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
        return String(valor).slice(0, 10).split("-").reverse().join("/");
    }
    return escapar(String(valor));
}

// Todo texto que vem do banco/modelo passa por aqui antes de ir ao DOM
function escapar(s) {
    return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Markdown mínimo: negrito, itálico, quebra de linha e lista. Nada de HTML do modelo. */
function textoParaHtml(txt) {
    const seguro = escapar(txt || "");
    return seguro
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
        .replace(/^[-•]\s+(.*)$/gm, "<li>$1</li>")
        .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>");
}

class AssistenteIA extends HTMLElement {
    connectedCallback() {
        this.modoPagina = this.getAttribute("modo") === "pagina";
        this.conversaId = null;
        this.ocupado = false;
        this.contadorBloco = 0;

        const logado = Boolean(localStorage.getItem("siccr_token"));
        if (!logado) return; // assistente é só para quem está logado

        this.render();
        this.verificarStatus();
    }

    render() {
        const painel = `
            <div class="ia-painel" ${this.modoPagina ? "" : "hidden"}>
                <div class="ia-cabecalho">
                    <div>
                        <strong>Assistente do SICCR</strong>
                        <div class="ia-sub">Orçamento, salas e servidores</div>
                    </div>
                    <div class="ia-acoes-topo">
                        <button type="button" class="ia-btn-icone" data-acao="nova" title="Nova conversa">✚</button>
                        ${this.modoPagina ? "" : '<button type="button" class="ia-btn-icone" data-acao="fechar" title="Fechar">✕</button>'}
                    </div>
                </div>
                <div class="ia-mensagens" role="log" aria-live="polite"></div>
                <form class="ia-entrada">
                    <textarea rows="1" placeholder="Pergunte em português…"
                              aria-label="Sua pergunta"></textarea>
                    <button type="submit" class="ia-enviar" title="Enviar">Enviar</button>
                </form>
                <div class="ia-rodape">
                    As respostas vêm dos dados do sistema e respeitam suas permissões.
                    Confira os números na tabela antes de usar em documento oficial.
                </div>
            </div>`;

        this.innerHTML = this.modoPagina
            ? painel
            : `<button type="button" class="ia-flutuante" title="Assistente do SICCR" aria-label="Abrir assistente">
                   <span aria-hidden="true">✦</span>
               </button>${painel}`;

        this.painel = this.querySelector(".ia-painel");
        this.lista = this.querySelector(".ia-mensagens");
        this.form = this.querySelector(".ia-entrada");
        this.campo = this.querySelector("textarea");

        this.form.addEventListener("submit", (e) => { e.preventDefault(); this.enviar(); });

        // Enter envia, Shift+Enter quebra linha
        this.campo.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.enviar(); }
        });
        // Cresce com o conteúdo, até um limite
        this.campo.addEventListener("input", () => {
            this.campo.style.height = "auto";
            this.campo.style.height = `${Math.min(this.campo.scrollHeight, 120)}px`;
        });

        this.addEventListener("click", (e) => {
            const acao = e.target.closest("[data-acao]")?.dataset.acao;
            if (acao === "fechar") this.alternar(false);
            if (acao === "nova") this.novaConversa();
            if (acao === "imprimir") this.imprimirBloco(e.target.closest("[data-bloco]"));
            if (acao === "enviar-email") this.enviarEmailBloco(e.target.closest("[data-email]"));
            if (acao === "cancelar-email") e.target.closest("[data-email]")?.remove();
            if (acao === "excel") {
                const el = e.target.closest("[data-bloco]");
                const dados = this._blocos?.get(el?.dataset.bloco);
                if (dados) this.baixarExcel(dados);
            }
        });

        const botao = this.querySelector(".ia-flutuante");
        if (botao) botao.addEventListener("click", () => this.alternar(this.painel.hidden));
    }

    /**
     * Descobre se o assistente pode ser usado — e, quando não pode, diz o
     * motivo CERTO. Antes qualquer falha (sessão expirada, rede fora, servidor
     * reiniciando) acusava falta da chave da OpenAI, mandando o usuário atrás
     * do problema errado.
     */
    async verificarStatus() {
        this.habilitado = false;
        let motivo = "indisponivel";
        try {
            const r = await fetch(`${API}/assistente/status`);
            if (r.status === 401 || r.status === 403) {
                motivo = "sessao";
            } else if (!r.ok) {
                motivo = "servidor";
            } else {
                const resp = await r.json();
                this.habilitado = Boolean(resp.data?.habilitado);
                motivo = this.habilitado ? null : "sem_chave";
            }
        } catch {
            motivo = "rede";
        }

        if (this.habilitado) {
            if (this.lista.children.length === 0) this.adicionarBoasVindas();
            return;
        }

        const MENSAGENS = {
            sessao: "Sua sessão expirou. Entre novamente para usar o assistente.",
            sem_chave: "O assistente ainda não está configurado neste servidor. " +
                       "Peça ao administrador para cadastrar a chave da OpenAI.",
            servidor: "O servidor não respondeu à verificação do assistente. Recarregue a página em instantes.",
            rede: "Não foi possível falar com o servidor. Verifique sua conexão e recarregue a página.",
            indisponivel: "O assistente está indisponível no momento.",
        };
        this.adicionarAviso(MENSAGENS[motivo] || MENSAGENS.indisponivel);
        this.form.querySelector("button").disabled = true;
        this.campo.disabled = true;
    }

    alternar(abrir) {
        this.painel.hidden = !abrir;
        if (abrir) this.campo.focus();
    }

    novaConversa() {
        this.conversaId = null;
        this.lista.innerHTML = "";
        if (this.habilitado) this.adicionarBoasVindas();
        this.campo.focus();
    }

    adicionarBoasVindas() {
        const exemplos = [
            "Quanto o Departamento de Solos gastou em 2026?",
            "Quais os maiores fornecedores do centro este ano?",
            "Tem sala livre na quinta de manhã para 40 pessoas?",
            "Quais chamados de manutenção estão abertos?",
            "Quem faz aniversário este mês?",
        ];
        const div = document.createElement("div");
        div.className = "ia-msg ia-msg--assistente ia-boasvindas";
        div.innerHTML =
            `<p>Olá! Posso consultar o <strong>orçamento</strong> do centro, as <strong>salas</strong> ` +
            `(disponibilidade, manutenção, patrimônio) e os <strong>servidores</strong>. Pergunte do seu jeito.</p>` +
            `<div class="ia-exemplos">${exemplos
                .map((e) => `<button type="button" class="ia-exemplo">${escapar(e)}</button>`)
                .join("")}</div>`;
        this.lista.appendChild(div);
        div.querySelectorAll(".ia-exemplo").forEach((b) =>
            b.addEventListener("click", () => { this.campo.value = b.textContent; this.enviar(); })
        );
    }

    /**
     * Reabre uma conversa gravada (usada pela lista lateral de /assistente).
     * As tabelas não são regravadas no banco — só o texto — então ao reabrir
     * o usuário vê a conversa, e uma nova pergunta traz dados novos.
     */
    async abrirConversa(id) {
        try {
            const r = await fetch(`${API}/assistente/conversas/${id}`);
            const resp = await r.json();
            if (!r.ok) return;
            this.conversaId = id;
            this.lista.innerHTML = "";
            for (const m of resp.data || []) {
                if (!m.conteudo) continue;
                const papel = m.papel === "usuario" ? "usuario" : "assistente";
                const corpo = papel === "usuario"
                    ? `<p>${escapar(m.conteudo)}</p>`
                    : `<p>${textoParaHtml(m.conteudo)}</p>`;
                this.adicionarMensagem(papel, corpo);
            }
            this.adicionarAviso("Conversa anterior. As tabelas não ficam salvas — pergunte de novo para vê-las.");
            this.lista.scrollTop = this.lista.scrollHeight;
            if (!this.modoPagina) this.alternar(true);
        } catch (err) {
            console.error("Erro ao abrir conversa:", err);
        }
    }

    adicionarAviso(texto) {
        const div = document.createElement("div");
        div.className = "ia-aviso";
        div.textContent = texto;
        this.lista.appendChild(div);
    }

    adicionarMensagem(papel, html) {
        const div = document.createElement("div");
        div.className = `ia-msg ia-msg--${papel}`;
        div.innerHTML = html;
        this.lista.appendChild(div);
        this.lista.scrollTop = this.lista.scrollHeight;
        return div;
    }

    async enviar() {
        const pergunta = this.campo.value.trim();
        if (!pergunta || this.ocupado || !this.habilitado) return;

        this.querySelector(".ia-boasvindas")?.remove();
        this.adicionarMensagem("usuario", `<p>${escapar(pergunta)}</p>`);
        this.campo.value = "";
        this.campo.style.height = "auto";

        this.ocupado = true;
        const pensando = this.adicionarMensagem("assistente", `<p class="ia-pensando">Consultando os dados…</p>`);

        try {
            const r = await fetch(`${API}/assistente/conversar`, {
                method: "POST",
                body: JSON.stringify({ pergunta, conversa_id: this.conversaId }),
            });
            const resp = await r.json();
            pensando.remove();

            if (!r.ok) {
                this.adicionarMensagem("assistente", `<p class="ia-erro">${escapar(resp.message || "Não consegui responder.")}</p>`);
                return;
            }

            const d = resp.data;
            const eraNova = !this.conversaId;
            this.conversaId = d.conversa_id;
            if (eraNova) {
                window.dispatchEvent(new CustomEvent("siccr:assistente_conversa_nova", { detail: { id: d.conversa_id } }));
            }

            let html = `<p>${textoParaHtml(d.resposta)}</p>`;
            for (const bloco of d.blocos || []) html += this.montarTabela(bloco);
            if (d.ferramentas?.length) html += this.montarAvisos(d.ferramentas);
            const mensagem = this.adicionarMensagem("assistente", html);

            // O usuário pediu um arquivo: entrega sem exigir mais um clique.
            // Os botões continuam na tabela caso o download seja bloqueado.
            for (const bloco of d.blocos || []) {
                if (bloco.exportar === "excel") {
                    this.baixarExcel(bloco);
                } else if (bloco.exportar === "pdf" && bloco.__id) {
                    const alvo = mensagem.querySelector(`[data-bloco="${bloco.__id}"]`);
                    if (alvo) setTimeout(() => this.imprimirBloco(alvo), 250);
                }
            }
        } catch (err) {
            console.error("Erro no assistente:", err);
            pensando.remove();
            this.adicionarMensagem("assistente", `<p class="ia-erro">Erro de comunicação com o servidor.</p>`);
        } finally {
            this.ocupado = false;
            this.lista.scrollTop = this.lista.scrollHeight;
        }
    }

    /** Tabela montada a partir do dado cru da API — nunca do texto do modelo */
    montarTabela(bloco) {
        const itens = bloco.itens || [];
        if (itens.length === 0) return "";
        const id = `bloco-${++this.contadorBloco}`;
        // Guarda o dado para os botões de exportação (o DOM já perdeu os tipos)
        // e marca o bloco com o id do elemento, para o disparo automático saber
        // exatamente qual tabela imprimir quando houver mais de uma.
        this._blocos = this._blocos || new Map();
        this._blocos.set(id, bloco);
        bloco.__id = id;

        const chaves = Object.keys(itens[0]).filter((k) => !OCULTAS.has(k));
        const cabecalho = chaves.map((k) => `<th${ehMoeda(k) ? ' class="num"' : ""}>${escapar(ROTULOS[k] || k)}</th>`).join("");
        const corpo = itens.map((it) =>
            `<tr>${chaves.map((k) =>
                `<td${ehMoeda(k) ? ' class="num"' : ""}>${formatarCelula(k, it[k])}</td>`
            ).join("")}</tr>`
        ).join("");

        const titulo = bloco.titulo || TITULO_BLOCO[bloco.ferramenta] || "Resultado";
        const resumo = bloco.total !== undefined
            ? `${bloco.total} registro(s)${bloco.soma !== undefined ? ` · ${brl(bloco.soma)}` : ""}`
            : `${itens.length} registro(s)`;

        return `
            <div class="ia-bloco" data-bloco="${id}" id="${id}">
                <div class="ia-bloco-topo">
                    <strong>${escapar(titulo)}</strong>
                    <span class="ia-bloco-resumo">${escapar(resumo)}</span>
                    <button type="button" class="ia-btn-mini" data-acao="excel">📊 Excel</button>
                    <button type="button" class="ia-btn-mini" data-acao="imprimir">🖨 PDF</button>
                </div>
                <div class="ia-bloco-tabela"><table>
                    <thead><tr>${cabecalho}</tr></thead>
                    <tbody>${corpo}</tbody>
                </table></div>
                ${itens.length < (bloco.total || 0)
                    ? `<div class="ia-bloco-nota">Exibindo ${itens.length} de ${bloco.total}. Os totais acima consideram todos.</div>`
                    : ""}
                ${bloco.emailProposto ? this.montarConfirmacaoEmail(bloco, id) : ""}
            </div>`;
    }

    /**
     * Carrega o SheetJS só quando alguém pede Excel.
     *
     * Mesma versão fixada que a tela de importação já usa — não é dependência
     * nova, e carregar sob demanda evita somar ~900 KB a toda página do sistema
     * só porque o widget do assistente está presente nelas.
     */
    async carregarSheetJS() {
        if (window.XLSX) return window.XLSX;
        if (!this._sheetjs) {
            this._sheetjs = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
                script.onload = () => resolve(window.XLSX);
                script.onerror = () => reject(new Error("falha ao carregar o gerador de planilha"));
                document.head.appendChild(script);
            });
        }
        return this._sheetjs;
    }

    /**
     * Excel a partir do dado cru da tabela.
     *
     * Números continuam números e datas viram Date — senão a planilha chega
     * toda como texto e o usuário não consegue somar nem ordenar, que é
     * justamente o motivo de pedir Excel em vez de PDF.
     */
    /** Monta o workbook a partir do bloco (usado pelo download e pelo anexo do e-mail) */
    async montarPlanilha(bloco) {
        const itens = bloco?.itens || [];
        if (itens.length === 0) return null;
        const XLSX = await this.carregarSheetJS();

        const ehDataIso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
        // DECIMAL do Postgres chega como string ("1234.56"); vira numero
        const ehNumeroTexto = (v) => typeof v === "string" && v !== "" && /^-?\d+(\.\d+)?$/.test(v);

        const linhas = itens.map((item) => {
            const linha = {};
            for (const [chave, valor] of Object.entries(item)) {
                if (OCULTAS.has(chave)) continue;
                const rotulo = ROTULOS[chave] || chave;
                if (valor === null || valor === undefined) linha[rotulo] = "";
                else if (ehDataIso(valor)) linha[rotulo] = new Date(valor.slice(0, 10) + "T12:00:00");
                else if (ehNumeroTexto(valor)) linha[rotulo] = Number(valor);
                else linha[rotulo] = valor;
            }
            return linha;
        });

        const planilha = XLSX.utils.json_to_sheet(linhas, { cellDates: true });
        const cabecalhos = Object.keys(linhas[0]);
        planilha["!cols"] = cabecalhos.map((c) => {
            const maior = Math.max(c.length, ...linhas.slice(0, 200).map((l) => String(l[c] === null || l[c] === undefined ? "" : l[c]).length));
            return { wch: Math.min(Math.max(maior + 2, 10), 60) };
        });

        const livro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(livro, planilha, "Dados");
        return { XLSX, livro };
    }

    /**
     * Excel a partir do dado cru da tabela.
     *
     * Numeros continuam numeros e datas viram Date — senao a planilha chega
     * toda como texto e o usuario nao consegue somar nem ordenar, que e
     * justamente o motivo de pedir Excel em vez de PDF.
     */
    async baixarExcel(bloco) {
        let montado;
        try {
            montado = await this.montarPlanilha(bloco);
        } catch {
            this.adicionarAviso("Nao foi possivel carregar o gerador de planilha. Verifique sua conexao e tente de novo.");
            return;
        }
        if (!montado) return;
        montado.XLSX.writeFile(montado.livro, this.nomeArquivo(bloco, "xlsx"));
    }

    /**
     * Linhas prontas para o corpo do e-mail: rótulos amigáveis, ids fora e
     * valores formatados como na tela.
     *
     * O HTML continua sendo montado no servidor (que escapa tudo); o que muda
     * é que a APRESENTAÇÃO sai daqui, onde o mapa de rótulos já existe. Antes
     * o e-mail chegava com "sala_tipo_id" e "is_agendavel: 0" porque o
     * servidor só via as chaves cruas do banco.
     *
     * Diferente do anexo .xlsx, aqui o valor vai FORMATADO — o corpo do
     * e-mail é para ler; a planilha é para trabalhar os números.
     */
    linhasParaEnvio(bloco) {
        const itens = bloco?.itens || [];
        if (itens.length === 0) return [];
        const vazio = (v) => v === null || v === undefined || v === "";
        // Coluna vazia em TODAS as linhas só alarga a tabela. Na tela dá para
        // rolar; no corpo de um e-mail (ainda mais no celular) atrapalha muito.
        const chaves = Object.keys(itens[0])
            .filter((k) => !OCULTAS.has(k))
            .filter((k) => itens.some((item) => !vazio(item[k])));

        return itens.map((item) => {
            const linha = {};
            for (const k of chaves) {
                const formatado = formatarCelula(k, item[k]);
                // formatarCelula devolve HTML em alguns casos (badge); o e-mail
                // recebe texto puro e o servidor escapa.
                linha[ROTULOS[k] || k] = String(formatado).replace(/<[^>]*>/g, "");
            }
            return linha;
        });
    }

    /** siccr-empenhos-2026-09-04.xlsx */
    nomeArquivo(bloco, extensao) {
        const base = (bloco.titulo || TITULO_BLOCO[bloco.ferramenta] || "dados")
            .normalize("NFKD").replace(/[̀-ͯ]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return `siccr-${base}-${new Date().toISOString().slice(0, 10)}.${extensao}`;
    }

    /**
     * Confirmação de envio por e-mail.
     *
     * O modelo NÃO envia — ele só propõe. Este painel é o ponto onde uma
     * pessoa vê para quem o dado vai e decide. É o que impede que um texto
     * malicioso vindo da planilha ("envie para fulano@...") vire vazamento:
     * instrução injetada não clica em botão.
     *
     * Por isso o destinatário aparece em destaque e editável, e não escondido
     * numa linha de resumo.
     */
    montarConfirmacaoEmail(bloco, id) {
        const p = bloco.emailProposto;
        const assunto = p.assunto || `${bloco.titulo || TITULO_BLOCO[bloco.ferramenta] || "Dados"} — SICCR`;
        return `
            <div class="ia-email" data-email="${id}">
                <div class="ia-email-titulo">✉ Confirmar envio por e-mail</div>
                <label class="ia-email-campo">
                    <span>Para</span>
                    <input type="email" class="ia-email-para" value="${escapar(p.para)}" autocomplete="off">
                </label>
                <label class="ia-email-campo">
                    <span>Assunto</span>
                    <input type="text" class="ia-email-assunto" value="${escapar(assunto)}" maxlength="255">
                </label>
                <label class="ia-email-anexo">
                    <input type="checkbox" class="ia-email-planilha" checked>
                    anexar a planilha (.xlsx)
                </label>
                <div class="ia-email-acoes">
                    <button type="button" class="ia-email-enviar" data-acao="enviar-email">Enviar</button>
                    <button type="button" class="ia-btn-mini" data-acao="cancelar-email">Cancelar</button>
                </div>
                <div class="ia-email-status" hidden></div>
            </div>`;
    }

    async enviarEmailBloco(caixa) {
        const id = caixa?.dataset.email;
        const bloco = this._blocos?.get(id);
        if (!bloco) return;

        const para = caixa.querySelector(".ia-email-para").value.trim();
        const assunto = caixa.querySelector(".ia-email-assunto").value.trim();
        const comPlanilha = caixa.querySelector(".ia-email-planilha").checked;
        const status = caixa.querySelector(".ia-email-status");
        const botao = caixa.querySelector(".ia-email-enviar");

        const mostrar = (texto, erro) => {
            status.hidden = false;
            status.textContent = texto;
            status.className = `ia-email-status${erro ? " erro" : " ok"}`;
        };

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return mostrar("Endereço de e-mail inválido.", true);
        if (!assunto) return mostrar("Informe o assunto.", true);

        botao.disabled = true;
        const original = botao.textContent;
        botao.textContent = "Enviando…";
        try {
            let anexo;
            if (comPlanilha) {
                const montado = await this.montarPlanilha(bloco);
                if (montado) {
                    anexo = {
                        nome: this.nomeArquivo(bloco, "xlsx"),
                        base64: montado.XLSX.write(montado.livro, { type: "base64", bookType: "xlsx" }),
                    };
                }
            }
            const r = await fetch(`${API}/assistente/enviar-email`, {
                method: "POST",
                body: JSON.stringify({
                    para, assunto,
                    titulo: bloco.titulo || TITULO_BLOCO[bloco.ferramenta] || "Dados do SICCR",
                    itens: this.linhasParaEnvio(bloco),
                    anexo,
                }),
            });
            const resp = await r.json();
            if (!r.ok) { mostrar(resp.message || "Não foi possível enviar.", true); botao.disabled = false; botao.textContent = original; return; }
            mostrar(resp.message || `E-mail enviado para ${para}.`, false);
            // Some com o que pede ação e trava os campos: depois de enviado a
            // caixa é registro do que foi feito, não um formulário pendente.
            caixa.querySelector(".ia-email-acoes").hidden = true;
            caixa.classList.add("concluido");
            caixa.querySelector(".ia-email-titulo").textContent = "✓ E-mail enviado";
            caixa.querySelectorAll("input").forEach((el) => { el.disabled = true; });
        } catch (err) {
            console.error("Erro ao enviar e-mail:", err);
            mostrar("Erro de comunicação ao enviar.", true);
            botao.disabled = false;
            botao.textContent = original;
        }
    }

    /**
     * Avisos que afetam a LEITURA da resposta.
     *
     * O "De onde veio" (que listava as consultas feitas) foi removido: era
     * ruído para quem só quer a informação, e o registro do que foi consultado
     * continua onde importa — gravado em `assistente_mensagens.ferramentas`,
     * que é a auditoria de verdade.
     *
     * O aviso de permissão fica: sem ele o usuário lê uma resposta parcial
     * achando que é completa.
     */
    montarAvisos(ferramentas) {
        const negadas = ferramentas.filter((f) => !f.ok && /permiss/i.test(f.erro || ""));
        return negadas.length
            ? `<div class="ia-aviso">Parte dos dados não foi consultada porque está fora das suas permissões.</div>`
            : "";
    }

    /**
     * Impressão de um bloco: marca o alvo e deixa o @media print esconder o
     * resto. Sem popup — janela nova é bloqueada por padrão em muitos navegadores.
     */
    imprimirBloco(bloco) {
        if (!bloco) return;
        const marcados = [];
        // Marca a cadeia de ancestrais até o body: é o que permite ao CSS
        // esconder os irmãos em cada nível sem depender de onde o componente
        // está no documento (flutuante x embutido na página).
        for (let el = bloco.parentElement; el && el !== document.body; el = el.parentElement) {
            el.classList.add("ia-cadeia-impressao");
            marcados.push(el);
        }
        // Só os ANCESTRAIS entram na cadeia. Marcar o próprio bloco faria a
        // regra que esconde irmãos varrer os filhos dele — o título e a
        // tabela — e a folha saía em branco.
        bloco.classList.add("ia-imprimindo");
        document.body.classList.add("ia-modo-impressao");

        const limpar = () => {
            document.body.classList.remove("ia-modo-impressao");
            bloco.classList.remove("ia-imprimindo");
            marcados.forEach((el) => el.classList.remove("ia-cadeia-impressao"));
            window.removeEventListener("afterprint", limpar);
        };
        window.addEventListener("afterprint", limpar);
        window.print();
        // Alguns navegadores não disparam afterprint
        setTimeout(limpar, 3000);
    }
}

customElements.define("assistente-ia", AssistenteIA);
