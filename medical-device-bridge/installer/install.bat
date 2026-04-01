@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "INSTALLER_BUILD_ID=2026-03-25-r19"

:: ============================================================================
:: ElementMedica - Medical Device Bridge - Installazione Windows
:: ============================================================================
:: Questo script installa il Medical Device Bridge e lo avvia.
:: La configurazione avviene automaticamente tramite codice di attivazione.
:: ============================================================================

title ElementMedica - Installazione Medical Device Bridge

echo.
echo +==============================================================+
echo ^|        ElementMedica - Medical Device Bridge                ^|
echo ^|              Installazione Guidata                          ^|
echo +==============================================================+
echo ^| Build: %INSTALLER_BUILD_ID%                                     ^|
echo +==============================================================+
echo.

:: ============================================================================
:: STEP 0: Sblocca file scaricati da internet (rimuove Zone.Identifier)
:: ============================================================================
powershell -NoProfile -Command "Get-ChildItem -Path '%~dp0' -Recurse | Unblock-File" 2>nul

:: ============================================================================
:: STEP 1: Verifica cartella di installazione
:: ============================================================================
set "INSTALL_DIR=%LOCALAPPDATA%\ElementMedica\MedicalDeviceBridge"

echo [1/4] Preparazione cartella di installazione...
echo       Percorso: %INSTALL_DIR%
echo.

if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    if errorlevel 1 (
        echo [ERRORE] Impossibile creare la cartella di installazione.
        echo          Verificare i permessi di scrittura.
        pause
        exit /b 1
    )
)

:: Crea sottocartelle necessarie
if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"
if not exist "%INSTALL_DIR%\data" mkdir "%INSTALL_DIR%\data"
set "RUNTIME_LOG=%INSTALL_DIR%\logs\bridge-runtime.log"
set "RUNTIME_ERR_LOG=%INSTALL_DIR%\logs\bridge-runtime-error.log"
set "INSTALLER_LOG=%INSTALL_DIR%\logs\installer-debug.log"
set "HEALTHCHECK_OK=0"

echo [%DATE% %TIME%] Installer started > "%INSTALLER_LOG%"
echo [%DATE% %TIME%] Installer build: %INSTALLER_BUILD_ID% >> "%INSTALLER_LOG%"
echo [%DATE% %TIME%] Install dir: %INSTALL_DIR% >> "%INSTALLER_LOG%"

:: ============================================================================
:: STEP 2: Copia eseguibile Bridge
:: ============================================================================
echo [2/4] Installazione Medical Device Bridge...

:: Cerca l'eseguibile nella stessa cartella del batch
set "BRIDGE_EXE=%~dp0medical-bridge-win.exe"
if exist "%BRIDGE_EXE%" goto :BRIDGE_EXE_FOUND

set "BRIDGE_EXE=%~dp0dist\medical-bridge-win.exe"
if exist "%BRIDGE_EXE%" goto :BRIDGE_EXE_FOUND

echo [%DATE% %TIME%] ERROR executable not found in installer package >> "%INSTALLER_LOG%"
echo [ERRORE] Eseguibile Bridge non trovato nella cartella corrente.
echo.
echo     Assicurarsi di aver estratto TUTTI i file dallo ZIP scaricato:
echo       - install.bat
echo       - medical-bridge-win.exe
echo       - GUIDA-INSTALLAZIONE.txt
echo.
echo     Se il problema persiste, scaricare nuovamente il pacchetto
echo     dalla sezione Impostazioni della webapp ElementMedica.
echo.
pause
exit /b 1

:BRIDGE_EXE_FOUND
echo [%DATE% %TIME%] Bridge executable found: %BRIDGE_EXE% >> "%INSTALLER_LOG%"
echo [%DATE% %TIME%] Copying executable to: %INSTALL_DIR%\medical-bridge.exe >> "%INSTALLER_LOG%"
taskkill /IM "medical-bridge.exe" /F >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Existing medical-bridge.exe process terminated before copy >> "%INSTALLER_LOG%"
)
taskkill /IM "medical-bridge-win.exe" /F >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Existing medical-bridge-win.exe process terminated before copy >> "%INSTALLER_LOG%"
)
timeout /t 1 /nobreak >nul

