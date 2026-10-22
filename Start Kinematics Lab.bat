@echo off
setlocal
 title Kinematics Lab
cd /d "%~dp0"
if errorlevel 1 goto folder_error

where node.exe >nul 2>&1
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto missing_node

if exist "node_modules\vite\bin\vite.js" goto launch
 echo Installing Kinematics Lab dependencies...
call npm.cmd install
if errorlevel 1 goto install_error

:launch
 echo Starting Kinematics Lab and opening your browser...
 echo Keep this window open while using the app.
 echo To stop the server, press Ctrl+C or close this window.
 echo.
call npm.cmd run dev -- --open
if errorlevel 1 goto launch_error
exit /b 0

:missing_node
 echo Node.js and npm are required. Install Node.js 22.12 or newer from https://nodejs.org/
 echo Then double-click this launcher again.
pause
exit /b 1

:folder_error
 echo Could not open the Kinematics Lab project folder.
pause
exit /b 1

:install_error
 echo Dependency installation failed. Check your internet connection and the error above.
pause
exit /b 1

:launch_error
 echo Kinematics Lab could not start. See the error above.
pause
exit /b 1
