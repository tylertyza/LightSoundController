#!/bin/bash

# LIFX Soundboard Docker Quick Start Script
# This script builds and runs the LIFX Soundboard application in Docker

echo "🎵 LIFX Soundboard Docker Setup"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Build and start the application
echo "🏗️  Pulling LIFX Soundboard image..."
$COMPOSE_CMD pull

echo "🚀 Starting LIFX Soundboard..."
$COMPOSE_CMD up -d

echo ""
echo "✅ LIFX Soundboard is running!"
echo "🌐 Access the application at: http://localhost:5000"
echo ""
echo "📋 Useful commands:"
echo "   Stop:    $COMPOSE_CMD down"
echo "   Logs:    $COMPOSE_CMD logs -f"
echo "   Restart: $COMPOSE_CMD restart"
echo "   Status:  $COMPOSE_CMD ps"
echo ""
echo "🔍 Make sure your LIFX devices are on the same network as this Docker container"
echo "   for device discovery to work properly."