if exist "%INSTALL_DIR%\medical-bridge.exe" (
    attrib -R "%INSTALL_DIR%\medical-bridge.exe" >nul 2>&1
    del /F /Q "%INSTALL_DIR%\medical-bridge.exe" >nul 2>&1
)

set "COPY_ATTEMPT=0"
:COPY_EXE_RETRY
set /a COPY_ATTEMPT+=1
copy /Y "%BRIDGE_EXE%" "%INSTALL_DIR%\medical-bridge.exe" >nul
if not errorlevel 1 goto :COPY_EXE_OK
echo [%DATE% %TIME%] WARNING copy attempt %COPY_ATTEMPT% failed for medical-bridge.exe >> "%INSTALLER_LOG%"
if %COPY_ATTEMPT% LSS 3 (
    timeout /t 2 /nobreak >nul
    goto :COPY_EXE_RETRY
)

echo [%DATE% %TIME%] INFO trying PowerShell Copy-Item fallback >> "%INSTALLER_LOG%"
powershell -NoProfile -Command "try { Copy-Item -LiteralPath '%BRIDGE_EXE%' -Destination '%INSTALL_DIR%\medical-bridge.exe' -Force -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Impossibile copiare l'eseguibile (file in uso o permessi insufficienti).
    echo [%DATE% %TIME%] ERROR copying executable to %INSTALL_DIR%\medical-bridge.exe after retries >> "%INSTALLER_LOG%"
    echo [%DATE% %TIME%] ERROR source=%BRIDGE_EXE% destination=%INSTALL_DIR%\medical-bridge.exe >> "%INSTALLER_LOG%"
    pause
    exit /b 1
)

:COPY_EXE_OK
echo [%DATE% %TIME%] Copy completed successfully >> "%INSTALLER_LOG%"
echo       [OK] Eseguibile Bridge installato
echo [%DATE% %TIME%] STEP 3 start: creating launcher and startup shortcut >> "%INSTALLER_LOG%"

:: ============================================================================
:: STEP 3: Crea collegamento e avvio automatico
:: ============================================================================
echo.
echo [3/4] Configurazione avvio automatico...

:: Crea script di avvio
set "LAUNCHER_FILE=%INSTALL_DIR%\avvia-bridge.bat"
echo @echo off > "%LAUNCHER_FILE%"
echo cd /d "%INSTALL_DIR%" >> "%LAUNCHER_FILE%"
echo if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs" >> "%LAUNCHER_FILE%"
echo echo [%%DATE%% %%TIME%%] Launch script started ^>^> "%INSTALLER_LOG%" >> "%LAUNCHER_FILE%"
echo echo [%%DATE%% %%TIME%%] Running medical-bridge.exe ^>^> "%INSTALLER_LOG%" >> "%LAUNCHER_FILE%"
echo "%INSTALL_DIR%\medical-bridge.exe" ^>^> "%INSTALL_DIR%\logs\bridge-runtime.log" 2^>^&1 >> "%LAUNCHER_FILE%"
echo set "EXIT_CODE=%%ERRORLEVEL%%" >> "%LAUNCHER_FILE%"
echo echo [%%DATE%% %%TIME%%] medical-bridge.exe exited with code %%EXIT_CODE%% ^>^> "%INSTALLER_LOG%" >> "%LAUNCHER_FILE%"

if errorlevel 1 (
    echo [%DATE% %TIME%] ERROR creating launcher file: %LAUNCHER_FILE% >> "%INSTALLER_LOG%"
    echo [ERRORE] Impossibile creare lo script di avvio del Bridge.
    echo Controllare i permessi sulla cartella:
    echo   %INSTALL_DIR%
    pause
    exit /b 1
)

echo [%DATE% %TIME%] Launcher file created: %LAUNCHER_FILE% >> "%INSTALLER_LOG%"

