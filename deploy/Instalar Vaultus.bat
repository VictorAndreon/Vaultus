@echo off
REM Wrapper de duplo-clique para o instalador (console visivel).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
