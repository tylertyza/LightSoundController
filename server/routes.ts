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
  
  // Helper function to convert hex color to HSB
  function hexToHsb(hex: string): { hue: number; saturation: number; brightness: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let hue = 0;
    if (diff !== 0) {
      if (max === r) {
        hue = ((g - b) / diff) % 6;
      } else if (max === g) {
        hue = (b - r) / diff + 2;
      } else {
        hue = (r - g) / diff + 4;
      }
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    const saturation = max === 0 ? 0 : diff / max;
    const brightness = max;
    
    return {
      hue: Math.round(hue / 360 * 65535),
      saturation: Math.round(saturation * 65535),
      brightness: Math.round(brightness * 65535)
    };
  }

  // Helper function to apply custom JSON lighting effects
  async function applyCustomEffect(customEffect: any, devices: any[]) {
    try {
      console.log('Applying custom effect:', customEffect.name);
      
      // Create a map of device IDs to device objects for quick lookup
      const deviceMap = new Map();
      devices.forEach(device => {
        deviceMap.set(device.id.toString(), device);
      });

      // Apply global delay if specified
      if (customEffect.globalDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, customEffect.globalDelay));
      }

      // Function to execute a single step
      const executeStep = async (step: any) => {
        const targetDevices = step.deviceIds
          .map((id: string) => deviceMap.get(id))
          .filter(Boolean);

        if (targetDevices.length === 0) {
          console.log('No target devices found for step');
          return;
        }

        // Apply easing if specified
        if (step.easing && step.easing.duration > 0) {
          // For simplicity, we'll just add the easing duration to the step
          // In a full implementation, you'd implement actual easing curves
          await new Promise(resolve => setTimeout(resolve, step.easing.duration));
        }

        // Convert hex color to HSB
        const color = hexToHsb(step.color);
        
        // Apply to all target devices
        targetDevices.forEach(device => {
          lifxService.setColor(device.mac, device.ip, {
            hue: color.hue,
            saturation: color.saturation,
            brightness: Math.round(step.brightness / 100 * 65535),
            kelvin: 3500 // Default temperature
          });
        });

        // Wait for the step duration
        await new Promise(resolve => setTimeout(resolve, step.duration));
      };

      // Execute steps in sequence
      const executeSequence = async () => {
        for (const step of customEffect.steps) {
          await executeStep(step);
        }
      };

      // Handle looping
      if (customEffect.loop) {
        const loopCount = customEffect.loopCount || 1;
        for (let i = 0; i < loopCount; i++) {
          await executeSequence();
        }
      } else {
        await executeSequence();
      }

      console.log('Custom effect completed');
    } catch (error) {
      console.error('Error applying custom effect:', error);
    }
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
  
  app.post('/api/devices/:id/adopt', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { adopt } = req.body;
      
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      const updatedDevice = await storage.updateDevice(deviceId, { isAdopted: adopt });
      
      res.json(updatedDevice);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update device adoption status' });
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
  
  app.post('/api/sound-buttons', upload.single('audio'), async (req, res) => {
    try {
      const { name, description, lightEffect, color, icon, targetDevices, customJson } = req.body;
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
        icon,
        targetDevices: targetDevices ? JSON.parse(targetDevices) : [],
        customJson: customJson ? JSON.parse(customJson) : null
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

  app.post('/api/sound-buttons/custom-effect', async (req, res) => {
    try {
      const { customEffect, deviceIds } = req.body;
      
      for (const deviceId of deviceIds) {
        await lifxService.applyCustomEffect(deviceId, customEffect);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error applying custom effect:', error);
      res.status(500).json({ error: 'Failed to apply custom effect' });
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
      
      // Filter devices based on targetDevices if specified
      const targetDevices = scene.targetDevices && scene.targetDevices.length > 0
        ? onlineDevices.filter(d => scene.targetDevices!.includes(d.id.toString()))
        : onlineDevices.filter(d => d.isAdopted);
      
      const config = scene.configuration as any;
      
      // Check if this is a custom JSON effect
      if (config.type === 'custom' && (scene as any).customJson) {
        await applyCustomEffect((scene as any).customJson, targetDevices);
      } else {
        // Apply preset scene configuration
        targetDevices.forEach(device => {
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
          if (config.color) {
            const color = hexToHsb(config.color);
            lifxService.setColor(device.mac, device.ip, {
              hue: color.hue,
              saturation: color.saturation,
              brightness: Math.round((config.brightness || 100) / 100 * 65535),
              kelvin: config.temperature || 3500
            });
          }
        });
      }
      
      broadcast({ type: 'scene_applied', payload: { sceneId, devices: targetDevices.map(d => d.id) } });
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
