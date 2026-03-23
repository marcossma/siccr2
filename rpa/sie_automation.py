"""
Módulo de automação do SIE (Visual Basic 6 / Win32).

── Como mapear os controles de cada tela ────────────────────────────────────

1. Abra o SIE manualmente e navegue até a tela que deseja mapear.
2. Com o SIE nessa tela, rode no terminal Python:

    from pywinauto import Application
    app = Application(backend="win32").connect(title_re=".*SIE.*")
    app.top_window().print_control_identifiers()

3. Anote o título da janela (title=), a class_name e o found_index de cada
   campo que precisar preencher.

── Controles comuns em VB6 e como acessá-los ────────────────────────────────

    TextBox     → child_window(class_name="Edit",     found_index=N)
    ComboBox    → child_window(class_name="ComboBox", found_index=N)
    ListBox     → child_window(class_name="ListBox",  found_index=N)
    Botão       → child_window(title="OK",            class_name="Button")
    Label       → child_window(class_name="Static",   found_index=N)

── Estratégia para múltiplas telas ──────────────────────────────────────────

    # Após clicar em algo que abre nova janela:
    nova_janela = self.app.window(title_re=".*Título da nova tela.*")
    nova_janela.wait("ready", timeout=10)   # aguarda aparecer
    nova_janela.child_window(...).set_text("valor")

── Tratamento de pop-ups inesperados ────────────────────────────────────────

    try:
        popup = self.app.window(title="Aviso")
        if popup.exists(timeout=2):
            popup.child_window(title="OK").click()
    except Exception:
        pass
─────────────────────────────────────────────────────────────────────────────
"""

import time
from typing import Callable

try:
    from pywinauto import Application
    from pywinauto.findwindows import ElementNotFoundError
    PYWINAUTO_OK = True
except ImportError:
    PYWINAUTO_OK = False

LogFn = Callable[[str], None]

# Tempo (segundos) de espera padrão entre ações — ajuste conforme velocidade do SIE
PAUSA = 0.8


