@echo off

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo   il pollaio � compilo il launcher
echo   ---------------------------------------------------------------


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



set "OPZIONI=/nologo /target:winexe /platform:x64 /optimize+ /codepage:65001"
set "OPZIONI=%OPZIONI% /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll"
set "OPZIONI=%OPZIONI% /r:..\lib\Microsoft.Web.WebView2.Core.dll /r:..\lib\Microsoft.Web.WebView2.WinForms.dll"
set "USCITA=..\Pollaio.exe"

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


echo   Passo 4 di 4 ... copio Regia.exe
copy /y "%USCITA%" "..\Regia.exe" >nul
if errorlevel 1 echo   (la copia non e' riuscita: resta solo Pollaio.exe)

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
