#!/bin/bash

# LIFX Soundboard Docker Build & Push Script
# Builds and pushes the image to Docker Hub

set -e

# Configuration
IMAGE_NAME="tylertyza/lightsoundcontroller"
DEFAULT_TAG="latest"
TAG=${1:-$DEFAULT_TAG}
FULL_IMAGE="$IMAGE_NAME:$TAG"

echo "🚀 Building and pushing LIFX Soundboard to Docker Hub"
echo "================================================"
echo "Image: $FULL_IMAGE"
echo ""

# Check if Docker is logged in
if ! docker info | grep -q "Username:"; then
    echo "❌ Please login to Docker Hub first:"
    echo "   docker login"
    exit 1
fi

# Build the image
echo "🏗️  Building Docker image..."
docker build -t $FULL_IMAGE .

# Tag as latest if not already
if [ "$TAG" != "latest" ]; then
    echo "🏷️  Tagging as latest..."
    docker tag $FULL_IMAGE $IMAGE_NAME:latest
fi

# Push to Docker Hub
echo "📤 Pushing to Docker Hub..."
docker push $FULL_IMAGE

if [ "$TAG" != "latest" ]; then
    echo "📤 Pushing latest tag..."
    docker push $IMAGE_NAME:latest
fi

echo ""
echo "✅ Successfully pushed to Docker Hub!"
echo "🌐 Image available at: https://hub.docker.com/r/tylertyza/lightsoundcontroller"
echo ""
echo "📋 Usage examples:"
echo "   docker run -d --name lifx-soundboard -p 5000:5000 -v lifx_audio:/app/audio-files $FULL_IMAGE"
echo "   docker-compose up -d  # (using updated docker-compose.yml)"
echo ""
echo "🔍 Verify deployment:"
echo "   docker run --rm $FULL_IMAGE node --version"