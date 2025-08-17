@echo off
if "%~1"=="" (
    echo Usage: %~nx0 ^<file path^>
    exit /b 1
)

.\pixelplacejs\node_windows\node.exe .\pixelplacejs\dist\PPScript.js %*