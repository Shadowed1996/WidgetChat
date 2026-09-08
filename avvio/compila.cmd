@echo off
rem ============================================================================
rem  compila.cmd - �il pollaio� � ricostruisce ..\Pollaio.exe
rem
rem  Non installa niente e non scarica niente: usa il compilatore C# che Windows
rem  si porta dietro dal 2010 dentro C:\Windows\Microsoft.NET. Niente Visual
rem  Studio, niente SDK, niente npm.
rem
rem  Tre passaggi, e il secondo e' il trucco: per mettere l'icona nell'eseguibile
rem  serve un file .ico, che qui non c'e' - c'e' solo app\img\favicon.png. Allora
rem  compila una prima volta senza icona, si fa generare il .ico all'eseguibile
rem  appena nato (Pollaio.exe --crea-icona, che non apre nessuna finestra) e poi
rem  si ricompila con l'icona in mano. Se qualcosa va storto lungo la strada si
rem  resta senza icona, non senza launcher.
rem
rem  NOTA SULLA CODIFICA: questo file e' salvato nella tabella codici della
rem  console (850), non in UTF-8, e non chiama chcp. Un chcp a meta' file
rem  sposta il punto di lettura di cmd.exe e da li' in poi il batch va in pezzi:
rem  provato, succede davvero. Il sorgente C#, che il compilatore legge come
rem  UTF-8, resta invece in UTF-8 con la firma.
rem ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo   il pollaio � compilo il launcher
echo   ---------------------------------------------------------------

rem ---- 1. dove sta csc.exe -----------------------------------------------
rem  Prima Framework64 (l'eseguibile gira a 64 bit come tutto il resto), poi
rem  Framework a 32 bit come ripiego. La versione non si da' per scontata: si
rem  prendono tutte le cartelle v4.* e si tiene l'ultima, che in ordine
rem  alfabetico e' anche la piu' recente.

set "CSC="
for /d %%D in ("%WINDIR%\Microsoft.NET\Framework64\v4.*") do (
  if exist "%%~fD\csc.exe" set "CSC=%%~fD\csc.exe"
)
if not defined CSC (
  for /d %%D in ("%WINDIR%\Microsoft.NET\Framework\v4.*") do (
    if exist "%%~fD\csc.exe" set "CSC=%%~fD\csc.exe"
  )
)

if not defined CSC (
  echo.
  echo   Non trovo csc.exe in C:\Windows\Microsoft.NET.
  echo   Vuol dire che manca il .NET Framework 4, che di solito su Windows 10
  echo   e 11 c'e' sempre. Installalo da Windows Update e riprova.
  echo.
  pause
  exit /b 1
)

echo   Compilatore ... !CSC!

if not exist "Pollaio.cs" (
  echo.
  echo   Non trovo Pollaio.cs qui accanto. Questo file va lasciato nella
  echo   cartella avvio, insieme al sorgente.
  echo.
  pause
  exit /b 1
)

rem ---- 2. le opzioni, uguali per tutti e due i passaggi -------------------
rem  /target:winexe  applicazione con finestre: nessun prompt nero all'avvio
rem  /codepage:65001 il sorgente e' in UTF-8 (accenti nei commenti e nei testi)
rem  /optimize+      la maschera del pollo lavora su 140.000 pixel a ogni avvio

rem  /platform:x64   e non anycpu: WebView2Loader.dll e' nativa a 64 bit, e un
rem                  processo a 32 bit non la caricherebbe.

set "OPZIONI=/nologo /target:winexe /platform:x64 /optimize+ /codepage:65001"
set "OPZIONI=%OPZIONI% /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll"
set "OPZIONI=%OPZIONI% /r:..\lib\Microsoft.Web.WebView2.Core.dll /r:..\lib\Microsoft.Web.WebView2.WinForms.dll"
set "USCITA=..\Pollaio.exe"

rem  Le tre librerie di WebView2 devono stare accanto all'eseguibile. Senza, il
rem  launcher compila lo stesso ma all'avvio ripiega su Chrome: non si rompe,
rem  perde solo la finestra bella.
if not exist "..\lib\Microsoft.Web.WebView2.Core.dll" (
  echo.
  echo   ATTENZIONE: manca lib\Microsoft.Web.WebView2.Core.dll.
  echo   Senza le tre librerie di WebView2 la compilazione non riesce.
  echo.
  pause
  exit /b 1
)

echo   Passo 1 di 3 ... compilo
"!CSC!" %OPZIONI% /out:"%USCITA%" "Pollaio.cs"
if errorlevel 1 goto :fallita

rem ---- 3. l'icona ---------------------------------------------------------
if exist "..\app\img\favicon.png" (
  echo   Passo 2 di 3 ... genero l'icona da app\img\favicon.png
  "%USCITA%" --crea-icona
) else (
  echo   Passo 2 di 3 ... salto: non c'e' app\img\favicon.png
)

if exist "pollaio.ico" (
  echo   Passo 3 di 3 ... ricompilo con l'icona
  "!CSC!" %OPZIONI% /win32icon:"pollaio.ico" /out:"%USCITA%" "Pollaio.cs"
  if errorlevel 1 (
    echo.
    echo   L'icona non e' andata giu' al compilatore. Ricompilo senza: meglio un
    echo   launcher con l'icona di Windows che nessun launcher.
    "!CSC!" %OPZIONI% /out:"%USCITA%" "Pollaio.cs"
    if errorlevel 1 goto :fallita
  )
) else (
  echo   Passo 3 di 3 ... salto: nessuna icona da mettere
)

rem ---- 4. Regia.exe -------------------------------------------------------
rem  E' lo STESSO eseguibile, copiato con un altro nome. Non e' una furbizia:
rem  il programma guarda come si chiama e, se nel nome c'e' "regia", apre
rem  regia.html nella sua finestra invece di pollaio.html. Un secondo sorgente
rem  da tenere allineato a questo si scollerebbe, e mezzo launcher duplicato e'
rem  il posto dove va a nascondersi il difetto che si vede solo in uno dei due.

echo   Passo 4 di 4 ... copio Regia.exe
copy /y "%USCITA%" "..\Regia.exe" >nul
if errorlevel 1 echo   (la copia non e' riuscita: resta solo Pollaio.exe)

rem ---- 5. il resoconto ----------------------------------------------------
echo.
for %%F in ("%USCITA%") do echo   Fatto. %%~fF - %%~zF byte
echo.
echo   Ora puoi chiudere questa finestra e fare doppio clic su Pollaio.exe.
echo   Le preferenze stanno in avvio\pollaio.ini: se lo cancelli, il launcher
echo   lo riscrive da solo al primo avvio.
echo.
pause
exit /b 0

:fallita
echo.
echo   La compilazione non e' riuscita. Gli errori sono qui sopra: ogni riga
echo   dice il file, la riga e la colonna del problema.
echo.
pause
exit /b 1
