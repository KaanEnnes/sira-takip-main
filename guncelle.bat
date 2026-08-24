@echo off
setlocal

set "HEDEF=%~dp0"
set "REPO=https://raw.githubusercontent.com/KaanEnnes/sira-takip-main/main"

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

echo.
echo Guncelleme tamamlandi.
echo Simdi chrome://extensions sayfasina git ve
echo "Site Sira Takip" kartindaki yenile (o) ikonuna bas.
echo.
pause
exit /b 0

:hata
echo.
echo HATA: Dosyalar indirilemedi. Internet baglantini kontrol et.
echo.
pause
exit /b 1
