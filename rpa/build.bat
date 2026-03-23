@echo off
chcp 65001 > nul
echo ============================================================
echo  SICCR2 — Gerador de Executável
echo ============================================================
echo.

:: Verifica se Python está instalado
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale em https://python.org
    pause
    exit /b 1
)

echo [1/3] Instalando dependencias...
pip install -r requirements.txt --quiet
pip install pyinstaller --quiet
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo       OK

echo.
echo [2/3] Gerando executavel...
pyinstaller --noconfirm --onedir --windowed ^
    --name "SICCR2-Almoxarifado" ^
    --collect-data customtkinter ^
    --hidden-import pywinauto ^
    --hidden-import pywinauto.backends ^
    --hidden-import pywinauto.backends.win32 ^
    main.py

if errorlevel 1 (
    echo [ERRO] Falha ao gerar executavel.
    pause
    exit /b 1
)
echo       OK

echo.
echo [3/3] Copiando config.json para a pasta de distribuicao...
copy /Y config.json "dist\SICCR2-Almoxarifado\config.json" > nul
echo       OK

echo.
echo ============================================================
echo  Concluido!
echo.
echo  Executavel gerado em:
echo    dist\SICCR2-Almoxarifado\SICCR2-Almoxarifado.exe
echo.
echo  Para distribuir para a SID:
echo    1. Copie a pasta  dist\SICCR2-Almoxarifado\  para o computador da SID
echo    2. Edite o arquivo  config.json  com a API Key e o caminho do SIE
echo    3. Clique duas vezes em  SICCR2-Almoxarifado.exe
echo ============================================================
echo.
pause
