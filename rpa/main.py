"""
SICCR2 — Agente de Pedidos de Almoxarifado
Automatiza o envio de pedidos pendentes da plataforma para o SIE.

Instalação:
    pip install -r requirements.txt

Configuração:
    Edite config.json com a URL da API, a API Key gerada no painel admin
    e o caminho do executável do SIE.
"""

import json
import os
import sys
import threading
import tkinter as tk
from datetime import datetime
from tkinter import messagebox

import customtkinter as ctk

from api_client import SICCRClient
from sie_automation import SIEAutomacao

# ── Tema ──────────────────────────────────────────────────────────────────────
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("green")

COR_VERDE       = "#007a2e"
COR_VERDE_CLARO = "#009536"
COR_FUNDO_PAR   = "#f7f7f7"
COR_FUNDO_IMPAR = "#ffffff"
FONTE           = "Verdana"

# Quando empacotado pelo PyInstaller (frozen), o executável fica em sys.executable.
# Quando rodado como script normal, usamos o diretório do próprio arquivo.
if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")


# ── Utilitários ───────────────────────────────────────────────────────────────

def formatar_data(iso: str) -> str:
    """'2026-03-21' → '21/03/2026'"""
    try:
        partes = iso[:10].split("-")
        return f"{partes[2]}/{partes[1]}/{partes[0]}"
    except Exception:
        return iso or "—"


def carregar_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(
            f"Arquivo config.json não encontrado em:\n{CONFIG_PATH}\n\n"
            "Copie config.json.exemplo e preencha com sua API Key."
        )
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Widget: linha de pedido ───────────────────────────────────────────────────

class LinhaPedido(ctk.CTkFrame):
    """Uma linha na lista de pedidos com checkbox e dados."""

    def __init__(self, master, pedido: dict, bg: str, **kwargs):
        super().__init__(master, fg_color=bg, corner_radius=0, **kwargs)
        self.pedido = pedido
        self.var = tk.BooleanVar(value=False)

        chk = ctk.CTkCheckBox(self, text="", variable=self.var, width=36,
                               checkbox_width=18, checkbox_height=18)
        chk.pack(side="left", padx=(8, 0))

        pid = pedido.get("id_pedido", "")
        ctk.CTkLabel(self, text=f"#{pid}", width=48, anchor="w",
                     font=(FONTE, 10, "bold"),
                     text_color=COR_VERDE).pack(side="left", padx=4)

        setor = pedido.get("subunidade_sigla") or pedido.get("subunidade_nome") or "—"
        ctk.CTkLabel(self, text=setor, width=70, anchor="w",
                     font=(FONTE, 10)).pack(side="left", padx=4)

        itens = f"{pedido.get('total_itens', 0)} item(s)"
        ctk.CTkLabel(self, text=itens, width=70, anchor="w",
                     font=(FONTE, 10)).pack(side="left", padx=4)

        data = formatar_data(pedido.get("data_pedido", ""))
        ctk.CTkLabel(self, text=data, width=90, anchor="w",
                     font=(FONTE, 10)).pack(side="left", padx=4)

        obs = pedido.get("observacao") or ""
        ctk.CTkLabel(self, text=obs, anchor="w",
                     font=(FONTE, 10), text_color="gray").pack(side="left", padx=4, fill="x", expand=True)

    def selecionado(self) -> bool:
        return self.var.get()

    def set_selecionado(self, valor: bool) -> None:
        self.var.set(valor)


# ── Janela principal ──────────────────────────────────────────────────────────