:: Crea collegamento nella cartella Startup per avvio automatico
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_LINK=%STARTUP_DIR%\ElementMedica Bridge.lnk"
powershell -NoProfile -Command "try { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_LINK%'); $s.TargetPath = '%INSTALL_DIR%\avvia-bridge.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'ElementMedica Medical Device Bridge'; $s.WindowStyle = 7; $s.Save(); if (Test-Path '%STARTUP_LINK%') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if exist "%STARTUP_LINK%" (
    echo       [OK] Avvio automatico configurato
    echo [%DATE% %TIME%] Startup shortcut created in: %STARTUP_DIR% >> "%INSTALLER_LOG%"
) else (
    echo [AVVISO] Impossibile configurare l'avvio automatico.
    echo          Per avviare il Bridge manualmente, eseguire:
    echo          %INSTALL_DIR%\avvia-bridge.bat
    echo [%DATE% %TIME%] WARNING failed to create startup shortcut >> "%INSTALLER_LOG%"
)

:: Fallback: registra anche avvio automatico via chiave Run utente
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ElementMedicaBridge" /t REG_SZ /d "\"%INSTALL_DIR%\avvia-bridge.bat\"" /f >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Run registry autostart key configured >> "%INSTALLER_LOG%"
) else (
    echo [%DATE% %TIME%] WARNING failed to configure Run registry autostart key >> "%INSTALLER_LOG%"
)

:: ============================================================================
:: STEP 4: Aggiungi eccezione Windows Firewall per il Bridge
:: ============================================================================
echo.
echo [4/4] Configurazione firewall...
echo [%DATE% %TIME%] STEP 4 start: firewall rule check >> "%INSTALLER_LOG%"
echo [%DATE% %TIME%] STEP 4 using powershell firewall flow >> "%INSTALLER_LOG%"
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; if (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue) { $r = Get-NetFirewallRule -DisplayName 'ElementMedica Bridge' -ErrorAction SilentlyContinue; if ($r) { exit 11 } ; try { New-NetFirewallRule -DisplayName 'ElementMedica Bridge' -Direction Inbound -Program '%INSTALL_DIR%\medical-bridge.exe' -Action Allow -Profile Private -ErrorAction Stop ^| Out-Null; exit 10 } catch { exit 13 } } else { exit 12 }" >nul 2>&1
set "FW_PS_RC=%ERRORLEVEL%"
echo [%DATE% %TIME%] STEP 4 powershell firewall exit code: %FW_PS_RC% >> "%INSTALLER_LOG%"

if "%FW_PS_RC%"=="10" goto :FIREWALL_RULE_ADDED
if "%FW_PS_RC%"=="11" goto :FIREWALL_RULE_PRESENT
if "%FW_PS_RC%"=="12" goto :FIREWALL_CMD_NOT_AVAILABLE
goto :FIREWALL_ADD_FAILED

:FIREWALL_RULE_ADDED
echo       [OK] Eccezione firewall aggiunta
echo [%DATE% %TIME%] Firewall rule added via powershell >> "%INSTALLER_LOG%"
goto :FIREWALL_RULE_DONE

:FIREWALL_RULE_PRESENT
echo       [OK] Eccezione firewall gia' presente
echo [%DATE% %TIME%] Firewall rule already present >> "%INSTALLER_LOG%"
goto :FIREWALL_RULE_DONE

:FIREWALL_CMD_NOT_AVAILABLE
echo [NOTA] Cmdlet firewall non disponibili su questo sistema.
echo        Si continua senza modifica firewall.
echo [%DATE% %TIME%] WARNING firewall cmdlets unavailable, continuing >> "%INSTALLER_LOG%"
goto :FIREWALL_RULE_DONE

:FIREWALL_ADD_FAILED
echo [NOTA] Eccezione firewall non aggiunta - diritti insufficienti o policy sistema.
echo        Si continua con l'avvio del Bridge.
echo [%DATE% %TIME%] WARNING firewall add failed, continuing >> "%INSTALLER_LOG%"

