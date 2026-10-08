@echo off
setlocal DisableDelayedExpansion
set "PROJECT_ROOT=%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required to run the source preview.
  echo Install Node.js, then run this launcher again.
  pause
  exit /b 1
)
if not exist "%PROJECT_ROOT%node_modules\tsx\dist\cli.mjs" (
  echo Project dependencies are missing from:
  echo "%PROJECT_ROOT%node_modules"
  echo Run npm.cmd ci from the project directory, then run this launcher again.
  pause
  exit /b 1
)
node "%PROJECT_ROOT%scripts\run-test-preview.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo The V6.5 source preview stopped with exit code %EXIT_CODE%.
  pause
)
exit /b %EXIT_CODE%
