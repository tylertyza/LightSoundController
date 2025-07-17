# LIFX Soundboard - Docker Deployment Guide

This guide provides multiple ways to deploy the LIFX Soundboard application using Docker.

## Quick Start (Recommended)

### Option 1: Using the Quick Start Script
```bash
# Make script executable and run
chmod +x docker-run.sh
./docker-run.sh
```

### Option 2: Using Docker Compose
```bash
# Build and start
docker-compose up -d

# Access at http://localhost:5000
```

### Option 3: Direct Docker Run
```bash
# Build the image
docker build -t lifx-soundboard .

# Run the container
docker run -d \
  --name lifx-soundboard \
  -p 5000:5000 \
  -v lifx_audio:/app/audio-files \
  --restart unless-stopped \
  lifx-soundboard
```

## Requirements

- Docker 20.10 or higher
- Docker Compose v2.0 or higher
- LIFX devices on the same network as the Docker host

## Network Configuration

### Important: LIFX Device Discovery
The application uses UDP broadcast (port 56700) to discover LIFX devices. For proper device discovery:

1. **Host Network Mode** (Linux only):
```bash
docker run -d \
  --name lifx-soundboard \
  --network host \
  -v lifx_audio:/app/audio-files \
  lifx-soundboard
```

2. **Bridge Network** (Default):
```bash
# Standard setup - devices on same subnet should work
docker-compose up -d
```

3. **Custom Network**:
```yaml
# docker-compose.yml modification
services:
  lifx-soundboard:
    network_mode: host  # Linux only
    # OR
    networks:
      - lifx-network
    ports:
      - "5000:5000"
      - "56700:56700/udp"  # LIFX UDP port
```

## Environment Variables

You can customize the application with environment variables:

```bash
# Create .env file
PORT=5000
NODE_ENV=production
LIFX_BROADCAST_ADDRESS=255.255.255.255
```

## Data Persistence

Audio files are stored in a Docker volume:

```bash
# View volume contents
docker volume inspect lifx_audio

# Backup audio files
docker run --rm -v lifx_audio:/data -v $(pwd):/backup alpine tar czf /backup/audio-backup.tar.gz -C /data .

# Restore audio files
docker run --rm -v lifx_audio:/data -v $(pwd):/backup alpine tar xzf /backup/audio-backup.tar.gz -C /data
```

## Management Commands

```bash
# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Restart application
docker-compose restart

# Update application
docker-compose pull
docker-compose up -d

# Remove everything (including volumes)
docker-compose down -v
```

## Troubleshooting

### Device Discovery Issues
1. **Check network connectivity**:
```bash
# Test from container
docker exec lifx-soundboard ping <lifx-device-ip>
```

2. **Verify UDP port binding**:
```bash
# Check if port 56700 is available
netstat -ulnp | grep 56700
```

3. **Host network mode** (Linux only):
```yaml
# docker-compose.yml
services:
  lifx-soundboard:
    network_mode: host
```

### Performance Issues
1. **Increase container resources**:
```bash
# Add to docker-compose.yml
services:
  lifx-soundboard:
    mem_limit: 512m
    cpus: "1.0"
```

2. **Monitor resource usage**:
```bash
docker stats lifx-soundboard
```

### Audio File Issues
1. **Check volume permissions**:
```bash
docker exec lifx-soundboard ls -la /app/audio-files
```

2. **Fix permissions**:
```bash
docker exec lifx-soundboard chown -R nextjs:nodejs /app/audio-files
```

## Security Considerations

1. **Network isolation**: Use custom networks instead of host mode when possible
2. **User permissions**: Application runs as non-root user (nextjs:nodejs)
3. **File permissions**: Audio files directory has restricted permissions
4. **Health checks**: Container includes health monitoring

## Production Deployment

For production deployment, consider:

1. **Reverse proxy** (nginx/traefik):
```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **SSL/TLS termination**
3. **Resource limits**
4. **Monitoring and logging**
5. **Backup strategy for audio files**

## Docker Hub Deployment

To publish to Docker Hub:

```bash
# Build and tag
docker build -t your-username/lifx-soundboard:latest .

# Push to Docker Hub
docker push your-username/lifx-soundboard:latest

# Run from Docker Hub
docker run -d \
  --name lifx-soundboard \
  -p 5000:5000 \
  -v lifx_audio:/app/audio-files \
  your-username/lifx-soundboard:latest
```

## Support

For issues related to:
- Docker deployment: Check container logs and network configuration
- LIFX device discovery: Ensure devices are on the same network
- Audio playback: Check browser compatibility and file formats
- Performance: Monitor container resources and adjust limits