// Painel de TV para halls — página kiosk pública (sem login).
// Lê ?predio=<id> da URL; sem ele, mostra um seletor de prédios.
// Auto-refresh dos dados a cada 60s; relógio a cada 1s.

(function () {
    const apiUrl = `${window.location.origin}/api`;
    const app = document.getElementById("tvApp");
    const params = new URLSearchParams(window.location.search);
    const predioId = params.get("predio");

    const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

    function escapeHtml(s) {
        return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
        );
    }

    function agoraHHMM() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }

    function dataExtenso() {
        const d = new Date();
        return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    }

    // ── Seletor de prédios (sem ?predio) ──────────────────────────────
    async function mostrarSeletor() {
        try {
            const resp = await fetch(`${apiUrl}/painel-tv/predios`);
            const data = await resp.json();
            const predios = data.data || [];
            app.innerHTML = `
                <div class="tv-picker">
                    <h1>Selecione o prédio</h1>
                    ${predios.length === 0
                        ? '<p class="tv-vazio">Nenhum prédio com salas agendáveis.</p>'
                        : predios.map((p) => `<a href="?predio=${p.predio_id}">${escapeHtml(p.predio_nome || "Prédio " + p.predio_id)}</a>`).join("")}
                </div>`;
        } catch {
            app.innerHTML = '<p class="tv-erro">Erro ao carregar prédios. Tentando novamente…</p>';
            setTimeout(mostrarSeletor, 10000);
        }
    }

    // ── Painel de um prédio ───────────────────────────────────────────
    function slotAgora(item) {
        if (item.dia_inteiro) return true;
        if (!item.hora_inicio || !item.hora_fim) return false;
        const agora = agoraHHMM();
        return item.hora_inicio <= agora && agora < item.hora_fim;
    }

    function renderPainel(d) {
        const itens = d.itens || [];
        // Agrupa por sala preservando a ordem (já vem ordenado por sala_nome, hora)
        const salas = new Map();
        itens.forEach((it) => {
            if (!salas.has(it.sala_id)) salas.set(it.sala_id, { nome: it.sala_nome, slots: [] });
            salas.get(it.sala_id).slots.push(it);
        });

        const cards = Array.from(salas.values()).map((sala) => `
            <div class="sala-card">
                <div class="sala-nome">${escapeHtml(sala.nome)}</div>
                ${sala.slots.map((s) => {
                    const hora = s.dia_inteiro ? "Dia inteiro" : `${s.hora_inicio}–${s.hora_fim}`;
                    return `
                        <div class="slot ${slotAgora(s) ? "slot--agora" : ""}">
                            <span class="slot-hora">${escapeHtml(hora)}</span>
                            <span class="slot-info">
                                <span class="slot-titulo">${escapeHtml(s.titulo)}</span>
                                ${s.subtitulo ? `<br><span class="slot-sub">${escapeHtml(s.subtitulo)}</span>` : ""}
                            </span>
                        </div>`;
                }).join("")}
            </div>`).join("");

        app.innerHTML = `
            <div class="tv-header">
                <div class="tv-titulo">
                    ${escapeHtml(d.predio.predio_nome || "Prédio")}
                    <small>Agenda de salas — hoje</small>
                </div>
                <div class="tv-relogio">
                    <div class="tv-hora" id="tvHora">${agoraHHMM()}</div>
                    <div class="tv-data">${dataExtenso()}</div>
                </div>
            </div>
            ${itens.length === 0
                ? '<p class="tv-vazio">Nenhuma aula ou reserva para hoje.</p>'
                : `<div class="tv-grid">${cards}</div>`}
            <div class="tv-rodape">Atualizado às ${agoraHHMM()}</div>`;
    }

    async function carregarPainel() {
        try {
            const resp = await fetch(`${apiUrl}/painel-tv/${predioId}`);
            if (!resp.ok) {
                app.innerHTML = '<p class="tv-erro">Prédio não encontrado.</p>';
                return;
            }
            const data = await resp.json();
            renderPainel(data.data);
        } catch {
            app.innerHTML = '<p class="tv-erro">Sem conexão. Tentando novamente…</p>';
        }
    }

    // Atualiza só o relógio (sem refazer fetch)
    function tickRelogio() {
        const el = document.getElementById("tvHora");
        if (el) el.textContent = agoraHHMM();
    }

    if (!predioId) {
        mostrarSeletor();
    } else {
        carregarPainel();
        setInterval(carregarPainel, 60000); // dados a cada 60s
        setInterval(tickRelogio, 1000);      // relógio a cada 1s
    }
})();
