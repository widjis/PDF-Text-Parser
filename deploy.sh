#!/bin/bash

# PDF Text Parser - Docker Deployment Script
# This script helps you deploy the PDF Text Parser application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    print_success "Docker Compose is available: $COMPOSE_CMD"
}

# Function to setup environment file
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Created .env file from .env.example"
            print_warning "Please edit .env file and add your OpenAI API key before continuing"
            print_warning "You can edit it with: nano .env"
            read -p "Press Enter after you've configured the .env file..."
        else
            print_error ".env.example file not found. Please create a .env file with your configuration."
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
    
    # Check if OpenAI API key is set
    if grep -q "your_openai_api_key_here" .env 2>/dev/null; then
        print_warning "Please update your OpenAI API key in the .env file"
        read -p "Press Enter after you've updated the API key..."
    fi
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p ssl
    mkdir -p logs
    
    print_success "Directories created"
}

# Function to build and start the application
deploy() {
    print_status "Building and starting the PDF Text Parser application..."
    
    # Build the Docker image
    print_status "Building Docker image..."
    $COMPOSE_CMD build --no-cache
    
    # Start the services
    print_status "Starting services..."
    $COMPOSE_CMD up -d
    
    # Wait for the application to be ready
    print_status "Waiting for application to be ready..."
    sleep 10
    
    # Check if the application is running
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Application is running successfully!"
        print_success "Access the application at: http://localhost:9005"
        print_success "Direct access (without Nginx): http://localhost:9006"
        print_success "HTTPS access: https://localhost:9443 (if SSL configured)"
    else
        print_error "Application failed to start properly"
        print_status "Checking logs..."
        $COMPOSE_CMD logs pdf-parser
        exit 1
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing application logs..."
    $COMPOSE_CMD logs -f pdf-parser
}

# Function to stop the application
stop() {
    print_status "Stopping the PDF Text Parser application..."
    $COMPOSE_CMD down
    print_success "Application stopped"
}

# Function to restart the application
restart() {
    print_status "Restarting the PDF Text Parser application..."
    $COMPOSE_CMD restart
    print_success "Application restarted"
}

# Function to show status
status() {
    print_status "Application status:"
    $COMPOSE_CMD ps
}

# Function to update the application
update() {
    print_status "Updating the PDF Text Parser application..."
    
    # Pull latest changes (if using git)
    if [ -d .git ]; then
        print_status "Pulling latest changes..."
        git pull
    fi
    
    # Rebuild and restart
    print_status "Rebuilding and restarting..."
    $COMPOSE_CMD down
    $COMPOSE_CMD build --no-cache
    $COMPOSE_CMD up -d
    
    print_success "Application updated successfully!"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    $COMPOSE_CMD down -v
    
    # Remove images
    docker rmi $(docker images "pdf-text-parser*" -q) 2>/dev/null || true
    
    # Clean up unused Docker resources
    docker system prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "PDF Text Parser - Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Build and start the application (default)"
    echo "  logs      - Show application logs"
    echo "  stop      - Stop the application"
    echo "  restart   - Restart the application"
    echo "  status    - Show application status"
    echo "  update    - Update and restart the application"
    echo "  cleanup   - Stop and remove all Docker resources"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy    # Deploy the application"
    echo "  $0 logs      # View logs"
    echo "  $0 stop      # Stop the application"
}

# Main script logic
main() {
    echo "PDF Text Parser - Docker Deployment Script"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    COMMAND=${1:-deploy}
    
    case $COMMAND in
        deploy)
            check_docker
            check_docker_compose
            setup_env
            create_directories
            deploy
            ;;
        logs)
            check_docker_compose
            show_logs
            ;;
        stop)
            check_docker_compose
            stop
            ;;
        restart)
            check_docker_compose
            restart
            ;;
        status)
            check_docker_compose
            status
            ;;
        update)
            check_docker
            check_docker_compose
            update
            ;;
        cleanup)
            check_docker_compose
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run the main function
main "$@"