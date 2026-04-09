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

        # Tenta conectar a uma instância já aberta pelo título da janela principal
        try:
            self.app = Application(backend="win32").connect(
                title_re=f".*{self.window_title}.*", timeout=3
            )
        except Exception:
            # Abre o executável
            if not self.exe_path:
                raise FileNotFoundError(
                    "sie_exe_path não configurado em config.json"
                )
            self.app = Application(backend="win32").start(self.exe_path)

            # O Windows exibe "Abrir Arquivo - Aviso de Segurança" ao abrir
            # executáveis de caminhos de rede — clica em "Executar" automaticamente
            self._fechar_aviso_seguranca()

            time.sleep(4)   # aguarda o SIE inicializar

        # Se aparecer tela de login, autentica automaticamente
        self._fazer_login()

        # Re-resolve a janela principal APÓS o login — o handle muda quando o SGCA
        # fecha a tela de login e abre a janela de navegação principal
        time.sleep(1)
        self.janela = self._resolver_janela_principal()

    def _fechar_aviso_seguranca(self) -> None:
        """
        Fecha o dialog "Abrir Arquivo - Aviso de Segurança" que o Windows exibe
        ao executar aplicativos de caminhos de rede (UNC \\\\servidor\\...).
        Clica em "Executar" se o dialog aparecer dentro de 8 segundos.
        """
        from pywinauto import Desktop
        deadline = time.time() + 8
        while time.time() < deadline:
            try:
                desktop = Desktop(backend="win32")
                aviso = desktop.window(title_re=".*Aviso de Segurança.*|.*Security Warning.*")
                if aviso.exists(timeout=1):
                    for titulo in ("Executar", "Run"):
                        try:
                            aviso.child_window(title=titulo, class_name="Button").click()
                            time.sleep(0.5)
                            return
                        except Exception:
                            continue
            except Exception:
                pass
            time.sleep(0.5)

    def _fechar_mensagem_pos_login(self) -> None:
        """
        Fecha o dialog de avisos/comunicados que o SGCA exibe logo após o login.
        O dialog tem título 'Mensagem' e botão 'Fechar'.
        Aguarda até 10 segundos — se não aparecer, segue em frente normalmente.
        """
        try:
            from pywinauto import Desktop
            # Classe mapeada: TfrmMensagem, botão classe TBitBtn título "&Fechar"
            aviso = Desktop(backend="win32").window(class_name="TfrmMensagem")
            aviso.wait("ready", timeout=10)
            aviso.child_window(title="&Fechar", class_name="TBitBtn").click()
            time.sleep(0.5)
        except Exception:
            pass   # dialog não apareceu ou já foi fechado

    def _fazer_login(self) -> None:
        """
        Preenche usuário e senha na tela de login do SIE.

        TODO: ajuste os índices/títulos dos campos conforme o SIE real.
              Rode print_control_identifiers() na tela de login para identificar.
        """
        try:
            # Tela de login do SGCA: título "SGCA - Controle de Acesso", classe TfrmSenha
            tela_login = self.app.window(class_name="TfrmSenha")
            tela_login.wait("ready", timeout=5)
        except Exception:
            # Tela de login não encontrada — SIE já está logado
            return

        # Controles mapeados via print_control_identifiers() em TfrmSenha:
        #   TEdit found_index=0 → Usuário
        #   TEdit found_index=1 → Senha  (aparece como "Edit2" na árvore — 2º TEdit)
        #   TComboBox           → Banco (mantém "Banco de Produção", não altera)
        #   TButton title="OK"  → confirmar

        campo_usuario = tela_login.child_window(class_name="TEdit", found_index=0)
        campo_usuario.set_text(self.usuario)
        time.sleep(PAUSA / 2)

        campo_senha = tela_login.child_window(class_name="TEdit", found_index=1)
        campo_senha.set_text(self.senha)
        time.sleep(PAUSA / 2)

        tela_login.child_window(title="OK", class_name="TButton").click()
        time.sleep(3)   # aguarda o SGCA abrir a tela principal

        # Após o login o SGCA exibe um dialog "Mensagem" com avisos/comunicados.
        # Fecha automaticamente clicando em "Fechar".
        self._fechar_mensagem_pos_login()

    # ─────────────────────────────────────────────────────────────────────────
    # Navegação na árvore de aplicações
    # ─────────────────────────────────────────────────────────────────────────

    def _navegar_para_solicitacao(self, log: LogFn | None = None) -> None:
        """
        Navega na árvore 'Aplicações' até abrir a tela de Solicitação de Produtos.

        Caminho: 5 Serviços Gerais → 5.4 Material → 5.4.2 Funções → 5.4.2.04 Solicitação de Produtos

        Estratégia: foca a TBsDBTreeList, usa type_keys com o código numérico de cada
        nível para fazer jump (a maioria dos controles Delphi suporta type-ahead),
        expande com a tecla de seta e abre com Enter/duplo clique.
        """
        self._log(log, "Navegando até Solicitação de Produtos...")

        arvore = self.janela.child_window(class_name="TBsDBTreeList")
        arvore.set_focus()
        time.sleep(PAUSA)

        # Caminho: 5 → 5.4 → 5.4.2 → 5.4.2.04
        # Digita o código COMPLETO com pontos para o type-ahead bater no item certo.
        # Sem os pontos, "54" pode bater em "5.2 Patrimônio" (que começa com "5")
        # e depois ignorar o "4".
        passos = [
            ("5",        "{RIGHT}"),   # 5 Serviços Gerais  → expandir
            ("5.4",      "{RIGHT}"),   # 5.4 Material        → expandir
            ("5.4.2",    "{RIGHT}"),   # 5.4.2 Funções       → expandir
            ("5.4.2.04", "{ENTER}"),   # 5.4.2.04 Solicitação de Produtos → abrir
        ]

        for codigo, tecla in passos:
            arvore.type_keys(codigo, pause=0.12)
            time.sleep(PAUSA / 2)
            arvore.type_keys(tecla)
            time.sleep(PAUSA)

        # Aguarda a tela de Solicitação de Produtos abrir
        time.sleep(2)
        self._log(log, "Módulo de Solicitação de Produtos aberto.")

    # ─────────────────────────────────────────────────────────────────────────
    # Fluxo principal de pedido
    # ─────────────────────────────────────────────────────────────────────────

    def fazer_pedido(self, itens: list[dict], log: LogFn | None = None) -> None:
        """
        Executa um pedido de almoxarifado no SIE para a lista de itens.

        Fluxo:
            1. Navega até 5.4.2.04 Solicitação de Produtos na árvore
            2. Clica em Novo → formulário pre-preenchido → clica Salvar
            3. Na aba Itens: para cada item digita código + qtd e confirma
            4. Clica Tramitar para finalizar
        """
        self._log(log, "Iniciando fluxo de pedido no SIE...")

        # ── PASSO 1: Navegar ao módulo ────────────────────────────────────────
        self._navegar_para_solicitacao(log)

        # Captura a janela MDI do módulo via Desktop (janelas MDI filhas não são
        # top-level, então self.app.window() não as encontra).
        # found_index=0 garante que pegamos a mais recente mesmo se houver
        # instâncias antigas abertas de runs anteriores.
        from pywinauto import Desktop
        tela = Desktop(backend="win32").window(
            class_name="TfrCESolProdutosPrincipal", found_index=0
        )
        tela.wait("ready", timeout=15)

        # ── PASSO 2: Criar nova requisição ────────────────────────────────────
        self._nova_requisicao(tela, log)

        # ── PASSO 3: Adicionar itens ──────────────────────────────────────────
        self._inserir_itens(tela, itens, log)

        # ── PASSO 4: Tramitar ────────────────────────────────────────────────
        self._tramitar(tela, log)

        self._log(log, "Pedido concluído no SIE.")

    # ─────────────────────────────────────────────────────────────────────────
    # Sub-rotinas do fluxo de pedido
    # ─────────────────────────────────────────────────────────────────────────

    def _nova_requisicao(self, tela, log: LogFn | None = None) -> None:
        """
        Clica no botão Novo da toolbar → aguarda o formulário habilitar
        (os campos já vêm pre-preenchidos com os dados da subunidade) →
        clica Salvar para gerar o número da requisição.
        """
        self._log(log, "Criando nova requisição...")

        # Botão "Novo" é o 1º botão da toolbar (caption="Novo", found_index=0)
        toolbar = tela.child_window(class_name="TToolBar")
        try:
            toolbar.child_window(title="Novo", found_index=0).click_input()
        except Exception:
            # Fallback: pelo índice (0 = primeiro botão)
            toolbar.button(0).click_input()
        time.sleep(PAUSA * 1.5)

        # Aguarda Salvar/Cancelar ficarem visíveis (o formulário habilitou)
        # Botão Salvar fica no canto inferior direito da aba Requisição
        try:
            btn_salvar = tela.child_window(title="Salvar")
            btn_salvar.wait("visible", timeout=8)
            btn_salvar.click_input()
        except Exception:
            # Tenta pelo menu Arquivo → Salvar como fallback
            tela.child_window(class_name="TMenuBar").type_keys("%a")  # Alt+A = Arquivo
            time.sleep(0.3)
            tela.type_keys("s")  # Salvar
        time.sleep(PAUSA * 2)

        # Fecha possível confirmação/popup após salvar
        self._fechar_popup_se_existir()
        self._log(log, "Requisição criada.")

    def _inserir_itens(self, tela_principal, itens: list[dict], log: LogFn | None = None) -> None:
        """
        Na aba 'Itens' da requisição, clica em Novo para cada produto,
        usa a janela 'Localizar Produto' para buscar pelo código reduzido,
        preenche a quantidade e salva.

        Fluxo por item:
            1. Toolbar "Novo" (found_index=1) → abre TfrCESolProdutosItens
            2. Clica lupa (btnLocProduto, TBitBtn found_index=0) → abre TfrLocalizarProduto
            3. Em TfrLocalizarProduto: digita código em TMaskEdit → clica OK
            4. Volta a TfrCESolProdutosItens: SIE preenche descrição automaticamente
            5. Preenche quantidade (TBsCurrencyEdit found_index=4)
            6. Clica Salvar (TBitBtn title="Salvar")

        Controles mapeados em TfrCESolProdutosItens:
            TBitBtn   found_index=0  → lupa (btnLocProduto) — abre busca de produto
            TBsCurrencyEdit found_index=4 → Qt.Total Solic. (Quantidade)
            TBitBtn   title="Salvar" → confirma o item

        Controles mapeados em TfrLocalizarProduto:
            TMaskEdit (único)        → campo "Código Reduzido"
            TBitBtn   title="OK"     → confirma a busca
        """
        self._log(log, "Navegando para aba Itens...")

        # A toolbar tem um botão "Itens" que ativa o contexto de itens —
        # mais confiável do que clicar na aba pequena.
        toolbar = tela_principal.child_window(class_name="TToolBar")
        navegou = False

        # 1ª tentativa: botão "Itens" na toolbar
        try:
            toolbar.child_window(title="Itens").click_input()
            navegou = True
        except Exception:
            pass

        # 2ª tentativa: aba "Itens" no TBsPageControl por coordenadas
        # As abas são pequenas e ficam à esquerda. Do inspetor, TBsPageControl
        # está em L604, T386. Aba "Itens" fica ~90px da esquerda do controle,
        # Y≈12 (centro do strip de cabeçalhos de 24px).
        if not navegou:
            try:
                page_ctrl = tela_principal.child_window(class_name="TBsPageControl")
                page_ctrl.click_input(coords=(90, 12))
                navegou = True
            except Exception:
                pass

        # 3ª tentativa: Ctrl+Tab no page control
        if not navegou:
            try:
                page_ctrl = tela_principal.child_window(class_name="TBsPageControl")
                page_ctrl.set_focus()
                page_ctrl.type_keys("^{TAB}")
            except Exception:
                pass

        time.sleep(PAUSA)

        # button(7) da toolbar principal abre TfrCESolProdutosItens (descoberto empiricamente)
        toolbar = tela_principal.child_window(class_name="TToolBar")
        self._log(log, "  Abrindo TfrCESolProdutosItens (button 7)...")
        toolbar.button(7).click_input()
        time.sleep(PAUSA)

        from pywinauto import Desktop
        tela_item = Desktop(backend="win32").window(class_name="TfrCESolProdutosItens")
        tela_item.wait("ready", timeout=15)
        self._log(log, "  TfrCESolProdutosItens aberta.")

        for i, item in enumerate(itens):
            codigo    = item.get("codigo_produto") or ""
            descricao = item.get("descricao_produto", "")
            qtd       = str(item.get("quantidade", 1))

            self._log(log, f"  [{i+1}/{len(itens)}] {descricao}  (cód: {codigo or '—'}  qtd: {qtd})")

            # ── 0. Para o 2º item em diante: clica Novo na toolbar interna ────
            # A lupa só fica ativa após clicar Novo na TfrCESolProdutosItens.
            if i > 0:
                self._log(log, "    Clicando Novo na janela de itens...")
                try:
                    toolbar_item = tela_item.child_window(class_name="TToolBar")
                    toolbar_item.button(0).click_input()
                except Exception as e:
                    self._log(log, f"    ⚠ Novo interno falhou: {e}")
                time.sleep(PAUSA)

            # ── 1. Abre janela de busca via lupa ───────────────────────────────
            self._localizar_produto(tela_item, codigo, log)

            # ── 3. Fecha popup se produto não encontrado ───────────────────────
            if self._fechar_popup_se_existir():
                self._log(log, f"    ⚠ Produto '{codigo}' não encontrado — item ignorado.")
                # Cancela o item atual e segue para o próximo
                try:
                    tela_item.child_window(title="Cancelar", class_name="TBitBtn").click_input()
                except Exception:
                    pass
                time.sleep(PAUSA / 2)
                continue

            # ── 4. Quantidade ──────────────────────────────────────────────────
            try:
                campo_qtd = tela_item.child_window(class_name="TBsCurrencyEdit", found_index=4)
                campo_qtd.set_focus()
                campo_qtd.set_text(qtd)
                time.sleep(PAUSA / 2)
            except Exception as e:
                self._log(log, f"    ⚠ Erro ao preencher quantidade: {e}")

            # ── 5. Salvar item ─────────────────────────────────────────────────
            tela_item.child_window(title="Salvar", class_name="TBitBtn").click_input()
            time.sleep(PAUSA)
            self._fechar_popup_se_existir()

        self._log(log, f"Todos os {len(itens)} itens inseridos.")

        # ── Fecha TfrCESolProdutosItens e volta para a tela principal ──────────
        # Necessário para que o botão Tramitar fique ativo na aba Requisição.
        try:
            tela_item.type_keys("%{F4}")   # Alt+F4 fecha a janela de itens
        except Exception:
            try:
                tela_item.close()
            except Exception:
                pass
        time.sleep(PAUSA)

        # Clica na aba "Requisição" via coordenadas no TBsPageControl.
        # TBsTabSheet não é acessível diretamente — o controle pai renderiza as abas.
        # Aba Requisição é a 1ª (~x=40, y=12 no strip de cabeçalhos de 24px).
        self._clicar_aba_requisicao(tela_principal, log)
        self._log(log, "Janela de itens fechada — aba Requisição ativa.")

    def _clicar_aba_requisicao(self, tela_principal, log: LogFn | None = None) -> None:
        """
        Clica na aba 'Requisição' (1ª aba) do TBsPageControl via coordenadas.
        TBsTabSheet não é acessível via child_window — o PageControl renderiza
        o strip de cabeçalhos internamente.
        Aba Requisição fica ~x=40, y=12 (centro do strip de 24px).
        """
        try:
            page_ctrl = tela_principal.child_window(class_name="TBsPageControl")
            page_ctrl.click_input(coords=(40, 12))
            self._log(log, "  Aba Requisição clicada.")
        except Exception as e:
            self._log(log, f"  ⚠ Não foi possível clicar na aba Requisição: {e}")
        time.sleep(PAUSA)

    def _localizar_produto(self, tela_item, codigo: str, log: LogFn | None = None) -> None:
        """
        Clica na lupa (btnLocProduto) em TfrCESolProdutosItens,
        preenche o código reduzido em TfrLocalizarProduto e confirma com OK.

        TfrLocalizarProduto:
            TMaskEdit (único)    → campo "Código Reduzido" (radio já selecionado por padrão)
            TBitBtn title="OK"   → confirma
        """
        # Clica na lupa — primeiro TBitBtn do formulário (antes de Salvar/Cancelar)
        try:
            tela_item.child_window(class_name="TBitBtn", found_index=0).click_input()
        except Exception as e:
            self._log(log, f"    ⚠ Não encontrou botão lupa: {e}")
            return
        time.sleep(PAUSA)

        # Aguarda a janela de busca abrir
        from pywinauto import Desktop
        tela_busca = Desktop(backend="win32").window(class_name="TfrLocalizarProduto")
        tela_busca.wait("ready", timeout=8)

        # Garante que o radio "Código Reduzido" está selecionado (padrão)
        try:
            radio = tela_busca.child_window(title="Código Reduzido", class_name="TRadioButton")
            if not radio.get_toggle_state():
                radio.click_input()
                time.sleep(PAUSA / 4)
        except Exception:
            pass

        # Digita o código no campo TMaskEdit
        campo = tela_busca.child_window(class_name="TMaskEdit")
        campo.set_focus()
        campo.set_text(codigo)
        time.sleep(PAUSA / 2)

        # Confirma
        tela_busca.child_window(title="OK", class_name="TBitBtn").click_input()
        time.sleep(PAUSA)

    def _tramitar(self, tela, log: LogFn | None = None) -> None:
        """
        Clica em Tramitar na toolbar e confirma os dialogs de tramitação.

        TfrmEnvioDocFluxo ('Tramitação'):
            TBsLookupComboBox → destino do fluxo (já vem pré-selecionado)
            TMemo             → campo "Despacho" (deixamos em branco)
            TButton title="OK"       → confirma tramitação
            TButton title="Cancelar" → cancela
        """
        from pywinauto import Desktop

        self._log(log, "Tramitando requisição...")

        # Garante que a aba Requisição está ativa (habilita o botão Tramitar)
        self._clicar_aba_requisicao(tela, log)
        time.sleep(PAUSA)

        # ── Descobre qual botão é o Tramitar testando cada um ────────────────
        # A toolbar tem texto vazio em todos os botões; testa índices até achar
        # o que abre TfrmEnvioDocFluxo. Na aba Requisição os botões ativos ficam
        # após o separador — testa 8–13 (os que ficam após button(7)=Novo Itens).
        toolbar = tela.child_window(class_name="TToolBar")
        try:
            count = toolbar.button_count()
            rects = []
            for idx in range(count):
                try:
                    r = toolbar.button(idx).rectangle()
                    rects.append(f"[{idx}]({r.left},{r.top},{r.right},{r.bottom})")
                except Exception:
                    rects.append(f"[{idx}]?")
            self._log(log, f"  Toolbar Rects: {' '.join(rects)}")
        except Exception as e:
            self._log(log, f"  Rects falhou: {e}")
            count = 14

        # button(10)=Tramitações, button(11)=Tramitar (descoberto empiricamente).
        # Testa 11 diretamente; se falhar tenta os demais com timeout maior.
        tramitou = False
        ordem = [11, 10, 12, 13, 8, 9]
        for idx in [i for i in ordem if i < count]:
            self._log(log, f"  Tentando Tramitar via button({idx})...")
            try:
                toolbar.button(idx).click_input()
            except Exception as e:
                self._log(log, f"    click falhou: {e}")
                continue
            time.sleep(2)
            # Fecha qualquer janela que não seja TfrmEnvioDocFluxo (ex: Tramitações)
            try:
                tela_tramit = Desktop(backend="win32").window(class_name="TfrmEnvioDocFluxo")
                tela_tramit.wait("ready", timeout=6)
                self._log(log, f"  TfrmEnvioDocFluxo abriu com button({idx})!")
                tramitou = True
                break
            except Exception:
                self._log(log, f"    button({idx}) não abriu TfrmEnvioDocFluxo.")
                # Fecha qualquer janela extra que tenha aberto (ex: TfrCETramitacoes)
                try:
                    for cls in ("TfrCETramitacoes", "TfrmTramitacoes"):
                        try:
                            w = Desktop(backend="win32").window(class_name=cls)
                            if w.exists(timeout=1):
                                w.type_keys("%{F4}")
                                time.sleep(0.5)
                        except Exception:
                            pass
                except Exception:
                    pass

        if not tramitou:
            raise RuntimeError(
                "Não foi possível abrir TfrmEnvioDocFluxo. "
                "Verifique o índice do botão Tramitar na toolbar."
            )

        # ── 1. Dialog principal de tramitação (TfrmEnvioDocFluxo) ────────────
        # Destino já vem pré-selecionado; "Despacho" deixamos em branco.
        tela_tramit.child_window(title="OK", class_name="TButton").click_input()
        time.sleep(PAUSA * 1.5)
        self._log(log, "  Dialog de tramitação confirmado.")

        # ── 2. Confirmação: "Deseja tramitar?" → clicar &Sim ─────────────────
        try:
            confirmacao = Desktop(backend="win32").window(
                class_name="TMensagemCPDForm", title="Confirmação"
            )
            confirmacao.wait("ready", timeout=10)
            confirmacao.child_window(title="&Sim", class_name="TButton").click_input()
            time.sleep(PAUSA * 1.5)
            self._log(log, "  Confirmação: &Sim clicado.")
        except Exception as e:
            raise RuntimeError(f"Dialog Confirmação não apareceu: {e}")

        # ── 3. Informação: "Tramitação realizada" → clicar OK ────────────────
        try:
            informacao = Desktop(backend="win32").window(
                class_name="TMensagemCPDForm", title="Informação"
            )
            informacao.wait("ready", timeout=10)
            informacao.child_window(title="OK", class_name="TButton").click_input()
            time.sleep(PAUSA)
            self._log(log, "  Informação: OK clicado.")
        except Exception as e:
            raise RuntimeError(f"Dialog Informação não apareceu: {e}")

        self._log(log, "Requisição tramitada com sucesso.")

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

    def _resolver_janela_principal(self):
        """
        Retorna uma WindowSpecification ancorada pelo handle atual da janela
        principal do SGCA. Deve ser chamado após o login para garantir que o
        handle não seja o da tela de login (que é destruída após autenticar).
        """
        todas = self.app.windows()
        principal = next(
            (w for w in todas if self.window_title in w.window_text()),
            None
        )
        if principal is not None:
            return self.app.window(handle=principal.handle)
        return self.app.top_window()

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
