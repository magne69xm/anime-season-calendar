@echo off
chcp 65001 >nul
title 追番日历网站
cd /d "%~dp0"

echo.
echo 正在关闭旧的网站进程（避免 8080 端口冲突）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo 正在启动追番日历网站...
echo 启动成功后浏览器会自动打开。
echo.
echo 如果浏览器没有自动打开，请手动访问：
echo http://localhost:8080
echo.
echo 重要：只保留这一个黑色窗口，不要重复双击本文件。
echo 关闭这个黑色窗口，网站就会停止。
echo.

start "" "http://localhost:8080"
python server.py
pause
