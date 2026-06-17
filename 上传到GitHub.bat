@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "GIT=C:\Program Files\Git\bin\git.exe"
if not exist "%GIT%" set "GIT=git"

echo ========================================
echo   追番日历 - 首次提交到 Git
echo ========================================
echo.
echo 请先在 GitHub 创建空仓库 anime-season-calendar
echo 地址: https://github.com/new
echo.
set /p GITHUB_USER=输入你的 GitHub 用户名: 
if "%GITHUB_USER%"=="" (
  echo 未输入用户名，已取消。
  pause
  exit /b 1
)

"%GIT%" add .
"%GIT%" commit -m "Initial deploy setup for Cloudflare Pages"
"%GIT%" branch -M main
"%GIT%" remote remove origin 2>nul
"%GIT%" remote add origin https://github.com/%GITHUB_USER%/anime-season-calendar.git
echo.
echo 接下来会推送到 GitHub，浏览器可能要求登录。
"%GIT%" push -u origin main
echo.
echo 推送完成后，去 Cloudflare Pages 连接该仓库。详见 DEPLOY.md
pause
