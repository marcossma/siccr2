"""
Ferramenta de inspeção do GCANavegacao / SIE.

Como usar:
    1. Abra o GCANavegacao normalmente (pelo atalho de rede)
    2. Navegue até a tela que deseja mapear
    3. Execute este script: python inspecionar_sie.py
    4. Copie a saída e envie para o desenvolvedor

Requer: pip install pywinauto
"""

import sys
import time

try:
    from pywinauto import Application, Desktop
    from pywinauto.findwindows import ElementNotFoundError
except ImportError:
    print("ERRO: pywinauto não instalado.")
    print("Execute: pip install pywinauto")
    input("\nPressione Enter para sair...")
    sys.exit(1)


def listar_janelas_abertas():
    """Lista todas as janelas abertas no momento."""
    print("\n" + "="*60)
    print("  JANELAS ABERTAS NO MOMENTO")
    print("="*60)
    desktop = Desktop(backend="win32")
    for janela in desktop.windows():
        try:
            titulo = janela.window_text()
            classe = janela.class_name()
            if titulo.strip():
                print(f"  Título : {titulo!r}")
                print(f"  Classe : {classe}")
                print()
        except Exception:
            pass


def inspecionar_janela(titulo_parcial: str):
    """Mostra todos os controles de janelas que contenham o título parcial."""
    desktop = Desktop(backend="win32")
    janelas = [
        w for w in desktop.windows()
        if titulo_parcial.lower() in w.window_text().lower() and w.window_text().strip()
    ]

    if not janelas:
        print(f"\n  Janela com '{titulo_parcial}' não encontrada.")
        print("  Verifique se o GCA está aberto e tente novamente.")
        return

    for idx, janela in enumerate(janelas):
        print("\n" + "="*60)
        print(f"  JANELA {idx + 1} de {len(janelas)}: {janela.window_text()!r}")
        print("="*60)
        try:
            print(f"\n  Título completo : {janela.window_text()!r}")
            print(f"  Classe          : {janela.class_name()}")
            print("\n  Controles filhos:")
            print("  " + "-"*50)
            # Conecta pelo handle exato para evitar ambiguidade
            app = Application(backend="win32").connect(handle=janela.handle)
            app.window(handle=janela.handle).print_control_identifiers()
        except Exception as e:
            print(f"\n  Erro ao inspecionar: {e}")


if __name__ == "__main__":
    print()
    print("  SICCR2 — Inspetor do GCANavegacao/SIE")
    print()
    print("  Certifique-se de que o GCA está aberto antes de continuar.")
    input("  Pressione Enter para listar as janelas abertas...")

    listar_janelas_abertas()

    print()
    titulo = input(
        "  Digite parte do título da janela que deseja inspecionar\n"
        "  (ou deixe em branco para usar 'GCA'): "
    ).strip() or "GCA"

    inspecionar_janela(titulo)

    print()
    input("  Pressione Enter para sair...")
