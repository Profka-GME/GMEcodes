@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\publish-site.ps1" %*
if errorlevel 1 (
    echo.
    echo Update failed. Fix the error above and run again.
    pause
    exit /b 1
)

echo.
echo Update complete.
pause
