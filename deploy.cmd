@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo    P.I.D.R. Game - Deploy Script
echo ========================================
echo.
echo Adding changed files...
git add .
echo.
echo Committing changes...
git commit -m "Fix: Crypto payments to sellers + Mobile wallets + Online"
echo.
echo Details:
echo - Crypto payments go to SELLERS (from DB) not platform!
echo - Fixed TON payment (openLink, seller address from DB)
echo - Fixed Solana mobile (phantom:// deep link)
echo - Added wallet check before selling for crypto
echo - Added online players indicator in main menu
echo - Auto-cleanup WITHOUT Cron (works on FREE Vercel!)
echo - Added automatic heartbeat for online status
echo - Enhanced multiplayer lobby host controls
echo.
echo Pushing to remote...
git push
echo.
echo ========================================
echo    Deploy complete! Vercel will rebuild
echo ========================================
pause

