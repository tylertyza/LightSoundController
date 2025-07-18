import { createSocket, Socket } from 'dgram';
import { EventEmitter } from 'events';
import { Device } from '@shared/schema';

interface LifxPacket {
  size: number;
  protocol: number;
  addressable: boolean;
  tagged: boolean;
  origin: number;
  source: number;
  target: string;
  ackRequired: boolean;
  resRequired: boolean;
  sequence: number;
  type: number;
  payload: Buffer;
}

interface ColorHSBK {
  hue: number;
  saturation: number;
  brightness: number;
  kelvin: number;
}

export class LifxUDPService extends EventEmitter {
  private socket: Socket;
  private readonly port = 56700;
  private readonly broadcastAddress = '255.255.255.255';
  private sequence = 0;
  private source: number;
  private discoveredDevices: Map<string, Device> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private stateUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.socket = createSocket('udp4');
    this.source = Math.floor(Math.random() * 0xFFFFFFFF);
    this.setupSocket();
    this.setupConnectionMonitoring();
  }

  private setupSocket() {
    this.socket.on('message', (msg, rinfo) => {
      try {
        const packet = this.parsePacket(msg);
        this.handlePacket(packet, rinfo);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.resetConnectionTimeout();
      } catch (error) {
        console.error('Error parsing LIFX packet:', error);
      }
    });

    this.socket.on('error', (error) => {
      console.error('UDP socket error:', error);
      this.isConnected = false;
      this.emit('error', error);
      this.attemptReconnect();
    });

    this.socket.on('close', () => {
      console.log('UDP socket closed');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.socket.bind(() => {
      this.socket.setBroadcast(true);
      this.isConnected = true;
      console.log('LIFX UDP service listening on port', this.port);
      this.startStateUpdateInterval();
    });
  }

  private setupConnectionMonitoring() {
    // Monitor connection and reconnect if needed
    setInterval(() => {
      if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  private resetConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    this.connectionTimeout = setTimeout(() => {
      if (this.isConnected) {
        console.log('Connection timeout detected, attempting to reconnect...');
        this.isConnected = false;
        this.attemptReconnect();
      }
    }, 60000); // 1 minute timeout
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      this.socket.close();
      this.socket = createSocket('udp4');
      this.setupSocket();
    } catch (error) {
      console.error('Error during reconnection:', error);
      setTimeout(() => this.attemptReconnect(), 5000);
    }
  }

  private parsePacket(buffer: Buffer): LifxPacket {
    if (buffer.length < 36) {
      throw new Error('Packet too short');
    }

    const size = buffer.readUInt16LE(0);
    const frameHeader = buffer.readUInt16LE(2);
    const protocol = (frameHeader & 0x0FFF);
    const addressable = !!(frameHeader & 0x1000);
    const tagged = !!(frameHeader & 0x2000);
    const origin = (frameHeader & 0xC000) >> 14;
    const source = buffer.readUInt32LE(4);
    
    const target = buffer.subarray(8, 16).toString('hex');
    const frameAddress = buffer.readUInt16LE(22);
    const ackRequired = !!(frameAddress & 0x0002);
    const resRequired = !!(frameAddress & 0x0001);
    const sequence = buffer.readUInt8(23);
    
    const type = buffer.readUInt16LE(32);
    const payload = buffer.subarray(36);

    return {
      size,
      protocol,
      addressable,
      tagged,
      origin,
      source,
      target,
      ackRequired,
      resRequired,
      sequence,
      type,
      payload
    };
  }

  private handlePacket(packet: LifxPacket, rinfo: any) {
    switch (packet.type) {
      case 3: // StateService
        this.handleStateService(packet, rinfo);
        break;
      case 22: // StatePower
        this.handleStatePower(packet, rinfo);
        break;
      case 107: // LightState
        this.handleLightState(packet, rinfo);
        break;
      case 25: // StateLabel
        this.handleStateLabel(packet, rinfo);
        break;
      default:
        console.log('Unknown packet type:', packet.type);
    }
  }

  private handleStateService(packet: LifxPacket, rinfo: any) {
    const service = packet.payload.readUInt8(0);
    const port = packet.payload.readUInt32LE(1);
    
    if (service === 1 && port === 56700) {
      console.log('Discovered LIFX device:', packet.target, 'at', rinfo.address);
      this.requestDeviceLabel(packet.target, rinfo.address);
    }
  }

  private handleStatePower(packet: LifxPacket, rinfo: any) {
    const power = packet.payload.readUInt16LE(0) > 0;
    const deviceId = packet.target;
    
    this.emit('device_power_update', { deviceId, power, ip: rinfo.address });
  }

  private handleLightState(packet: LifxPacket, rinfo: any) {
    const hue = packet.payload.readUInt16LE(0);
    const saturation = packet.payload.readUInt16LE(2);
    const brightness = packet.payload.readUInt16LE(4);
    const kelvin = packet.payload.readUInt16LE(6);
    const power = packet.payload.readUInt16LE(10) > 0;
    
    const deviceId = packet.target;
    
    this.emit('device_state_update', {
      deviceId,
      ip: rinfo.address,
      power,
      color: { hue, saturation, brightness, kelvin },
      brightness: Math.round((brightness / 65535) * 100),
      temperature: kelvin
    });
  }

  private handleStateLabel(packet: LifxPacket, rinfo: any) {
    const label = packet.payload.toString('utf8').replace(/\0/g, '');
    const deviceId = packet.target;
    
    // Request device type and other info
    this.requestDevicePower(deviceId, rinfo.address);
    this.requestLightState(deviceId, rinfo.address);
    
    this.emit('device_discovered', {
      mac: deviceId,
      ip: rinfo.address,
      label: label || 'LIFX Device',
      deviceType: 'LIFX Device',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      power: false,
      brightness: 100,
      temperature: 3500
    });
  }

  private createPacket(type: number, payload: Buffer = Buffer.alloc(0), target: string = '000000000000', tagged: boolean = false): Buffer {
    const size = 36 + payload.length;
    const buffer = Buffer.alloc(size);
    
    // Frame
    buffer.writeUInt16LE(size, 0);
    buffer.writeUInt16LE(1024 | (tagged ? 0x2000 : 0) | 0x1000, 2); // protocol | tagged | addressable
    buffer.writeUInt32LE(this.source, 4);
    
    // Frame Address
    Buffer.from(target.padEnd(16, '0'), 'hex').copy(buffer, 8);
    buffer.writeUInt16LE(0x0001, 22); // res_required
    buffer.writeUInt8(this.getNextSequence(), 23);
    
    // Protocol Header
    buffer.writeUInt16LE(type, 32);
    
    // Payload
    payload.copy(buffer, 36);
    
    return buffer;
  }

  private getNextSequence(): number {
    this.sequence = (this.sequence + 1) % 256;
    return this.sequence;
  }

  private sendPacket(packet: Buffer, address: string = this.broadcastAddress) {
    if (!this.isConnected) {
      console.warn('Socket not connected, attempting to reconnect...');
      this.attemptReconnect();
      return;
    }

    this.socket.send(packet, this.port, address, (error) => {
      if (error) {
        console.error('Error sending packet:', error);
        this.isConnected = false;
        this.attemptReconnect();
      }
    });
  }

  public discoverDevices() {
    console.log('Starting device discovery...');
    const packet = this.createPacket(2, Buffer.alloc(0), '000000000000', true); // GetService
    this.sendPacket(packet);
    
    // Send discovery packets to common IP ranges
    for (let i = 1; i <= 254; i++) {
      const ip = `192.168.1.${i}`;
      this.sendPacket(packet, ip);
    }
  }

  private requestDeviceLabel(target: string, address: string) {
    const packet = this.createPacket(23, Buffer.alloc(0), target); // GetLabel
    this.sendPacket(packet, address);
  }

  private requestDevicePower(target: string, address: string) {
    const packet = this.createPacket(20, Buffer.alloc(0), target); // GetPower
    this.sendPacket(packet, address);
  }

  private requestLightState(target: string, address: string) {
    const packet = this.createPacket(101, Buffer.alloc(0), target); // GetColor
    this.sendPacket(packet, address);
  }

  public setPower(target: string, address: string, power: boolean) {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(power ? 65535 : 0, 0);
    const packet = this.createPacket(21, payload, target); // SetPower
    this.sendPacket(packet, address);
  }

  public setColor(target: string, address: string, color: ColorHSBK, duration: number = 0) {
    const payload = Buffer.alloc(13);
    payload.writeUInt8(0, 0); // reserved
    payload.writeUInt16LE(color.hue, 1);
    payload.writeUInt16LE(color.saturation, 3);
    payload.writeUInt16LE(color.brightness, 5);
    payload.writeUInt16LE(color.kelvin, 7);
    payload.writeUInt32LE(duration, 9);
    
    const packet = this.createPacket(102, payload, target); // SetColor
    this.sendPacket(packet, address);
  }

  public setBrightness(target: string, address: string, brightness: number, duration: number = 0) {
    const payload = Buffer.alloc(6);
    payload.writeUInt16LE(Math.round((brightness / 100) * 65535), 0);
    payload.writeUInt32LE(duration, 2);
    
    const packet = this.createPacket(119, payload, target); // SetLightPower
    this.sendPacket(packet, address);
  }

  public triggerEffect(target: string, address: string, effectType: string, duration: number = 1000) {
    // Save current state before applying effect
    this.saveDeviceState(target);
    
    switch (effectType) {
      case 'flash':
        this.flashEffect(target, address, duration);
        break;
      case 'strobe':
        this.strobeEffect(target, address, duration);
        break;
      case 'fade':
        this.fadeEffect(target, address, duration);
        break;
      case 'breathe':
        this.breatheEffect(target, address, duration);
        break;
      case 'cycle':
        this.cycleEffect(target, address, duration);
        break;
    }
    
    // Restore state after effect completes
    setTimeout(() => {
      this.restoreDeviceState(target, address);
    }, duration + 500);
  }

  private flashEffect(target: string, address: string, duration: number) {
    // Quick flash to white and back
    this.setColor(target, address, { hue: 0, saturation: 0, brightness: 65535, kelvin: 6500 }, 0);
    setTimeout(() => {
      this.setColor(target, address, { hue: 0, saturation: 0, brightness: 32768, kelvin: 3500 }, 500);
    }, duration);
  }

  private strobeEffect(target: string, address: string, duration: number) {
    const interval = 100;
    const cycles = Math.floor(duration / (interval * 2));
    
    for (let i = 0; i < cycles; i++) {
      setTimeout(() => {
        this.setColor(target, address, { hue: 0, saturation: 0, brightness: 65535, kelvin: 6500 }, 0);
      }, i * interval * 2);
      
      setTimeout(() => {
        this.setColor(target, address, { hue: 0, saturation: 0, brightness: 0, kelvin: 3500 }, 0);
      }, (i * interval * 2) + interval);
    }
  }

  private fadeEffect(target: string, address: string, duration: number) {
    const steps = 20;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      setTimeout(() => {
        const brightness = Math.round((i / steps) * 65535);
        this.setColor(target, address, { hue: 0, saturation: 0, brightness, kelvin: 3500 }, stepDuration);
      }, i * stepDuration);
    }
  }

  private breatheEffect(target: string, address: string, duration: number) {
    const halfDuration = duration / 2;
    
    // Fade in
    this.setColor(target, address, { hue: 0, saturation: 0, brightness: 65535, kelvin: 3500 }, halfDuration);
    
    // Fade out
    setTimeout(() => {
      this.setColor(target, address, { hue: 0, saturation: 0, brightness: 16384, kelvin: 3500 }, halfDuration);
    }, halfDuration);
  }

  private cycleEffect(target: string, address: string, duration: number) {
    const colors = [
      { hue: 0, saturation: 65535, brightness: 65535, kelvin: 3500 },     // Red
      { hue: 21845, saturation: 65535, brightness: 65535, kelvin: 3500 }, // Green
      { hue: 43690, saturation: 65535, brightness: 65535, kelvin: 3500 }, // Blue
      { hue: 10922, saturation: 65535, brightness: 65535, kelvin: 3500 }, // Yellow
      { hue: 54613, saturation: 65535, brightness: 65535, kelvin: 3500 }, // Purple
    ];
    
    const stepDuration = duration / colors.length;
    
    colors.forEach((color, index) => {
      setTimeout(() => {
        // Use stepDuration for smooth fading to next color
        this.setColor(target, address, color, Math.round(stepDuration * 0.8));
      }, index * stepDuration);
    });
  }

  // Store active effects to allow stopping them
  private activeEffects: Map<string, NodeJS.Timeout[]> = new Map();
  
  // Store device states before applying effects so we can restore them
  private savedDeviceStates: Map<string, ColorHSBK & { power: boolean }> = new Map();

  // Save device state before applying effects
  private saveDeviceState(target: string) {
    const device = this.discoveredDevices.get(target);
    if (device) {
      const state = {
        hue: device.color?.hue || 0,
        saturation: device.color?.saturation || 0,
        brightness: device.color?.brightness || Math.round((device.brightness || 100) / 100 * 65535),
        kelvin: device.color?.kelvin || device.temperature || 3500,
        power: device.power || false
      };
      this.savedDeviceStates.set(target, state);
      console.log(`Saved state for device ${target}:`, state);
    }
  }

  // Restore device state after stopping effects
  private restoreDeviceState(target: string, address: string) {
    const savedState = this.savedDeviceStates.get(target);
    if (savedState) {
      console.log(`Restoring state for device ${target}:`, savedState);
      
      // Restore power state
      if (savedState.power !== undefined) {
        this.setPower(target, address, savedState.power);
      }
      
      // Restore color/brightness with a small delay to ensure power command is processed
      setTimeout(() => {
        this.setColor(target, address, {
          hue: savedState.hue,
          saturation: savedState.saturation,
          brightness: savedState.brightness,
          kelvin: savedState.kelvin
        }, 500); // 500ms transition back to original state
      }, 100);
      
      // Clean up saved state
      this.savedDeviceStates.delete(target);
    }
  }

  // New method to handle complex JSON effects
  public applyCustomEffect(target: string, address: string, effectData: any, loopCount: number = 1) {
    if (!effectData || !effectData.steps || !Array.isArray(effectData.steps)) {
      console.error('Invalid effect data:', effectData);
      return;
    }

    // Stop any existing effect for this device
    this.stopEffect(target, address);

    // Save current device state before applying effect
    this.saveDeviceState(target);

    let currentLoop = 0;
    const maxLoops = loopCount || 1;
    const isInfiniteLoop = loopCount === 0;
    const timeouts: NodeJS.Timeout[] = [];

    const executeSteps = () => {
      let currentTime = 0;
      
      effectData.steps.forEach((step: any, index: number) => {
        const timeout = setTimeout(() => {
          const color = this.parseColorFromStep(step);
          const duration = step.duration || 1000;
          
          console.log(`Applying step ${index + 1}: brightness=${step.brightness}%, color=${step.color}, duration=${duration}ms`);
          this.setColor(target, address, color, duration);
        }, currentTime);
        
        timeouts.push(timeout);
        currentTime += step.duration || 1000;
      });
      
      // Handle looping with count limit or infinite
      if (effectData.loop && (isInfiniteLoop || currentLoop < maxLoops - 1)) {
        currentLoop++;
        const loopTimeout = setTimeout(() => {
          executeSteps();
        }, currentTime);
        timeouts.push(loopTimeout);
      } else if (!effectData.loop || (!isInfiniteLoop && currentLoop >= maxLoops - 1)) {
        // Effect finished, restore state after completion
        const restoreTimeout = setTimeout(() => {
          this.restoreDeviceState(target, address);
        }, currentTime + 500); // Small delay after effect completes
        timeouts.push(restoreTimeout);
      }
    };
    
    // Store timeouts for this device so we can stop them later
    this.activeEffects.set(target, timeouts);
    executeSteps();
  }

  // Method to stop an active effect
  public stopEffect(target: string, address?: string) {
    const timeouts = this.activeEffects.get(target);
    if (timeouts) {
      timeouts.forEach(timeout => clearTimeout(timeout));
      this.activeEffects.delete(target);
      console.log(`Stopped effect for device: ${target}`);
      
      // Restore previous state if we have address
      if (address) {
        this.restoreDeviceState(target, address);
      }
    }
  }

  private parseColorFromStep(step: any): ColorHSBK {
    let color: ColorHSBK = { hue: 0, saturation: 0, brightness: 65535, kelvin: 3500 };
    
    // Handle brightness
    if (step.brightness !== undefined) {
      color.brightness = Math.round((step.brightness / 100) * 65535);
    }
    
    // Handle color (hex format)
    if (step.color && step.color.startsWith('#')) {
      const hex = step.color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
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
      
      color.hue = Math.round((hue / 360) * 65535);
      color.saturation = Math.round(saturation * 65535);
      color.kelvin = 0; // Use color instead of kelvin
    }
    
    // Handle temperature
    if (step.temperature && step.temperature > 0) {
      color.kelvin = step.temperature;
      color.hue = 0;
      color.saturation = 0; // White light
    }
    
    return color;
  }

  public setTemperature(target: string, address: string, temperature: number, duration: number = 0) {
    const payload = Buffer.alloc(13);
    payload.writeUInt8(0, 0); // reserved
    payload.writeUInt16LE(0, 1); // hue
    payload.writeUInt16LE(0, 3); // saturation (0 for white)
    payload.writeUInt16LE(65535, 5); // brightness (full)
    payload.writeUInt16LE(temperature, 7); // kelvin
    payload.writeUInt32LE(duration, 9);
    
    const packet = this.createPacket(102, payload, target); // SetColor
    this.sendPacket(packet, address);
  }

  public getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values());
  }

  private startStateUpdateInterval() {
    // Clear existing interval if any
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }
    
    // Request device states every 2 seconds
    this.stateUpdateInterval = setInterval(() => {
      this.requestAllDeviceStates();
    }, 2000);
  }

  private requestAllDeviceStates() {
    for (const device of this.discoveredDevices.values()) {
      if (device.ip && device.mac) {
        this.requestDevicePower(device.mac, device.ip);
        this.requestLightState(device.mac, device.ip);
      }
    }
  }

  public close() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }
    this.isConnected = false;
    this.socket.close();
  }
}
