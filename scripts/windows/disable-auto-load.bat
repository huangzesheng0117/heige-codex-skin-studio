@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0disable-auto-load.ps1" %*
if errorlevel 1 pause
