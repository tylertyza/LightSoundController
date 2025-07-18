# Replit Project: LIFX Smart Lighting & Sound Control Dashboard

## Overview

This is a full-stack web application that provides a unified interface for controlling LIFX smart lights and managing sound effects. The application serves as a soundboard with integrated lighting controls, allowing users to trigger audio playbook with synchronized lighting effects. It features real-time device discovery, WebSocket communication for live updates, collapsible panels for better UI management, and a modern React-based user interface with dark theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Lighting Effects Improvements** (July 18, 2025): Fixed exact duration progress bars based on steps, fade times, and loops. Added device state saving and restoration after effects finish. Fixed mobile single-tap activation for lighting effects. Improved device status updates to include power state. Removed infinite loop effects from sound creation dropdown
- **Modal Tab Text Color Fix** (July 18, 2025): Fixed black text on active tabs in modal by adding explicit white text color override for active tab states
- **Mobile Interface Bug Fixes** (July 18, 2025): Fixed single-tap activation on soundboard items by preventing default touch behavior and event propagation. Added periodic device status updates every second for real-time color circle updates. Fixed duplicate plus/minus icons in device management mobile buttons
- **Infinite Loop Toggle System** (July 18, 2025): Updated breathe and strobe effects to use loop count 0 for infinite loops. Added toggle behavior where clicking an infinite loop effect turns it on/off. No progress bars shown for infinite effects. Added stop functionality to LIFX UDP service and API routes
- **Responsive Panel Behavior** (July 18, 2025): Fixed mobile panel animations with smooth sliding transitions. Panels now start closed on mobile and open on desktop. Added responsive state management that automatically adjusts panel visibility based on screen size. Maintained desktop toggle functionality while ensuring mobile animations work properly
- **Mobile Interface Bug Fixes** (July 18, 2025): Fixed mobile navigation issues with close buttons on all panels, proper backdrop click handling, and resolved lighting effects getting stuck in loops. Added proper termination logic for infinite lighting effects and improved mobile touch interactions
- **Mobile-Responsive Interface** (July 18, 2025): Completely redesigned interface for mobile devices with overlay panels instead of fixed sidebars, responsive grid layouts, larger touch targets, and mobile-optimized input controls. Added proper touch manipulation, viewport optimization, and mobile-specific CSS styles
- **Device Status Indicators and Power Controls** (July 18, 2025): Added status circles to adopted devices showing current color and brightness state. Black when off, color-accurate when on with brightness dimming. Added power toggle buttons in lighting controls for selected devices
- **Editable Default Effects and Scenes** (July 18, 2025): All default effects and scenes now have JSON format and can be edited/deleted like custom ones. Edit modal shows JSON data for all effects, providing consistent editing experience across default and custom content
- **Simplified Sound Effects System** (July 18, 2025): Sound effects now only reference existing lighting effects from the Lighting Effects panel. Added toggle to hide/show lighting effects on the soundboard. This creates better separation of concerns where lighting effects are managed centrally
- **Sound Effects Volume Control** (July 18, 2025): Added individual volume control for each sound effect with blue progress slider. Removed per-device settings for sound effects as lighting effects are now applied globally
- **Enhanced Device Selection System** (July 18, 2025): Added checkboxes for adopted devices with visual selection feedback. Multi-device control of brightness, color, and temperature with current value displays
- **Improved Slider Visual Feedback** (July 18, 2025): Enhanced slider styling with blue progress indicators that follow the dot position for better visual feedback
- **Soundboard Grid Redesign** (July 18, 2025): Separated effects into sections with Sound Effects, Lighting Scenes, and Lighting Effects. Added horizontal layout for lighting effects and progress bars for timed effects
- **Persistent Active States** (July 18, 2025): Added visual indicators for active scenes and looping effects with blue ring outline
- **Effect Overwrite System** (July 18, 2025): When selecting different effects, previous selections are automatically overwritten
- **Lighting Effects Panel Relocation** (July 18, 2025): Moved lighting effects from sidebar to main panel, added new "Lighting Effects" tab in Add Effect modal
- **Per-Device Lighting Controls** (July 18, 2025): Removed global color/brightness settings, implemented per-bulb controls with device names instead of IDs
- **Dynamic Effects Removal** (July 18, 2025): Removed dynamic effects section from lighting controls for simplified interface
- **Custom JSON Effects for Sound Buttons** (July 18, 2025): Added support for custom JSON lighting effects in sound buttons with UI improvements
- **Docker Deployment Support** (July 17, 2025): Added complete Docker containerization with multi-stage builds, health checks, and deployment scripts

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with WebSocket support for real-time features
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local filesystem for audio file management

