@echo off
REM PDF Text Parser - Docker Deployment Script for Windows
REM This script helps you deploy the PDF Text Parser application using Docker

setlocal enabledelayedexpansion

REM Function to print colored output (Windows doesn't support colors in batch easily, so we'll use simple text)
echo PDF Text Parser - Docker Deployment Script
echo ==========================================
echo.

REM Parse command line arguments
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=deploy

REM Check if Docker is installed and running
echo [INFO] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is installed and running

REM Check if Docker Compose is available
echo [INFO] Checking Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not available. Please install Docker Compose.
        pause
        exit /b 1
    ) else (
        set COMPOSE_CMD=docker-compose
    )
) else (
    set COMPOSE_CMD=docker compose
)
echo [SUCCESS] Docker Compose is available: !COMPOSE_CMD!

REM Handle different commands
if "%COMMAND%"=="deploy" goto :deploy
if "%COMMAND%"=="logs" goto :logs
if "%COMMAND%"=="stop" goto :stop
if "%COMMAND%"=="restart" goto :restart
if "%COMMAND%"=="status" goto :status
if "%COMMAND%"=="update" goto :update
if "%COMMAND%"=="cleanup" goto :cleanup
if "%COMMAND%"=="help" goto :help
if "%COMMAND%"=="--help" goto :help
if "%COMMAND%"=="-h" goto :help

echo [ERROR] Unknown command: %COMMAND%
echo.
goto :help

:deploy
echo [INFO] Setting up environment variables...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [WARNING] Created .env file from .env.example
        echo [WARNING] Please edit .env file and add your OpenAI API key before continuing
        echo [WARNING] You can edit it with: notepad .env
        pause
    ) else (
        echo [ERROR] .env.example file not found. Please create a .env file with your configuration.
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] .env file already exists
)

REM Check if OpenAI API key is set
findstr /C:"your_openai_api_key_here" .env >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Please update your OpenAI API key in the .env file
    pause
)

echo [INFO] Creating necessary directories...
if not exist ssl mkdir ssl
if not exist logs mkdir logs
echo [SUCCESS] Directories created

echo [INFO] Building and starting the PDF Text Parser application...
echo [INFO] Building Docker image...
!COMPOSE_CMD! build --no-cache
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    pause
    exit /b 1
)

echo [INFO] Starting services...
!COMPOSE_CMD! up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

echo [INFO] Waiting for application to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Checking if application is running...
curl -f http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Application failed to start properly
    echo [INFO] Checking logs...
    !COMPOSE_CMD! logs pdf-parser
    pause
    exit /b 1
) else (
    echo [SUCCESS] Application is running successfully!
    echo [SUCCESS] Access the application at: http://localhost:9005
    echo [SUCCESS] Direct access (without Nginx): http://localhost:9006
)
goto :end

:logs
echo [INFO] Showing application logs...
!COMPOSE_CMD! logs -f pdf-parser
goto :end

:stop
echo [INFO] Stopping the PDF Text Parser application...
!COMPOSE_CMD! down
echo [SUCCESS] Application stopped
goto :end

:restart
echo [INFO] Restarting the PDF Text Parser application...
!COMPOSE_CMD! restart
echo [SUCCESS] Application restarted
goto :end

:status
echo [INFO] Application status:
!COMPOSE_CMD! ps
goto :end

:update
echo [INFO] Updating the PDF Text Parser application...

REM Pull latest changes (if using git)
if exist .git (
    echo [INFO] Pulling latest changes...
    git pull
)

echo [INFO] Rebuilding and restarting...
!COMPOSE_CMD! down
!COMPOSE_CMD! build --no-cache
!COMPOSE_CMD! up -d
echo [SUCCESS] Application updated successfully!
goto :end

:cleanup
echo [INFO] Cleaning up Docker resources...
!COMPOSE_CMD! down -v

REM Remove images (Windows batch doesn't handle command substitution well, so we'll skip this)
echo [INFO] Please manually remove Docker images if needed: docker rmi pdf-text-parser

REM Clean up unused Docker resources
docker system prune -f
echo [SUCCESS] Cleanup completed
goto :end

:help
echo PDF Text Parser - Docker Deployment Script
echo.
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   deploy    - Build and start the application (default)
echo   logs      - Show application logs
echo   stop      - Stop the application
echo   restart   - Restart the application
echo   status    - Show application status
echo   update    - Update and restart the application
echo   cleanup   - Stop and remove all Docker resources
echo   help      - Show this help message
echo.
echo Examples:
echo   %0 deploy    # Deploy the application
echo   %0 logs      # View logs
echo   %0 stop      # Stop the application
goto :end

:end
if "%COMMAND%"=="deploy" (
    echo.
    echo Press any key to exit...
    pause >nul
)
endlocal