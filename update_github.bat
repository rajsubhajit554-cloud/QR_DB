@echo off
setlocal enabledelayedexpansion
title GitHub Updater - QR STUDIO

echo ===================================================
echo           GitHub a Update Korar Script
echo ===================================================
echo.

:: Ensure working directory is the script directory
cd /d "%~dp0"

echo [1/4] Checking file changes...
git status --short
echo.

:: Ask for custom commit message
set /p commit_msg="Commit message din (Kichu na likhe Enter chaple default message hobe): "

if "%commit_msg%"=="" (
    set commit_msg=Update: %date% %time%
)

echo.
echo [2/4] Staging files (git add .)...
git add .

echo.
echo [3/4] Committing (git commit)...
git commit -m "%commit_msg%"

echo.
echo [4/4] Pushing to GitHub (git push origin main)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ===================================================
    echo  SUCCESS: GitHub a successfully update hoye geche!
    echo ===================================================
) else (
    echo ===================================================
    echo  FAILED: Push hote somossa hoyeche. Internet ba Git login check korun.
    echo ===================================================
)

echo.
pause