### Real-time Communication
- **WebSocket Server**: Native WebSocket implementation for device status updates
- **UDP Communication**: Custom LIFX UDP service for smart light control
- **Audio Processing**: Web Audio API for client-side audio playback

## Key Components

### Database Schema (Drizzle ORM)
- **Users**: Basic user authentication system
- **Devices**: LIFX device management with IP, MAC, and status tracking
- **Sound Buttons**: Configurable sound effects with volume control, associated lighting behaviors, and custom JSON effects support
- **Scenes**: Predefined lighting configurations with custom JSON effects support
- **Light Effects**: Reusable lighting effect templates

### Core Services
- **LIFX UDP Service**: Direct UDP communication with LIFX devices for discovery and control
- **Audio Storage Service**: File management for uploaded sound files
- **WebSocket Handler**: Real-time bidirectional communication for device updates

### Frontend Components
- **Soundboard Grid**: Sectioned grid with separate areas for Sound Effects, Lighting Scenes, and Lighting Effects with horizontal layout for lighting effects
- **Device Management**: LIFX device discovery and control interface (collapsible) with checkbox-based selection system
- **Progress Indicators**: Real-time progress bars for timed effects showing duration completion
- **Persistent Active States**: Visual ring indicators for active scenes and looping effects with automatic overwrite system
- **Add Effect Modal**: Unified modal with three tabs for comprehensive effect management, volume control for sound effects, restricted looping effects in sound creation
- **Device Selection System**: Multi-device selection with checkboxes, visual feedback, and collective control of brightness, color, and temperature
- **Enhanced Sliders**: Blue progress indicators that follow slider position with current value displays
- **Volume Control**: Individual volume settings for each sound effect with visual feedback
- **Collapsible Panels**: Smooth animations for hiding/showing side panels
- **Custom JSON Effects**: Support for advanced lighting effects with brightness, color, timing, and easing controls

## Data Flow

1. **Device Discovery**: LIFX UDP service broadcasts discovery packets and maintains device registry
2. **Real-time Updates**: WebSocket connection pushes device status changes to connected clients
3. **Sound Playback**: Client-side Web Audio API handles audio file playback
4. **Lighting Synchronization**: Sound button triggers simultaneous audio and lighting effects
5. **State Management**: React Query handles API calls and caches server state

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Headless UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **@neondatabase/serverless**: PostgreSQL database driver

### Development and Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **@replit/vite-plugin-***: Replit-specific development tools

### Audio and Network Libraries
- **multer**: File upload handling
- **ws**: WebSocket server implementation
- **dgram**: UDP socket communication for LIFX protocol

## Deployment Strategy

### Development Environment
- **Hot Module Replacement**: Vite development server with React Fast Refresh
- **TypeScript Compilation**: Real-time type checking during development
- **Replit Integration**: Development banner and error overlay for Replit environment

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server code to `dist/index.js`
- **Static Assets**: Express serves built frontend files in production
- **Database**: Drizzle migrations handle schema changes

### Docker Deployment
- **Multi-stage Build**: Optimized production Docker image with minimal footprint
- **Health Checks**: Container monitoring for application availability
- **Volume Persistence**: Audio files stored in Docker volumes
- **Network Configuration**: UDP broadcast support for LIFX device discovery
- **Security**: Non-root user execution with proper file permissions

### Key Architectural Decisions

1. **Monorepo Structure**: Frontend, backend, and shared code in single repository for easier development
2. **Real-time Communication**: WebSocket for live device updates instead of polling
3. **Direct UDP Protocol**: Custom LIFX UDP implementation for better control than HTTP API
4. **Client-side Audio**: Web Audio API eliminates need for server-side audio processing
5. **File-based Storage**: Local filesystem storage for audio files with future cloud migration path
6. **Type Safety**: Shared TypeScript schemas between frontend and backend ensure consistency

The architecture prioritizes real-time responsiveness for lighting control while maintaining a clean separation between audio processing (client-side) and device management (server-side).