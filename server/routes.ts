import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { audioStorage } from "./services/audio-storage";
import { LifxUDPService } from "./services/lifx-udp";
import { insertDeviceSchema, insertSoundButtonSchema, insertSceneSchema, insertLightEffectSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // LIFX UDP service
  const lifxService = new LifxUDPService();
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast to all connected clients
  function broadcast(message: WebSocketMessage) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Handle WebSocket messages
  function handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'discover_devices':
        lifxService.discoverDevices();
        break;
      case 'trigger_effect':
        const { deviceId, effectType, duration } = message.payload;
        handleTriggerEffect(deviceId, effectType, duration);
        break;
      case 'play_sound':
        const { buttonId } = message.payload;
        handlePlaySound(buttonId);
        break;
    }
  }
  
  // LIFX service event handlers
  lifxService.on('device_discovered', async (deviceData) => {
    try {
      const existingDevice = await storage.getDeviceByMac(deviceData.mac);
      if (existingDevice) {
        const updatedDevice = await storage.updateDevice(existingDevice.id, {
          ...deviceData,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
        if (updatedDevice) {
          broadcast({ type: 'device_status', payload: updatedDevice });
        }
      } else {
        const newDevice = await storage.createDevice(deviceData);
        broadcast({ type: 'device_discovered', payload: newDevice });
      }
    } catch (error) {
      console.error('Error handling discovered device:', error);
    }
  });
  
  lifxService.on('device_power_update', async (data) => {
    try {
      const device = await storage.getDeviceByMac(data.deviceId);
      if (device) {
        const updatedDevice = await storage.updateDevice(device.id, {
          power: data.power,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
        if (updatedDevice) {
          broadcast({ type: 'device_status', payload: updatedDevice });
        }
      }
    } catch (error) {
      console.error('Error updating device power:', error);
    }
  });
  
  lifxService.on('device_state_update', async (data) => {
    try {
      const device = await storage.getDeviceByMac(data.deviceId);
      if (device) {
        const updatedDevice = await storage.updateDevice(device.id, {
          power: data.power,
          color: data.color,
          brightness: data.brightness,
          temperature: data.temperature,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
        if (updatedDevice) {
          broadcast({ type: 'device_status', payload: updatedDevice });
        }
      }
    } catch (error) {
      console.error('Error updating device state:', error);
    }
  });
  
  async function handleTriggerEffect(deviceId: number, effectType: string, duration: number = 1000) {
    try {
      const device = await storage.getDevice(deviceId);
      if (device && device.isOnline) {
        lifxService.triggerEffect(device.mac, device.ip, effectType, duration);
        broadcast({ type: 'light_effect_triggered', payload: { deviceId, effect: effectType } });
      }
    } catch (error) {
      console.error('Error triggering effect:', error);
    }
  }
  
  async function handlePlaySound(buttonId: number) {
    try {
      const button = await storage.getSoundButton(buttonId);
      if (button) {
        // Get all devices and trigger the light effect
        const devices = await storage.getDevices();
        const onlineDevices = devices.filter(d => d.isOnline);
        
        onlineDevices.forEach(device => {
          lifxService.triggerEffect(device.mac, device.ip, button.lightEffect, 2000);
        });
        
        broadcast({ type: 'sound_played', payload: { buttonId, timestamp: Date.now() } });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }
  
  // Device management routes
  app.get('/api/devices', async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  });
  
  app.post('/api/devices/discover', async (req, res) => {
    try {
      lifxService.discoverDevices();
      res.json({ message: 'Device discovery started' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start device discovery' });
    }
  });
  
  app.post('/api/devices/:id/power', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { power } = req.body;
      
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      lifxService.setPower(device.mac, device.ip, power);
      const updatedDevice = await storage.updateDevice(deviceId, { power });
      
      res.json(updatedDevice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update device power' });
    }
  });
  
  app.post('/api/devices/:id/color', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { hue, saturation, brightness, kelvin } = req.body;
      
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      lifxService.setColor(device.mac, device.ip, { hue, saturation, brightness, kelvin });
      const updatedDevice = await storage.updateDevice(deviceId, { 
        color: { hue, saturation, brightness, kelvin },
        brightness: Math.round((brightness / 65535) * 100),
        temperature: kelvin
      });
      
      res.json(updatedDevice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update device color' });
    }
  });
  
  app.delete('/api/devices/:id', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const success = await storage.deleteDevice(deviceId);
      
      if (success) {
        res.json({ message: 'Device deleted successfully' });
      } else {
        res.status(404).json({ error: 'Device not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete device' });
    }
  });
  
  // Sound button routes
  app.get('/api/sound-buttons', async (req, res) => {
    try {
      const buttons = await storage.getSoundButtons();
      res.json(buttons);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sound buttons' });
    }
  });
  
  app.post('/api/sound-buttons', upload.single('audioFile'), async (req, res) => {
    try {
      const { name, description, lightEffect, color, icon } = req.body;
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }
      
      const filename = audioStorage.generateFilename(audioFile.originalname);
      await audioStorage.saveAudioFile(filename, audioFile.buffer);
      
      const buttonData = {
        name,
        description,
        audioFile: filename,
        lightEffect,
        color,
        icon
      };
      
      const validatedData = insertSoundButtonSchema.parse(buttonData);
      const button = await storage.createSoundButton(validatedData);
      
      res.json(button);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid sound button data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create sound button' });
      }
    }
  });
  
  app.delete('/api/sound-buttons/:id', async (req, res) => {
    try {
      const buttonId = parseInt(req.params.id);
      const button = await storage.getSoundButton(buttonId);
      
      if (!button) {
        return res.status(404).json({ error: 'Sound button not found' });
      }
      
      await audioStorage.deleteAudioFile(button.audioFile);
      const success = await storage.deleteSoundButton(buttonId);
      
      if (success) {
        res.json({ message: 'Sound button deleted successfully' });
      } else {
        res.status(404).json({ error: 'Sound button not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete sound button' });
    }
  });
  
  // Audio file serving
  app.get('/api/audio/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const audioBuffer = await audioStorage.getAudioFile(filename);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (error) {
      res.status(404).json({ error: 'Audio file not found' });
    }
  });
  
  // Scene management routes
  app.get('/api/scenes', async (req, res) => {
    try {
      const scenes = await storage.getScenes();
      res.json(scenes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch scenes' });
    }
  });
  
  app.post('/api/scenes', async (req, res) => {
    try {
      const sceneData = insertSceneSchema.parse(req.body);
      const scene = await storage.createScene(sceneData);
      res.json(scene);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid scene data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create scene' });
      }
    }
  });
  
  app.post('/api/scenes/:id/apply', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.id);
      const scene = await storage.getScene(sceneId);
      
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      
      const devices = await storage.getDevices();
      const onlineDevices = devices.filter(d => d.isOnline);
      
      // Apply scene configuration to all devices
      onlineDevices.forEach(device => {
        const config = scene.configuration as any;
        if (config.brightness !== undefined) {
          lifxService.setBrightness(device.mac, device.ip, config.brightness);
        }
        if (config.temperature !== undefined) {
          lifxService.setColor(device.mac, device.ip, {
            hue: 0,
            saturation: 0,
            brightness: Math.round((config.brightness || 100) / 100 * 65535),
            kelvin: config.temperature
          });
        }
      });
      
      broadcast({ type: 'scene_applied', payload: { sceneId, devices: onlineDevices.map(d => d.id) } });
      res.json({ message: 'Scene applied successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to apply scene' });
    }
  });
  
  app.delete('/api/scenes/:id', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.id);
      const success = await storage.deleteScene(sceneId);
      
      if (success) {
        res.json({ message: 'Scene deleted successfully' });
      } else {
        res.status(404).json({ error: 'Scene not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete scene' });
    }
  });
  
  // Light effects routes
  app.get('/api/light-effects', async (req, res) => {
    try {
      const effects = await storage.getLightEffects();
      res.json(effects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch light effects' });
    }
  });
  
  app.post('/api/light-effects', async (req, res) => {
    try {
      const effectData = insertLightEffectSchema.parse(req.body);
      const effect = await storage.createLightEffect(effectData);
      res.json(effect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid light effect data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create light effect' });
      }
    }
  });

  return httpServer;
}
