# LIFX Sound & Light Control Dashboard

A React-based web application that creates a unified interface for controlling LIFX smart lights and managing sound effects. Features a soundboard with synchronized lighting effects, real-time device discovery, and modern UI controls.

## Features

- **Sound & Light Synchronization**: Sound effect buttons that trigger coordinated lighting effects
- **Real-time Device Discovery**: Automatic LIFX device detection via UDP protocol
- **WebSocket Communication**: Live updates for device status and control
- **Collapsible Interface**: Hideable panels for device management and lighting controls
- **Audio Management**: Upload and organize sound effects with custom lighting behaviors
- **Preset Scenes**: Pre-configured lighting scenarios for different moods
- **Dynamic Effects**: Flash, strobe, fade, breathe, and color cycle effects

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Wouter for routing
- TanStack Query for state management
- Radix UI components
- Web Audio API for sound playback

### Backend
- Node.js with Express
- WebSocket server for real-time communication
- UDP service for LIFX device control
- File-based audio storage
- In-memory data persistence

## Getting Started

### Quick Start with Docker (Recommended)

The easiest way to run the LIFX Soundboard is using Docker:

```bash
# Option 1: Use the quick start script
chmod +x docker-run.sh
./docker-run.sh

# Option 2: Use Docker Compose directly
docker-compose up -d

# Option 3: Direct Docker run
docker build -t lifx-soundboard .
docker run -d --name lifx-soundboard -p 5000:5000 -v lifx_audio:/app/audio-files lifx-soundboard
```

Open your browser and navigate to `http://localhost:5000`

### Development Setup

For development or if you prefer not to use Docker:

#### Prerequisites
- Node.js 20 or higher
- LIFX smart lights on your local network
- Modern web browser with Web Audio API support

#### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lifx-soundboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5000`

## Usage

### Device Discovery
1. Click "Scan Network" in the device management panel
2. The app will discover LIFX devices on your network via UDP broadcast
3. Discovered devices appear in the device list with online status

### Creating Sound Effects
1. Click "Add Sound" in the main interface
2. Upload an audio file (MP3, WAV, etc.)
3. Choose a lighting effect and button appearance
4. The sound button will trigger both audio and lighting simultaneously

### Lighting Controls
- Use the color picker to change all lights at once
- Adjust brightness and temperature with sliders
- Apply preset scenes for different moods
- Trigger dynamic effects like strobe or color cycling

### Collapsible Panels
- Click arrow buttons in the header to hide/show panels
- Device management panel (left) for device control
- Lighting controls panel (right) for scene and effect management

## LIFX Protocol

The application communicates directly with LIFX devices using the UDP LAN protocol on port 56700. This provides:
- Faster response times than cloud API
- Local network operation (no internet required)
- Direct device control without rate limiting

## Development

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   └── pages/          # Application pages
├── server/             # Express backend
│   ├── services/       # UDP and audio services
│   └── routes.ts       # API endpoints
├── shared/             # Shared TypeScript schemas
└── audio-files/        # Uploaded sound files
```

### Key Services
- **LIFX UDP Service**: Device discovery and control
- **Audio Storage**: File upload and management
- **WebSocket Handler**: Real-time client updates

## Docker Deployment

For detailed Docker deployment instructions, including network configuration and troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Docker Commands

```bash
# Start application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Update and restart
docker-compose pull && docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- LIFX for their comprehensive UDP protocol documentation
- The React and TypeScript communities for excellent tooling
- Replit for the development environment