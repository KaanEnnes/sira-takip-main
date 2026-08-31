@echo off
setlocal

set "HEDEF=%~dp0"
set "REPO=https://raw.githubusercontent.com/KaanEnnes/sira-takip-main/main"
set "SELF=%~f0"

rem Once betigin kendisini guncelle: repodaki guncelle.bat degismisse
rem indirip uzerine yaz ve yeni surumle yeniden baslat. Boylece elindeki
rem eski guncelle.bat dosyasi hep calisir, elle yenilemene gerek kalmaz.
curl -fsSL "%REPO%/guncelle.bat?_=%RANDOM%" -o "%TEMP%\snr_guncelle_yeni.bat" >nul 2>&1
if not errorlevel 1 (
  fc /b "%SELF%" "%TEMP%\snr_guncelle_yeni.bat" >nul 2>&1
  if errorlevel 1 (
    copy /y "%TEMP%\snr_guncelle_yeni.bat" "%SELF%" >nul
    del "%TEMP%\snr_guncelle_yeni.bat" >nul 2>&1
    echo Guncelleme betigi yenilendi, yeniden baslatiliyor...
    start "" cmd /c "call "%SELF%""
    exit /b 0
  )
  del "%TEMP%\snr_guncelle_yeni.bat" >nul 2>&1
)

echo ============================================
echo   Site Sira Takip - Guncelleme
echo ============================================
echo.
echo Dosyalar indiriliyor...

curl -fsSL "%REPO%/manifest.json?_=%RANDOM%" -o "%HEDEF%manifest.json"
if errorlevel 1 goto hata

curl -fsSL "%REPO%/content.js?_=%RANDOM%" -o "%HEDEF%content.js"
if errorlevel 1 goto hata

curl -fsSL "%REPO%/background.js?_=%RANDOM%" -o "%HEDEF%background.js"
if errorlevel 1 goto hata

if not exist "%HEDEF%pdfjs" mkdir "%HEDEF%pdfjs"

curl -fsSL "%REPO%/pdfjs/pdf.min.mjs?_=%RANDOM%" -o "%HEDEF%pdfjs\pdf.min.mjs"
if errorlevel 1 goto hata

curl -fsSL "%REPO%/pdfjs/pdf.worker.min.mjs?_=%RANDOM%" -o "%HEDEF%pdfjs\pdf.worker.min.mjs"
if errorlevel 1 goto hata

if not exist "%HEDEF%icons" mkdir "%HEDEF%icons"

curl -fsSL "%REPO%/icons/icon16.png?_=%RANDOM%" -o "%HEDEF%icons\icon16.png"
if errorlevel 1 goto hata

curl -fsSL "%REPO%/icons/icon48.png?_=%RANDOM%" -o "%HEDEF%icons\icon48.png"
if errorlevel 1 goto hata

curl -fsSL "%REPO%/icons/icon128.png?_=%RANDOM%" -o "%HEDEF%icons\icon128.png"
if errorlevel 1 goto hata

echo.
echo Guncelleme tamamlandi.
echo Simdi chrome://extensions sayfasina git ve
echo "Bella Yazilim Sira Takip" kartindaki yenile (o) ikonuna bas.
echo.
pause
exit /b 0

:hata
echo.
echo HATA: Dosyalar indirilemedi. Internet baglantini kontrol et.
echo.
pause
exit /b 1
