@echo off
setlocal
cd /d "%~dp0"

rem Prefer the installed Codex runtime; no global PATH change is required.
set "MANIN_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%MANIN_NODE%" (
  where node.exe >nul 2>nul
  if errorlevel 1 (
    echo Node.js 22 ou superior nao encontrado.
    exit /b 1
  )
  set "MANIN_NODE=node.exe"
)

if not exist "node_modules\next\dist\bin\next" (
  echo As dependencias do Manin ainda nao foram instaladas.
  echo Instale-as com pnpm install antes de iniciar.
  exit /b 1
)

echo Iniciando o Manin. Mantenha este terminal aberto.
echo Use o endereco exibido abaixo com /demo para abrir a demonstracao.
"%MANIN_NODE%" "node_modules\next\dist\bin\next" dev --hostname 0.0.0.0 %*
exit /b %errorlevel%
