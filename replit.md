# Replit Project: LIFX Smart Lighting & Sound Control Dashboard

## Overview

This is a full-stack web application that provides a unified interface for controlling LIFX smart lights and managing sound effects. The application serves as a soundboard with integrated lighting controls, allowing users to trigger audio playbook with synchronized lighting effects. It features real-time device discovery, WebSocket communication for live updates, collapsible panels for better UI management, and a modern React-based user interface with dark theme.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Sound Buttons**: Configurable sound effects with associated lighting behaviors
- **Scenes**: Predefined lighting configurations
- **Light Effects**: Reusable lighting effect templates

### Core Services
- **LIFX UDP Service**: Direct UDP communication with LIFX devices for discovery and control
- **Audio Storage Service**: File management for uploaded sound files
- **WebSocket Handler**: Real-time bidirectional communication for device updates

### Frontend Components
- **Soundboard Grid**: Interactive grid of sound effect buttons with color-coded themes
- **Device Management**: LIFX device discovery and control interface (collapsible)
- **Lighting Controls**: Color, brightness, and effect management (collapsible)
- **Audio Upload Modal**: File upload and sound button configuration
- **Collapsible Panels**: Smooth animations for hiding/showing side panels

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

### Key Architectural Decisions

1. **Monorepo Structure**: Frontend, backend, and shared code in single repository for easier development
2. **Real-time Communication**: WebSocket for live device updates instead of polling
3. **Direct UDP Protocol**: Custom LIFX UDP implementation for better control than HTTP API
4. **Client-side Audio**: Web Audio API eliminates need for server-side audio processing
5. **File-based Storage**: Local filesystem storage for audio files with future cloud migration path
6. **Type Safety**: Shared TypeScript schemas between frontend and backend ensure consistency

The architecture prioritizes real-time responsiveness for lighting control while maintaining a clean separation between audio processing (client-side) and device management (server-side).