@echo off
title Vortex Gym - System Startup
color 0A
setlocal

:: ============================================================
::  CONFIGURATION - Edit these if your paths are different
:: ============================================================
set XAMPP_DIR=C:\xampp
set BRIDGE_DIR=%~dp0zkteco-bridge
set NGROK_DOMAIN=untransparent-daniele-unintricately.ngrok-free.dev

:: The local port XAMPP Apache runs on (usually 80)
set APACHE_PORT=80

:: ============================================================
echo.
echo  ============================================
echo    Vortex Gym - Master Startup
echo  ============================================
echo.

:: -------------------------------------------------------
:: STEP 1: Start XAMPP (Apache + MySQL)
:: -------------------------------------------------------
echo [1/3] Starting XAMPP services...

if exist "%XAMPP_DIR%\xampp_start.exe" (
    echo [INFO] XAMPP found at %XAMPP_DIR%
) else (
    echo [WARN] XAMPP not found at %XAMPP_DIR%. Assuming it is already running.
    goto start_bridge
)

:: Start Apache (silently, in background)
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I "httpd.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [OK]   Apache is already running.
) else (
    start "" "%XAMPP_DIR%\apache\bin\httpd.exe"
    timeout /t 3 /nobreak >nul
    echo [OK]   Apache started.
)

:: Start MySQL (silently, in background)
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [OK]   MySQL is already running.
) else (
    start "" "%XAMPP_DIR%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP_DIR%\mysql\bin\my.ini"
    timeout /t 3 /nobreak >nul
    echo [OK]   MySQL started.
)

:start_bridge
echo.

:: -------------------------------------------------------
:: STEP 2: Start ZKTeco Bridge (in its own window)
:: -------------------------------------------------------
echo [2/3] Starting ZKTeco Bridge...

if not exist "%BRIDGE_DIR%\index.js" goto skip_bridge

:: Launch bridge in a new window so it keeps running and the logs are visible
start "ZKTeco Bridge Logs" cmd /k "color 0B && title ZKTeco Bridge Console && echo ==== ZKTeco Bridge Starting ==== && cd /d ""%BRIDGE_DIR%"" && node index.js"
echo [OK]   ZKTeco Bridge started in a new visible window.
goto check_bridge_done

:skip_bridge
echo [WARN] ZKTeco bridge not found at: "%BRIDGE_DIR%"
echo        Skipping Bridge Startup.

:check_bridge_done
echo.

:: Wait a moment for the bridge to initialize
timeout /t 3 /nobreak >nul

:: -------------------------------------------------------
:: STEP 3: Start Ngrok Tunnel
:: -------------------------------------------------------
echo [3/3] Starting Ngrok tunnel...
echo.

:: Check ngrok is in PATH (like Microsoft Store) or current directory
where ngrok >nul 2>&1
if %ERRORLEVEL% EQU 0 goto ngrok_global
if exist "%~dp0ngrok.exe" goto ngrok_local
goto ngrok_error

:ngrok_global
echo [OK]   Found ngrok in system path (Microsoft Store/global install).
set NGROK_EXE=ngrok
goto ngrok_done

:ngrok_local
echo [OK]   Found ngrok.exe in current folder.
set NGROK_EXE="%~dp0ngrok.exe"
goto ngrok_done

:ngrok_error
echo [ERROR] ngrok not found!
echo.
echo  HOW TO FIX:
echo  1. You can install it from the Microsoft Store (search 'ngrok')
echo  2. OR download from: https://ngrok.com/download and place ngrok.exe here
echo.
pause
exit /b 1

:ngrok_done

echo  ============================================
echo    PUBLIC URL (share this with the Boss):
echo    https://%NGROK_DOMAIN%
echo  ============================================
echo.
echo  All services are running. Close this window to STOP the tunnel.
echo  (The ZKTeco Bridge window can be closed separately.)
echo.

:: Start ngrok in a new persistent window with your static domain, tunneling to local Apache
start "Ngrok Tunnel" cmd /k "%NGROK_EXE% http --url=%NGROK_DOMAIN% %APACHE_PORT%"
echo.
echo [INFO] All separate windows have successfully launched!
echo [INFO] You can minimize this green window now.
pause >nul