:FIREWALL_RULE_DONE
echo [%DATE% %TIME%] STEP 4 completed, continuing to bridge startup >> "%INSTALLER_LOG%"

:: ============================================================================
:: Riepilogo e avvio
:: ============================================================================
echo.
echo +==============================================================+
echo ^|              Installazione completata!                      ^|
echo +==============================================================+
echo.
echo   Cartella installazione: %INSTALL_DIR%
echo.
echo   Il Bridge si sta avviando e aprira' automaticamente il browser
echo   per la configurazione guidata.
echo.
echo   Servira' il codice di attivazione fornito dall'amministratore
echo   della webapp ElementMedica (formato: ELEM-XXXX-XXXX-XXXX).
echo.
echo   NOTA: Se Windows mostra un avviso di protezione, cliccare su
echo         "Ulteriori informazioni" e poi "Esegui comunque".
echo.
echo ===============================================================
echo.

:: Sblocca l'eseguibile installato
powershell -NoProfile -Command "Unblock-File -Path '%INSTALL_DIR%\medical-bridge.exe'" 2>nul

:: Avvia il Bridge (apre la pagina di attivazione nel browser)
echo Avvio del Medical Device Bridge...
echo.
cd /d "%INSTALL_DIR%"

:: Arresta eventuale processo precedente per evitare conflitti all'avvio
taskkill /IM "medical-bridge.exe" /F >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Previous medical-bridge.exe process terminated before startup >> "%INSTALLER_LOG%"
    timeout /t 1 /nobreak >nul
)

start "ElementMedica Bridge" "%INSTALL_DIR%\avvia-bridge.bat"
if errorlevel 1 (
    echo [%DATE% %TIME%] WARNING start command returned error for launcher >> "%INSTALLER_LOG%"
    :: Wait briefly — on some Windows versions 'start' launches the bat despite errorlevel 1
    timeout /t 3 /nobreak >nul
    tasklist /FI "IMAGENAME eq medical-bridge.exe" 2>nul | find /I "medical-bridge.exe" >nul 2>&1
    if not errorlevel 1 (
        echo [%DATE% %TIME%] Bridge exe already running after start cmd — skipping PS fallback to avoid double-launch >> "%INSTALLER_LOG%"
        goto :LAUNCH_COMMAND_DONE
    )
    echo [%DATE% %TIME%] ERROR start command failed for launcher >> "%INSTALLER_LOG%"
    echo [AVVISO] Avvio launcher non confermato dal comando START.
    echo         Provo avvio con PowerShell Start-Process...
    powershell -NoProfile -Command "try { Start-Process -FilePath '%INSTALL_DIR%\avvia-bridge.bat' -WorkingDirectory '%INSTALL_DIR%' -WindowStyle Hidden; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        echo [%DATE% %TIME%] Fallback launcher start via PowerShell succeeded >> "%INSTALLER_LOG%"
        goto :LAUNCH_COMMAND_DONE
    )
    echo [%DATE% %TIME%] ERROR fallback launcher start via PowerShell failed >> "%INSTALLER_LOG%"
    echo         Eseguo verifica diretta del Bridge...
    set "DIRECT_START_RESULT="
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$outLog='%RUNTIME_LOG%'; $errLog='%RUNTIME_ERR_LOG%'; $p = Start-Process -FilePath '%INSTALL_DIR%\medical-bridge.exe' -WorkingDirectory '%INSTALL_DIR%' -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru; Start-Sleep -Seconds 5; if ($p.HasExited) { Write-Output ('EXIT_CODE=' + $p.ExitCode) } else { Stop-Process -Id $p.Id -Force; Write-Output 'RUNNING_AFTER_5S' }"`) do set "DIRECT_START_RESULT=%%I"
    echo [%DATE% %TIME%] Direct startup diagnostic result: %DIRECT_START_RESULT% >> "%INSTALLER_LOG%"
    if /I "%DIRECT_START_RESULT%"=="RUNNING_AFTER_5S" (
        echo [OK] Bridge avviabile rilevato dal test diretto. Proseguo con i controlli.
        goto :LAUNCH_COMMAND_DONE
    )
    echo [ERRORE] Impossibile avviare il launcher del Bridge.
    echo Verificare i log:
    echo   %RUNTIME_LOG%
    echo   %RUNTIME_ERR_LOG%
    echo   %INSTALLER_LOG%
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Launch command executed (start avvia-bridge.bat) >> "%INSTALLER_LOG%"
:LAUNCH_COMMAND_DONE