class SIEAutomacao:

    def __init__(self, exe_path: str, window_title: str,
                 usuario: str = "", senha: str = ""):
        self.exe_path     = exe_path
        self.window_title = window_title
        self.usuario      = usuario
        self.senha        = senha
        self.app          = None
        self.janela       = None   # janela principal atual

    # ─────────────────────────────────────────────────────────────────────────
    # Conexão e login
    # ─────────────────────────────────────────────────────────────────────────

    def conectar(self) -> None:
        """
        Abre o SIE (ou conecta a uma instância já aberta) e faz login
        caso a tela de login apareça.
        """
        if not PYWINAUTO_OK:
            raise RuntimeError(
                "pywinauto não instalado.\nExecute: pip install pywinauto"
            )

        # Tenta conectar a uma instância já aberta
        try:
            self.app = Application(backend="win32").connect(
                title_re=f".*{self.window_title}.*", timeout=3
            )
        except ElementNotFoundError:
            # Abre o executável
            if not self.exe_path:
                raise FileNotFoundError(
                    "sie_exe_path não configurado em config.json"
                )
            self.app = Application(backend="win32").start(self.exe_path)
            time.sleep(4)   # aguarda o SIE inicializar

        self.janela = self.app.top_window()

        # Se aparecer tela de login, autentica automaticamente
        self._fazer_login()

    def _fazer_login(self) -> None:
        """
        Preenche usuário e senha na tela de login do SIE.

        TODO: ajuste os índices/títulos dos campos conforme o SIE real.
              Rode print_control_identifiers() na tela de login para identificar.
        """
        try:
            # Verifica se a tela de login está visível (timeout curto)
            tela_login = self.app.window(title_re=".*[Ll]ogin.*|.*[Ee]ntrar.*|.*[Aa]cesso.*")
            tela_login.wait("ready", timeout=5)
        except Exception:
            # Tela de login não encontrada — SIE já está logado
            return

        # ── Preencha conforme os controles reais da tela de login ────────────
        #
        # Exemplo genérico (ajuste found_index conforme print_control_identifiers):
        #
        #   campo_usuario = tela_login.child_window(class_name="Edit", found_index=0)
        #   campo_usuario.set_text(self.usuario)
        #
        #   campo_senha = tela_login.child_window(class_name="Edit", found_index=1)
        #   campo_senha.set_text(self.senha)
        #
        #   btn_ok = tela_login.child_window(title="OK", class_name="Button")
        #   btn_ok.click()
        #   time.sleep(2)   # aguarda o SIE abrir a tela principal
        #
        raise NotImplementedError(
            "Implemente _fazer_login() em sie_automation.py\n"
            "Use print_control_identifiers() para mapear os campos."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Fluxo principal de pedido
    # ─────────────────────────────────────────────────────────────────────────

    def fazer_pedido(self, itens: list[dict], log: LogFn | None = None) -> None:
        """
        Executa um pedido de almoxarifado no SIE para a lista de itens.

        Parâmetros
        ----------
        itens : list[dict]
            Cada item contém:
                codigo_produto   (str | None)
                descricao_produto (str)
                quantidade       (int)
        log : callable | None
            Função para enviar mensagens de progresso à GUI.

        O fluxo típico de pedido de almoxarifado no SIE costuma ser:
            1. Navegar ao módulo de almoxarifado / requisições
            2. Criar nova requisição
            3. Para cada item: preencher código/descrição + quantidade + adicionar
            4. Confirmar/salvar a requisição
            5. Fechar ou voltar para a tela principal

        Implemente cada passo abaixo conforme o SIE real.
        """
        self._log(log, "Iniciando fluxo de pedido no SIE...")

        # ── PASSO 1: Navegar ao módulo de almoxarifado ────────────────────────
        # Exemplo com menu:
        #   self.janela.menu_select("Almoxarifado->Requisições->Nova Requisição")
        #   time.sleep(PAUSA)
        #
        # Ou clicando em botão/ícone:
        #   self.janela.child_window(title="Almoxarifado").click()
        #   time.sleep(PAUSA)
        #
        # Após navegar, captura a nova tela:
        #   tela_requisicao = self.app.window(title_re=".*[Rr]equisi.*")
        #   tela_requisicao.wait("ready", timeout=10)

        # ── PASSO 2: Criar nova requisição ────────────────────────────────────
        #   btn_nova = tela_requisicao.child_window(title="Nova", class_name="Button")
        #   btn_nova.click()
        #   time.sleep(PAUSA)

        # ── PASSO 3: Adicionar cada item ──────────────────────────────────────
        for i, item in enumerate(itens):
            codigo    = item.get("codigo_produto") or ""
            descricao = item.get("descricao_produto", "")
            qtd       = str(item.get("quantidade", 1))

            self._log(log, f"  [{i+1}/{len(itens)}] {descricao}  (cód: {codigo or '—'}  qtd: {qtd})")

            # Exemplo de preenchimento por item:
            #
            #   tela_item = self.app.window(title_re=".*[Ii]tem.*")
            #   tela_item.wait("ready", timeout=8)
            #
            #   tela_item.child_window(class_name="Edit", found_index=0).set_text(codigo)
            #   time.sleep(PAUSA / 2)
            #
            #   tela_item.child_window(class_name="Edit", found_index=1).set_text(qtd)
            #   time.sleep(PAUSA / 2)
            #
            #   tela_item.child_window(title="Adicionar", class_name="Button").click()
            #   time.sleep(PAUSA)
            #
            #   # Trata possível popup de confirmação ou erro
            #   self._fechar_popup_se_existir()

            raise NotImplementedError(
                "Implemente o preenchimento de itens em sie_automation.py → fazer_pedido()"
            )

        # ── PASSO 4: Confirmar/salvar a requisição ────────────────────────────
        #   btn_salvar = tela_requisicao.child_window(title="Salvar", class_name="Button")
        #   btn_salvar.click()
        #   time.sleep(PAUSA)
        #   self._fechar_popup_se_existir(titulo_esperado="Requisição salva")

        self._log(log, "Pedido concluído no SIE.")

    # ─────────────────────────────────────────────────────────────────────────
    # Utilitários
    # ─────────────────────────────────────────────────────────────────────────

    def _fechar_popup_se_existir(self, titulo_esperado: str = "") -> bool:
        """
        Fecha um popup/dialog inesperado clicando em OK/Fechar.
        Retorna True se um popup foi encontrado e fechado.
        """
        try:
            padrao = f".*{titulo_esperado}.*" if titulo_esperado else ".*"
            popup = self.app.window(title_re=padrao, top_level_only=True)
            if popup.exists(timeout=2) and popup.handle != self.janela.handle:
                for titulo_btn in ("OK", "Fechar", "Cancelar", "Close"):
                    try:
                        popup.child_window(title=titulo_btn, class_name="Button").click()
                        time.sleep(0.3)
                        return True
                    except Exception:
                        continue
        except Exception:
            pass
        return False

    def inspecionar_tela_atual(self) -> str:
        """
        Retorna os controles da janela atual do SIE como texto.
        Use durante o desenvolvimento para mapear cada tela.

        Exemplo de uso no terminal Python:
            sie = SIEAutomacao(...)
            sie.conectar()
            print(sie.inspecionar_tela_atual())
        """
        if not self.app:
            return "SIE não conectado. Chame conectar() primeiro."
        import io, sys
        buf = io.StringIO()
        _stdout = sys.stdout
        sys.stdout = buf
        try:
            self.app.top_window().print_control_identifiers()
        finally:
            sys.stdout = _stdout
        return buf.getvalue()

    @staticmethod
    def _log(fn: LogFn | None, msg: str) -> None:
        if fn:
            fn(msg)
