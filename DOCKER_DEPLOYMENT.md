# PDF Text Parser - Docker Deployment Guide

This guide will help you deploy the PDF Text Parser application using Docker.

## Prerequisites

- **Docker Desktop** (for Windows/Mac) or **Docker Engine** (for Linux)
- **Docker Compose** (usually included with Docker Desktop)
- **Git** (optional, for updates)

### Installing Docker

#### Windows/Mac
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop
3. Verify installation: `docker --version`

#### Linux (Ubuntu/Debian)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

## Quick Start

### 1. Clone or Download the Project
```bash
git clone <your-repository-url>
cd PDF-Text-Parser
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file and add your OpenAI API key
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Required Configuration:**
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
NODE_ENV=production
PORT=3000
```

### 3. Deploy the Application

#### Option A: Using the Deployment Script (Recommended)

**Windows:**
```cmd
deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual Docker Compose

```bash
# Build and start the application
docker compose up -d --build

# Check if it's running
docker compose ps

# View logs
docker compose logs -f pdf-parser
```

### 4. Access the Application

- **Main Application:** http://localhost (via Nginx)
- **Direct Access:** http://localhost:3000 (bypass Nginx)
- **Health Check:** http://localhost:3000/health

## Deployment Script Commands

The deployment script provides several useful commands:

```bash
# Deploy the application
./deploy.sh deploy

# View real-time logs
./deploy.sh logs

# Stop the application
./deploy.sh stop

# Restart the application
./deploy.sh restart

# Check application status
./deploy.sh status

# Update the application (pull changes and rebuild)
./deploy.sh update

# Clean up all Docker resources
./deploy.sh cleanup

# Show help
./deploy.sh help
```

## Architecture

The Docker deployment includes:

### Services
- **pdf-parser**: Main Node.js application
- **nginx**: Reverse proxy with rate limiting and security headers

### Volumes
- **organized_docs**: Persistent storage for organized documents
- **temp_files**: Temporary file processing
- **temp_downloads**: Temporary download files

### Network
- **pdf-parser-network**: Internal Docker network for service communication

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for document classification | - | ✅ |
| `NODE_ENV` | Node.js environment | `production` | ❌ |
| `PORT` | Application port | `3000` | ❌ |

### Nginx Configuration

The included Nginx configuration provides:
- **Reverse Proxy**: Routes requests to the Node.js application
- **Rate Limiting**: API endpoints (10 req/s), Upload endpoints (2 req/s)
- **Security Headers**: XSS protection, content type sniffing prevention
- **File Upload**: Support for large PDF files (50MB limit)
- **Compression**: Gzip compression for better performance

### Docker Compose Override

You can create a `docker-compose.override.yml` file for local customizations:

```yaml
version: '3.8'

services:
  pdf-parser:
    environment:
      - LOG_LEVEL=debug
    ports:
      - "3001:3000"  # Use different port
  
  nginx:
    ports:
      - "8080:80"    # Use different port
```

## Production Deployment

### SSL/HTTPS Setup

1. **Obtain SSL Certificates:**
   ```bash
   # Using Let's Encrypt (example)
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Copy Certificates:**
   ```bash
   mkdir ssl
   cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
   cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
   ```

3. **Update Nginx Configuration:**
   - Uncomment the HTTPS server block in `nginx.conf`
   - Update `server_name` with your domain

### Resource Limits

For production, consider adding resource limits to `docker-compose.yml`:

```yaml
services:
  pdf-parser:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Monitoring

Add monitoring services to your `docker-compose.yml`:

```yaml
services:
  # ... existing services ...
  
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
netstat -tulpn | grep :3000  # Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Linux
taskkill /PID <PID> /F  # Windows
```

#### 2. Permission Denied (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

#### 3. Out of Disk Space
```bash
# Clean up Docker resources
docker system prune -a
docker volume prune
```

#### 4. Application Won't Start
```bash
# Check logs
docker compose logs pdf-parser

# Check if all required environment variables are set
docker compose config
```

### Health Checks

The application includes health checks:
- **Docker Health Check**: Built into the container
- **Nginx Health Check**: Monitors application availability
- **Manual Check**: `curl http://localhost:3000/health`

### Logs

View logs for debugging:
```bash
# All services
docker compose logs

# Specific service
docker compose logs pdf-parser
docker compose logs nginx

# Follow logs in real-time
docker compose logs -f pdf-parser
```

## Backup and Recovery

### Backup Organized Documents
```bash
# Create backup
docker run --rm -v pdf-text-parser_organized_docs:/data -v $(pwd):/backup alpine tar czf /backup/organized_docs_backup.tar.gz -C /data .

# Restore backup
docker run --rm -v pdf-text-parser_organized_docs:/data -v $(pwd):/backup alpine tar xzf /backup/organized_docs_backup.tar.gz -C /data
```

### Database Backup (if you add database support)
```bash
# PostgreSQL example
docker compose exec postgres pg_dump -U user database_name > backup.sql
```

## Scaling

For high-traffic scenarios, you can scale the application:

```bash
# Scale to 3 instances
docker compose up -d --scale pdf-parser=3

# Use a load balancer (update nginx.conf)
upstream pdf_parser_backend {
    server pdf-parser_1:3000;
    server pdf-parser_2:3000;
    server pdf-parser_3:3000;
}
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Use Docker secrets for sensitive data in production
3. **Network**: Use internal networks for service communication
4. **Updates**: Regularly update base images and dependencies
5. **Firewall**: Configure firewall rules for production deployment
6. **SSL**: Always use HTTPS in production
7. **Rate Limiting**: Configure appropriate rate limits for your use case

## Support

If you encounter issues:
1. Check the logs: `./deploy.sh logs`
2. Verify configuration: `docker compose config`
3. Check system resources: `docker system df`
4. Review this documentation
5. Check the application's health endpoint: `curl http://localhost:3000/health`