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
};

// Colunas que nunca precisam aparecer na tabela
const OCULTAS = new Set(["id", "id_dotacao"]);

const TITULO_BLOCO = {
    listar_empenhos: "Empenhos", listar_almoxarifado: "Requisições de almoxarifado",
    listar_viagens: "Viagens e diárias", listar_licitacoes: "Itens de licitação",
    listar_transferencias: "Transferências de recurso", listar_dotacoes: "Orçamento",
};

const ehMoeda = (k) => /^(valor|soma|total)/.test(k) || k === "soma" || k === "total";

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
                        <div class="ia-sub">Consulta de execução orçamentária</div>
                    </div>
                    <div class="ia-acoes-topo">
                        <button type="button" class="ia-btn-icone" data-acao="nova" title="Nova conversa">✚</button>
                        ${this.modoPagina ? "" : '<button type="button" class="ia-btn-icone" data-acao="fechar" title="Fechar">✕</button>'}
                    </div>
                </div>
                <div class="ia-mensagens" role="log" aria-live="polite"></div>
                <form class="ia-entrada">
                    <textarea rows="1" placeholder="Pergunte, por exemplo: quanto o Departamento de Solos gastou em 2026?"
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
        });

        const botao = this.querySelector(".ia-flutuante");
        if (botao) botao.addEventListener("click", () => this.alternar(this.painel.hidden));
    }

    async verificarStatus() {
        try {
            const r = await fetch(`${API}/assistente/status`);
            const resp = await r.json();
            this.habilitado = Boolean(resp.data?.habilitado);
        } catch {
            this.habilitado = false;
        }
        if (!this.habilitado) {
            this.adicionarAviso(
                "O assistente ainda não está configurado neste servidor. " +
                "Falta a chave da OpenAI (OPENAI_API_KEY) no .env."
            );
            this.form.querySelector("button").disabled = true;
            this.campo.disabled = true;
        } else if (this.lista.children.length === 0) {
            this.adicionarBoasVindas();
        }
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
            "Mostre as diárias pagas em 2025",
            "Como ficou o saldo de cada departamento?",
        ];
        const div = document.createElement("div");
        div.className = "ia-msg ia-msg--assistente ia-boasvindas";
        div.innerHTML =
            `<p>Olá! Posso consultar a execução orçamentária do centro — empenhos, almoxarifado, ` +
            `diárias, licitações e orçamento. Pergunte do seu jeito.</p>` +
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
            if (d.ferramentas?.length) html += this.montarFonte(d.ferramentas);
            this.adicionarMensagem("assistente", html);
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

        const chaves = Object.keys(itens[0]).filter((k) => !OCULTAS.has(k));
        const cabecalho = chaves.map((k) => `<th${ehMoeda(k) ? ' class="num"' : ""}>${escapar(ROTULOS[k] || k)}</th>`).join("");
        const corpo = itens.map((it) =>
            `<tr>${chaves.map((k) =>
                `<td${ehMoeda(k) ? ' class="num"' : ""}>${formatarCelula(k, it[k])}</td>`
            ).join("")}</tr>`
        ).join("");

        const titulo = TITULO_BLOCO[bloco.ferramenta] || "Resultado";
        const resumo = bloco.total !== undefined
            ? `${bloco.total} registro(s)${bloco.soma !== undefined ? ` · ${brl(bloco.soma)}` : ""}`
            : `${itens.length} registro(s)`;

        return `
            <div class="ia-bloco" data-bloco="${id}" id="${id}">
                <div class="ia-bloco-topo">
                    <strong>${escapar(titulo)}</strong>
                    <span class="ia-bloco-resumo">${escapar(resumo)}</span>
                    <button type="button" class="ia-btn-mini" data-acao="imprimir">🖨 PDF</button>
                </div>
                <div class="ia-bloco-tabela"><table>
                    <thead><tr>${cabecalho}</tr></thead>
                    <tbody>${corpo}</tbody>
                </table></div>
                ${itens.length < (bloco.total || 0)
                    ? `<div class="ia-bloco-nota">Exibindo ${itens.length} de ${bloco.total}. Os totais acima consideram todos.</div>`
                    : ""}
            </div>`;
    }

    /** Transparência: o que foi consultado para chegar na resposta */
    montarFonte(ferramentas) {
        const nomes = [...new Set(ferramentas.filter((f) => f.ok).map((f) => TITULO_BLOCO[f.nome] || f.nome))];
        const negadas = ferramentas.filter((f) => !f.ok && /permiss/i.test(f.erro || ""));
        let html = "";
        if (nomes.length) {
            html += `<details class="ia-fonte"><summary>De onde veio</summary>` +
                `<div>Consultado: ${escapar(nomes.join(", "))}</div></details>`;
        }
        if (negadas.length) {
            html += `<div class="ia-aviso">Parte dos dados não foi consultada porque está fora das suas permissões.</div>`;
        }
        return html;
    }

    /**
     * Impressão de um bloco: marca o alvo e deixa o @media print esconder o
     * resto. Sem popup — janela nova é bloqueada por padrão em muitos navegadores.
     */
    imprimirBloco(bloco) {
        if (!bloco) return;
        document.querySelectorAll(".ia-imprimindo").forEach((el) => el.classList.remove("ia-imprimindo"));
        bloco.classList.add("ia-imprimindo");
        document.body.classList.add("ia-modo-impressao");
        const limpar = () => {
            document.body.classList.remove("ia-modo-impressao");
            bloco.classList.remove("ia-imprimindo");
            window.removeEventListener("afterprint", limpar);
        };
        window.addEventListener("afterprint", limpar);
        window.print();
        // Safari/alguns navegadores não disparam afterprint
        setTimeout(limpar, 3000);
    }
}

customElements.define("assistente-ia", AssistenteIA);
