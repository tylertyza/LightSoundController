import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { audioStorage } from "./services/audio-storage";
import { LifxUDPService } from "./services/lifx-udp";
import { insertDeviceSchema, insertSoundButtonSchema, insertSceneSchema, insertLightEffectSchema, type WebSocketMessage, Device } from "@shared/schema";
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
        targetDevices.forEach((device: Device) => {
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
        await lifxService.triggerEffect(device.mac, device.ip, effectType, duration);
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
        
        // Wait for all effects to be triggered properly
        await Promise.all(onlineDevices.map(device => 
          lifxService.triggerEffect(device.mac, device.ip, button.lightEffect, 2000)
        ));
        
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

  // Manual device status refresh
  app.post('/api/devices/refresh-status', async (req, res) => {
    try {
      lifxService.requestAllDeviceStates();
      res.json({ message: 'Device status refresh triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh device status' });
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
      
      // Send power command to LIFX device
      lifxService.setPower(device.mac, device.ip, power);
      
      // Update device in storage
      const updatedDevice = await storage.updateDevice(deviceId, { 
        power,
        lastSeen: new Date().toISOString()
      });
      
      // Broadcast the update to all connected clients
      if (updatedDevice) {
        broadcast({ type: 'device_status', payload: updatedDevice });
      }
      
      res.json(updatedDevice);
    } catch (error) {
      console.error('Error updating device power:', error);
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
      const { name, description, lightEffect, color, icon, volume } = req.body;
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
        volume: volume ? parseInt(volume) : 80,
        customJson: null
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
      let { customEffect, deviceIds, loopCount = 1 } = req.body;

      const devices = await storage.getOnlineDevices();
      const targetDevices = devices.filter(d => deviceIds.includes(d.id.toString()));

      if (targetDevices.length === 0) {
        return res.status(400).json({ error: 'No devices found' });
      }

      if (Array.isArray(customEffect)) {
        customEffect = {
          name: 'Custom Effect',
          description: '',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: customEffect
        };
      }

      const finalLoopCount = customEffect?.loopCount !== undefined ? customEffect.loopCount : loopCount;

      for (const device of targetDevices as any[]) {
        const deviceIdStr = device.id.toString();
        const filteredSteps = (customEffect.steps || []).filter(
          (step: any) => !Array.isArray(step.deviceIds) || step.deviceIds.map(String).includes(deviceIdStr)
        );
        if (filteredSteps.length === 0) continue;
        const deviceCustomJson = { ...customEffect, steps: filteredSteps };
        lifxService.applyCustomEffect(deviceIdStr, device.mac, device.ip, deviceCustomJson, finalLoopCount);
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
  
  app.put('/api/scenes/:id', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.id);
      const sceneData = insertSceneSchema.parse(req.body);
      const scene = await storage.updateScene(sceneId, sceneData);
      
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      
      res.json(scene);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid scene data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update scene' });
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
      const deviceSettings = (scene as any).deviceSettings || {};
      
      // Check if this is a custom JSON effect
      if (config.type === 'custom' && (scene as any).customJson) {
        await applyCustomEffect((scene as any).customJson, targetDevices);
      } else {
        // Apply scene configuration with device-specific settings
        for (const device of targetDevices as Device[]) {
          const deviceId = device.id.toString();
          const specificSettings = deviceSettings[deviceId];
          
          // Turn on device if needed
          if ((scene as any).turnOnIfOff && !device.power) {
            lifxService.setPower(device.mac, device.ip, true);
          }
          
          // Use device-specific settings if available, otherwise use scene defaults
          const brightness = specificSettings?.brightness || config.brightness || 100;
          const color = specificSettings?.color || config.color;
          const temperature = config.temperature || 3500;
          const fadeInDuration = config.fadeIn || 0;
          const fadeOutDuration = config.fadeOut || 0;
          
          if (color) {
            const colorHsb = hexToHsb(color);
            lifxService.setColor(device.mac, device.ip, {
              hue: colorHsb.hue,
              saturation: colorHsb.saturation,
              brightness: Math.round(brightness / 100 * 65535),
              kelvin: temperature
            }, fadeInDuration);
          } else if (temperature !== undefined) {
            lifxService.setColor(device.mac, device.ip, {
              hue: 0,
              saturation: 0,
              brightness: Math.round(brightness / 100 * 65535),
              kelvin: temperature
            }, fadeInDuration);
          } else if (brightness !== undefined) {
            lifxService.setBrightness(device.mac, device.ip, brightness, fadeInDuration);
          }
          
          // Update device state in storage
          await storage.updateDevice(device.id, {
            power: true,
            brightness: brightness,
            color: color ? hexToHsb(color) : null,
            temperature: temperature
          });
        }
      }
      
      broadcast({ type: 'scene_applied', payload: { sceneId, devices: targetDevices.map(d => d.id) } });
      res.json({ message: 'Scene applied successfully' });
    } catch (error) {
      console.error('Error applying scene:', error);
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

  app.post('/api/light-effects/:id/apply', async (req, res) => {
    try {
      const effectId = parseInt(req.params.id);
      const { loopCount = 1 } = req.body;
      const effect = await storage.getLightEffect(effectId);
      console.log('[light-effects/:id/apply] Loaded effect:', JSON.stringify(effect));
      if (!effect) {
        return res.status(404).json({ error: 'Light effect not found' });
      }
      // Get all adopted devices if no specific devices are targeted
      const onlineDevices = await storage.getOnlineDevices();
      const targetDevices = onlineDevices.filter(d => d.isAdopted);
      if (targetDevices.length === 0) {
        return res.status(400).json({ error: 'No adopted devices available' });
      }
      // Save current state before applying effect
      const deviceStates = new Map();
      for (const device of targetDevices as Device[]) {
        deviceStates.set(device.id, {
          power: device.power,
          brightness: device.brightness,
          color: device.color,
          temperature: device.temperature
        });
      }
      // Use customJson from either top-level or configuration
      let customJson = effect.customJson || effect.configuration?.customJson;
      // PATCH: If customJson is just an array, wrap it in a default custom effect object
      if (Array.isArray(customJson)) {
        customJson = {
          name: effect.name || 'Custom Effect',
          description: effect.description || '',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: customJson
        };
      }
      const finalLoopCount = customJson?.loopCount !== undefined ? customJson.loopCount : loopCount;
      // Apply custom JSON effect if available
      if (customJson) {
        for (const device of targetDevices as any[]) {
          // Filter steps for this device
          const deviceIdStr = device.id.toString();
          const filteredSteps = (customJson.steps || []).filter(
            (step: any) => Array.isArray(step.deviceIds) && step.deviceIds.map(String).includes(deviceIdStr)
          );
          if (filteredSteps.length === 0) continue;
          // Build a customJson for this device
          const deviceCustomJson = { ...customJson, steps: filteredSteps };
          // Pass deviceIdStr as the first argument for filtering, and MAC/IP for UDP
          lifxService.applyCustomEffect(deviceIdStr, device.mac, device.ip, deviceCustomJson, finalLoopCount);
        }
        broadcast({ type: 'custom_effect_applied', payload: { effectId, devices: targetDevices.map(d => d.id.toString()) } });
      } else {
        // Apply basic effect type
        for (const device of targetDevices as Device[]) {
          await lifxService.triggerEffect(device.mac, device.ip, effect.type, effect.duration);
        }
        broadcast({ type: 'custom_effect_applied', payload: { effectId, devices: targetDevices.map(d => d.id.toString()) } });
      }
      // Store the saved states for later restoration (if not infinite loop)
      if (finalLoopCount !== 0) {
        // Calculate total duration and schedule restoration
        const totalDuration = calculateTotalEffectDuration(effect, finalLoopCount);
        setTimeout(async () => {
          await restoreDeviceStates(deviceStates, targetDevices as Device[]);
        }, totalDuration);
      }
      res.json({ message: 'Light effect applied successfully' });
    } catch (error) {
      console.error('Error applying light effect:', error);
      res.status(500).json({ error: 'Failed to apply light effect' });
    }
  });

  app.post('/api/light-effects/:id/stop', async (req, res) => {
    try {
      const effectId = parseInt(req.params.id);
      const effect = await storage.getLightEffect(effectId);
      if (!effect) {
        return res.status(404).json({ error: 'Light effect not found' });
      }
      // Get all adopted devices
      const onlineDevices = await storage.getOnlineDevices();
      const targetDevices = onlineDevices.filter(d => d.isAdopted);
      // Stop effects on all target devices
      for (const device of targetDevices as Device[]) {
        lifxService.stopEffect(device.mac, device.ip);
      }
      if (effect.customJson) {
        broadcast({ type: 'custom_effect_applied', payload: { effectId, devices: targetDevices.map(d => d.id.toString()) } });
      } else {
        broadcast({ type: 'light_effect_stopped', payload: { effectId, devices: targetDevices.map(d => d.id.toString()) } });
      }
      res.json({ message: 'Light effect stopped successfully' });
    } catch (error) {
      console.error('Error stopping light effect:', error);
      res.status(500).json({ error: 'Failed to stop light effect' });
    }
  });

  app.put('/api/light-effects/:id', async (req, res) => {
    try {
      const effectId = parseInt(req.params.id);
      const effectData = insertLightEffectSchema.parse(req.body);
      const effect = await storage.updateLightEffect(effectId, effectData);
      
      if (!effect) {
        return res.status(404).json({ error: 'Light effect not found' });
      }
      
      res.json(effect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid light effect data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update light effect' });
      }
    }
  });

  app.delete('/api/light-effects/:id', async (req, res) => {
    try {
      const effectId = parseInt(req.params.id);
      const success = await storage.deleteLightEffect(effectId);
      
      if (success) {
        res.json({ message: 'Light effect deleted successfully' });
      } else {
        res.status(404).json({ error: 'Light effect not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete light effect' });
    }
  });

  // Helper function to calculate total effect duration
  function calculateTotalEffectDuration(effect: any, loopCount: number) {
    if (!effect.customJson) return effect.duration || 1000;
    
    const config = effect.customJson;
    const steps = config.steps || [];
    const globalDelay = config.globalDelay || 0;
    
    // Calculate duration of one cycle
    let cycleDuration = 0;
    steps.forEach((step: any) => {
      cycleDuration += (step.duration || 1000);
      cycleDuration += (step.delay || 0);
    });
    
    // Add global delay
    cycleDuration += globalDelay;
    
    // Multiply by loop count
    return cycleDuration * loopCount;
  }

  // Helper function to restore device states
  async function restoreDeviceStates(deviceStates: Map<number, any>, targetDevices: Device[]) {
    for (const device of targetDevices) {
      const savedState = deviceStates.get(device.id);
      if (savedState) {
        // Restore power state
        if (savedState.power !== undefined) {
          lifxService.setPower(device.mac, device.ip, savedState.power);
        }
        
        // Restore color and brightness
        if (savedState.color) {
          lifxService.setColor(device.mac, device.ip, {
            hue: savedState.color.hue,
            saturation: savedState.color.saturation,
            brightness: savedState.color.brightness || Math.round((savedState.brightness || 100) / 100 * 65535),
            kelvin: savedState.temperature || 3500
          });
        } else if (savedState.brightness) {
          lifxService.setBrightness(device.mac, device.ip, savedState.brightness);
        }
        
        // Update device state in storage
        await storage.updateDevice(device.id, {
          power: savedState.power,
          brightness: savedState.brightness,
          color: savedState.color,
          temperature: savedState.temperature
        });
      }
    }
  }

  return httpServer;
}
