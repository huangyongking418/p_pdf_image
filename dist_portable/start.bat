@echo off
chcp 65001 >nul

title PPT TO Image
echo ========================================
echo   PPT TO Image - Portable v1.0
echo ========================================
echo.
set "APP_DIR=%~dp0"
set "PORT=3456"

echo [*] Starting server on http://localhost:%PORT%
echo [*] Server started! Open your browser to http://localhost:%PORT%
echo [*] Press Ctrl+C to stop the server
echo.

start http://localhost:%PORT%
"%APP_DIR%node\node.exe" "%APP_DIR%server\index.js"

echo.
echo Server stopped.
pause