:: Attende avvio effettivo (fino a 30 secondi)
setlocal EnableDelayedExpansion
set "ATTEMPT=0"
:WAIT_FOR_BRIDGE
set /a ATTEMPT+=1
timeout /t 2 /nobreak >nul
echo [%DATE% %TIME%] Startup check attempt !ATTEMPT! >> "%INSTALLER_LOG%"

tasklist /FI "IMAGENAME eq medical-bridge.exe" | find /I "medical-bridge.exe" >nul
if not errorlevel 1 goto :BRIDGE_STARTED

if !ATTEMPT! LSS 15 goto :WAIT_FOR_BRIDGE

:BRIDGE_NOT_RUNNING
echo [%DATE% %TIME%] ERROR bridge process not found after startup wait >> "%INSTALLER_LOG%"
echo [%DATE% %TIME%] Running direct startup diagnostic for medical-bridge.exe >> "%INSTALLER_LOG%"
powershell -NoProfile -Command "$outLog='%RUNTIME_LOG%'; $errLog='%RUNTIME_ERR_LOG%'; $p = Start-Process -FilePath '%INSTALL_DIR%\medical-bridge.exe' -WorkingDirectory '%INSTALL_DIR%' -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru; Start-Sleep -Seconds 6; if ($p.HasExited) { Write-Output ('DIRECT_RUN_EXIT_CODE=' + $p.ExitCode) } else { Stop-Process -Id $p.Id -Force; Write-Output 'DIRECT_RUN_STAYED_UP_6S' }" >> "%INSTALLER_LOG%" 2>&1
    echo [ERRORE] Il Bridge si e' chiuso subito dopo l'avvio.
    echo.
    echo Possibili cause:
    echo   - antivirus/SmartScreen ha bloccato l'eseguibile
    echo   - file incompleti o corrotti nello ZIP estratto
    echo   - porta locale occupata o errore di runtime
    echo.
    echo Verificare il log:
    echo   %RUNTIME_LOG%
    echo   %RUNTIME_ERR_LOG%
    echo   %INSTALLER_LOG%
    echo.
    if exist "%RUNTIME_LOG%" (
        echo Ultime righe log:
        powershell -NoProfile -Command "Get-Content -Path '%RUNTIME_LOG%' -Tail 20" 2>nul
    ) else (
        echo Nessun log disponibile: probabile blocco prima dell'esecuzione.
        echo Provare a rieseguire come amministratore e consentire l'esecuzione in SmartScreen/antivirus.
        echo Ultime righe installer log:
        if exist "%INSTALLER_LOG%" powershell -NoProfile -Command "Get-Content -Path '%INSTALLER_LOG%' -Tail 20" 2>nul
    )
    echo.
    pause
    exit /b 1

:BRIDGE_STARTED
echo [%DATE% %TIME%] Bridge process detected as running >> "%INSTALLER_LOG%"

:: Check 2: endpoint health locale
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/health' -TimeoutSec 3; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    set "HEALTHCHECK_OK=1"
)

if "%HEALTHCHECK_OK%"=="1" (
    echo [%DATE% %TIME%] Health check passed >> "%INSTALLER_LOG%"
    echo [OK] Bridge avviato correttamente e raggiungibile su localhost:3000
) else (
    echo [%DATE% %TIME%] Health check did not pass immediately >> "%INSTALLER_LOG%"
    echo [AVVISO] Processo avviato ma health check locale non riuscito immediatamente.
    echo          Attendere 10 secondi e poi usare "Esegui diagnostica" nella webapp.
)

pause
