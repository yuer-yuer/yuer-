@echo off
chcp 65001 >nul
title 减脂健康助手
cd /d "%~dp0"
echo.
echo  ╔══════════════════════════════════════╗
echo  ║      减脂健康助手 - 启动中...         ║
echo  ╚══════════════════════════════════════╝
echo.
node server.js