class AgentApp(ctk.CTk):

    def __init__(self):
        super().__init__()
        self.title("SICCR2 — Agente de Almoxarifado")
        self.geometry("860x640")
        self.minsize(700, 500)
        self.iconbitmap(default="") if os.name == "nt" else None

        try:
            cfg = carregar_config()
        except FileNotFoundError as e:
            messagebox.showerror("Configuração ausente", str(e))
            self.destroy()
            return

        self.client = SICCRClient(cfg["api_base_url"], cfg["api_key"])
        self.sie    = SIEAutomacao(
            exe_path     = cfg.get("sie_exe_path", ""),
            window_title = cfg.get("sie_window_title", "SIE"),
            usuario      = cfg.get("sie_usuario", ""),
            senha        = cfg.get("sie_senha", ""),
        )

        self._linhas: list[LinhaPedido] = []
        self._pedidos: list[dict] = []

        self._build_ui()
        self._atualizar_lista()

    # ── Construção da interface ───────────────────────────────────────────────

    def _build_ui(self) -> None:
        # Cabeçalho verde
        header = ctk.CTkFrame(self, fg_color=COR_VERDE, corner_radius=0, height=48)
        header.pack(fill="x")
        header.pack_propagate(False)
        ctk.CTkLabel(
            header,
            text="SICCR2 — Agente de Almoxarifado",
            font=(FONTE, 15, "bold"),
            text_color="white",
        ).pack(side="left", padx=16, pady=10)
        self.lbl_status = ctk.CTkLabel(
            header, text="● Conectando...",
            font=(FONTE, 10), text_color="#a8f0c0",
        )
        self.lbl_status.pack(side="right", padx=16)

        # Barra de ferramentas
        toolbar = ctk.CTkFrame(self, fg_color="#efefef", corner_radius=0, height=44)
        toolbar.pack(fill="x")
        toolbar.pack_propagate(False)

        self.chk_todos = ctk.CTkCheckBox(
            toolbar, text="Selecionar todos",
            command=self._toggle_todos,
            font=(FONTE, 11),
        )
        self.chk_todos.pack(side="left", padx=12, pady=8)

        self.btn_atualizar = ctk.CTkButton(
            toolbar, text="↻  Atualizar",
            command=self._atualizar_lista,
            fg_color=COR_VERDE, hover_color=COR_VERDE_CLARO,
            font=(FONTE, 11), width=110, height=30,
        )
        self.btn_atualizar.pack(side="left", padx=4)

        self.btn_executar = ctk.CTkButton(
            toolbar, text="▶  Executar selecionados",
            command=self._confirmar_executar,
            fg_color=COR_VERDE_CLARO, hover_color=COR_VERDE,
            font=(FONTE, 11, "bold"), width=210, height=30,
        )
        self.btn_executar.pack(side="right", padx=12)

        # Cabeçalho da tabela
        cab = ctk.CTkFrame(self, fg_color=COR_VERDE_CLARO, corner_radius=0, height=28)
        cab.pack(fill="x", padx=0)
        cab.pack_propagate(False)
        for label, w in [("", 36), ("#", 48), ("Setor", 70), ("Itens", 70), ("Data", 90), ("Observação", 0)]:
            ctk.CTkLabel(
                cab, text=label, width=w or 1, anchor="w",
                font=(FONTE, 9, "bold"), text_color="white",
            ).pack(side="left", padx=4)

        # Lista scrollável
        self.scroll = ctk.CTkScrollableFrame(self, fg_color="white", corner_radius=0)
        self.scroll.pack(fill="both", expand=True)

        # Separador
        ctk.CTkFrame(self, height=1, fg_color="#cccccc").pack(fill="x")

        # Área de log
        log_outer = ctk.CTkFrame(self, fg_color="#fafafa", corner_radius=0)
        log_outer.pack(fill="x")
        ctk.CTkLabel(
            log_outer, text="Log de execução",
            font=(FONTE, 9, "bold"), text_color="gray", anchor="w",
        ).pack(fill="x", padx=10, pady=(4, 0))
        self.txt_log = ctk.CTkTextbox(
            log_outer, height=130,
            font=("Courier New", 9),
            fg_color="#fafafa",
            state="disabled",
        )
        self.txt_log.pack(fill="x", padx=10, pady=(0, 6))

    # ── Log ──────────────────────────────────────────────────────────────────

    def _log(self, msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        self.txt_log.configure(state="normal")
        self.txt_log.insert("end", f"[{ts}] {msg}\n")
        self.txt_log.see("end")
        self.txt_log.configure(state="disabled")

    # ── Seleção ───────────────────────────────────────────────────────────────

    def _toggle_todos(self) -> None:
        valor = self.chk_todos.get()
        for linha in self._linhas:
            linha.set_selecionado(valor)

    def _selecionados(self) -> list[int]:
        return [
            linha.pedido["id_pedido"]
            for linha in self._linhas
            if linha.selecionado()
        ]

    # ── Atualizar lista ───────────────────────────────────────────────────────

    def _atualizar_lista(self) -> None:
        self.btn_atualizar.configure(state="disabled")
        self.lbl_status.configure(text="● Atualizando...", text_color="yellow")
        threading.Thread(target=self._fetch_pedidos, daemon=True).start()

    def _fetch_pedidos(self) -> None:
        try:
            self._pedidos = self.client.listar_pedidos_pendentes()
            self.after(0, self._renderizar_lista)
            n = len(self._pedidos)
            cor = "#a8f0c0" if n == 0 else "#ffe066"
            texto = f"● Conectado — {n} pedido(s) pendente(s)"
            self.after(0, lambda: self.lbl_status.configure(text=texto, text_color=cor))
        except Exception as e:
            self.after(0, lambda: self.lbl_status.configure(
                text="● Erro de conexão", text_color="#ff7070"))
            self.after(0, lambda: self._log(f"❌ Erro ao buscar pedidos: {e}"))
        finally:
            self.after(0, lambda: self.btn_atualizar.configure(state="normal"))

    def _renderizar_lista(self) -> None:
        for w in self.scroll.winfo_children():
            w.destroy()
        self._linhas.clear()
        self.chk_todos.deselect()

        if not self._pedidos:
            ctk.CTkLabel(
                self.scroll,
                text="Nenhum pedido pendente no momento.",
                font=(FONTE, 12), text_color="gray",
            ).pack(pady=40)
            self._log("Lista atualizada — nenhum pedido pendente.")
            return

        for i, pedido in enumerate(self._pedidos):
            bg = COR_FUNDO_PAR if i % 2 == 0 else COR_FUNDO_IMPAR
            linha = LinhaPedido(self.scroll, pedido, bg)
            linha.pack(fill="x")
            self._linhas.append(linha)

        self._log(f"Lista atualizada — {len(self._pedidos)} pedido(s) pendente(s).")

    # ── Executar pedidos ──────────────────────────────────────────────────────

    def _confirmar_executar(self) -> None:
        ids = self._selecionados()
        if not ids:
            messagebox.showwarning("Atenção", "Selecione ao menos um pedido para executar.")
            return
        if not messagebox.askyesno(
            "Confirmar execução",
            f"Executar {len(ids)} pedido(s) selecionado(s) no SIE?\n\n"
            "Esta ação irá preencher o sistema automaticamente e marcar\n"
            "os pedidos como atendidos na plataforma.",
        ):
            return
        self._set_botoes(False)
        threading.Thread(
            target=self._executar_pedidos, args=(ids,), daemon=True
        ).start()

    def _executar_pedidos(self, ids: list[int]) -> None:
        # Conecta ao SIE uma vez para todos os pedidos
        self.after(0, lambda: self._log("Conectando ao SIE..."))
        try:
            self.sie.conectar()
            self.after(0, lambda: self._log("✔ SIE conectado."))
        except Exception as e:
            self.after(0, lambda: self._log(f"❌ Não foi possível conectar ao SIE: {e}"))
            self.after(0, lambda: self._set_botoes(True))
            return

        concluidos = 0
        for pid in ids:
            pedido = next((p for p in self._pedidos if p["id_pedido"] == pid), None)
            if not pedido:
                continue
            setor = pedido.get("subunidade_sigla") or pedido.get("subunidade_nome", "?")
            self.after(0, lambda p=pid, s=setor: self._log(
                f"⏳ Pedido #{p} ({s}) — buscando itens..."))
            try:
                itens = self.client.listar_itens(pid)
                self.after(0, lambda n=len(itens), p=pid: self._log(
                    f"   {n} item(s) encontrado(s) no pedido #{p}."))

                self.sie.fazer_pedido(
                    itens,
                    log=lambda msg: self.after(0, lambda m=msg: self._log(f"   {m}")),
                )

                self.client.marcar_atendido(pid)
                concluidos += 1
                self.after(0, lambda p=pid: self._log(
                    f"✅ Pedido #{p} — concluído e marcado como atendido."))

            except NotImplementedError:
                self.after(0, lambda p=pid: self._log(
                    f"⚠️  Pedido #{p} — automação SIE ainda não implementada."))
            except Exception as e:
                self.after(0, lambda p=pid, err=str(e): self._log(
                    f"❌ Pedido #{p} — erro: {err}"))

        self.after(0, lambda: self._log(
            f"─── Concluído: {concluidos}/{len(ids)} pedido(s) processado(s). ───"))
        self.after(0, lambda: self._set_botoes(True))
        self.after(0, self._atualizar_lista)

    # ── Utilitário ────────────────────────────────────────────────────────────

    def _set_botoes(self, ativo: bool) -> None:
        estado = "normal" if ativo else "disabled"
        self.btn_executar.configure(state=estado)
        self.btn_atualizar.configure(state=estado)
        self.chk_todos.configure(state=estado)


# ── Ponto de entrada ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = AgentApp()
    app.mainloop()
