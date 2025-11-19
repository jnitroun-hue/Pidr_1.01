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
git commit -m "Fix: Next.js 15 build + Auto-cleanup for FREE Vercel"
echo.
echo Details:
echo - Fixed onLoad handler in layout (Next.js 15 compatibility)
echo - Added online players indicator in main menu
echo - Auto-cleanup WITHOUT Cron (works on FREE Vercel!)
echo - Added automatic heartbeat for online status
echo - Enhanced multiplayer lobby host controls
echo - Removed vercel-cron.json (not needed)
echo.
echo Pushing to remote...
git push
echo.
echo ========================================
echo    Deploy complete! Vercel will rebuild
echo ========================================
pause

