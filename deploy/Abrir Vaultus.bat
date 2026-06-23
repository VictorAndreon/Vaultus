@echo off
REM Wrapper diario: roda o launcher sem janela preta.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0abrir.ps1"
