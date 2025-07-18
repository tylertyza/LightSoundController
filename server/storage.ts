import { users, devices, soundButtons, scenes, lightEffects, type User, type InsertUser, type Device, type InsertDevice, type SoundButton, type InsertSoundButton, type Scene, type InsertScene, type LightEffect, type InsertLightEffect } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device management
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByMac(mac: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, updates: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  getOnlineDevices(): Promise<Device[]>;
  
  // Sound buttons
  getSoundButtons(): Promise<SoundButton[]>;
  getSoundButton(id: number): Promise<SoundButton | undefined>;
  createSoundButton(button: InsertSoundButton): Promise<SoundButton>;
  updateSoundButton(id: number, updates: Partial<SoundButton>): Promise<SoundButton | undefined>;
  deleteSoundButton(id: number): Promise<boolean>;
  
  // Scenes
  getScenes(): Promise<Scene[]>;
  getScene(id: number): Promise<Scene | undefined>;
  createScene(scene: InsertScene): Promise<Scene>;
  updateScene(id: number, updates: Partial<Scene>): Promise<Scene | undefined>;
  deleteScene(id: number): Promise<boolean>;
  
  // Light effects
  getLightEffects(): Promise<LightEffect[]>;
  getLightEffect(id: number): Promise<LightEffect | undefined>;
  createLightEffect(effect: InsertLightEffect): Promise<LightEffect>;
  updateLightEffect(id: number, updates: Partial<LightEffect>): Promise<LightEffect | undefined>;
  deleteLightEffect(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private soundButtons: Map<number, SoundButton>;
  private scenes: Map<number, Scene>;
  private lightEffects: Map<number, LightEffect>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.soundButtons = new Map();
    this.scenes = new Map();
    this.lightEffects = new Map();
    this.currentId = 1;
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize with default light effects - now with JSON format for editing
    const defaultEffects: InsertLightEffect[] = [
      { 
        name: 'Flash', 
        type: 'flash', 
        duration: 500, 
        configuration: { intensity: 100 }, 
        customJson: {
          name: 'Flash',
          description: 'Quick flash effect',
          loop: false,
          steps: [
            { brightness: 100, color: '#FFFFFF', duration: 100, easing: 'linear' },
            { brightness: 0, color: '#FFFFFF', duration: 100, easing: 'linear' },
            { brightness: 100, color: '#FFFFFF', duration: 100, easing: 'linear' }
          ]
        },
        hiddenFromDashboard: false,
        icon: 'zap'
      },
      { 
        name: 'Strobe', 
        type: 'strobe', 
        duration: 2000, 
        configuration: { frequency: 5, intensity: 100 }, 
        customJson: {
          name: 'Strobe',
          description: 'Strobe light effect',
          loop: true,
          loopCount: 0,
          steps: [
            { brightness: 100, color: '#FFFFFF', duration: 100, easing: 'linear' },
            { brightness: 0, color: '#FFFFFF', duration: 100, easing: 'linear' }
          ]
        },
        hiddenFromDashboard: false,
        icon: 'zap'
      },
      { 
        name: 'Fade', 
        type: 'fade', 
        duration: 1000, 
        configuration: { fadeIn: 500, fadeOut: 500 }, 
        customJson: {
          name: 'Fade',
          description: 'Smooth fade in/out',
          loop: false,
          steps: [
            { brightness: 0, color: '#F59E0B', duration: 1000, easing: 'ease-in-out' },
            { brightness: 100, color: '#F59E0B', duration: 1000, easing: 'ease-in-out' },
            { brightness: 0, color: '#F59E0B', duration: 1000, easing: 'ease-in-out' }
          ]
        },
        hiddenFromDashboard: false,
        icon: 'adjust'
      },
      { 
        name: 'Color Cycle', 
        type: 'cycle', 
        duration: 3000, 
        configuration: { colors: ['#ff0000', '#00ff00', '#0000ff'] }, 
        customJson: {
          name: 'Color Cycle',
          description: 'Cycle through RGB colors',
          loop: false,
          steps: [
            { brightness: 80, color: '#FF0000', duration: 1000, easing: 'ease-in-out' },
            { brightness: 80, color: '#00FF00', duration: 1000, easing: 'ease-in-out' },
            { brightness: 80, color: '#0000FF', duration: 1000, easing: 'ease-in-out' },
            { brightness: 80, color: '#FFFF00', duration: 1000, easing: 'ease-in-out' },
            { brightness: 80, color: '#FF00FF', duration: 1000, easing: 'ease-in-out' }
          ]
        },
        hiddenFromDashboard: false,
        icon: 'palette'
      },
      { 
        name: 'Breathe', 
        type: 'breathe', 
        duration: 2000, 
        configuration: { minBrightness: 10, maxBrightness: 100 }, 
        customJson: {
          name: 'Breathe',
          description: 'Breathing brightness effect',
          loop: true,
          loopCount: 0,
          steps: [
            { brightness: 20, color: '#4F46E5', duration: 2000, easing: 'ease-in-out' },
            { brightness: 80, color: '#4F46E5', duration: 2000, easing: 'ease-in-out' }
          ]
        },
        hiddenFromDashboard: false,
        icon: 'wind'
      },
    ];

    defaultEffects.forEach(effect => {
      this.createLightEffect(effect);
    });

    // Initialize with default scenes - now with JSON format for editing
    const defaultScenes: InsertScene[] = [
      { 
        name: 'Movie Night', 
        description: 'Dim warm lighting', 
        configuration: { brightness: 20, temperature: 2700 },
        colors: ['#ff8c00', '#ff4500'],
        icon: 'film',
        targetDevices: [],
        customJson: {
          name: 'Movie Night',
          description: 'Dim warm lighting',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: 20, 
                temperature: 2700, 
                power: true 
              }, 
              delay: 1000 
            }
          ]
        }
      },
      { 
        name: 'Focus Mode', 
        description: 'Bright cool white', 
        configuration: { brightness: 100, temperature: 6500 },
        colors: ['#87ceeb', '#ffffff'],
        icon: 'brain',
        targetDevices: [],
        customJson: {
          name: 'Focus Mode',
          description: 'Bright cool white',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: 100, 
                temperature: 6500, 
                power: true 
              }, 
              delay: 1000 
            }
          ]
        }
      },
      { 
        name: 'Party Time', 
        description: 'Rainbow colors', 
        configuration: { brightness: 80, effect: 'cycle' },
        colors: ['#8a2be2', '#ff69b4', '#0000ff'],
        icon: 'glass-cheers',
        targetDevices: [],
        customJson: {
          name: 'Party Time',
          description: 'Rainbow colors',
          loop: true,
          loopCount: 3,
          globalDelay: 1000,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: 80, 
                color: { hue: 53700, saturation: 65535, brightness: 50000 }, 
                power: true 
              }, 
              delay: 1000 
            },
            { 
              deviceIds: [], 
              settings: { 
                brightness: 80, 
                color: { hue: 54930, saturation: 65535, brightness: 50000 } 
              }, 
              delay: 1000 
            },
            { 
              deviceIds: [], 
              settings: { 
                brightness: 80, 
                color: { hue: 43690, saturation: 65535, brightness: 50000 } 
              }, 
              delay: 1000 
            }
          ]
        }
      },
      { 
        name: 'Relax', 
        description: 'Soft purple ambiance', 
        configuration: { brightness: 40, temperature: 3000 },
        colors: ['#dda0dd', '#6a5acd'],
        icon: 'leaf',
        targetDevices: [],
        customJson: {
          name: 'Relax',
          description: 'Soft purple ambiance',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: 40, 
                temperature: 3000, 
                power: true 
              }, 
              delay: 1500 
            }
          ]
        }
      },
    ];

    defaultScenes.forEach(scene => {
      this.createScene(scene);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByMac(mac: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(device => device.mac === mac);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentId++;
    const device: Device = { 
      ...insertDevice, 
      id, 
      lastSeen: new Date().toISOString(),
      isOnline: insertDevice.isOnline || false,
      power: insertDevice.power || false,
      brightness: insertDevice.brightness || 100,
      temperature: insertDevice.temperature || 3500,
      color: insertDevice.color || null,
      isAdopted: insertDevice.isAdopted || false
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: number, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updates };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
  }

  async getOnlineDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(device => device.isOnline);
  }

  async getSoundButtons(): Promise<SoundButton[]> {
    return Array.from(this.soundButtons.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getSoundButton(id: number): Promise<SoundButton | undefined> {
    return this.soundButtons.get(id);
  }

  async createSoundButton(insertButton: InsertSoundButton): Promise<SoundButton> {
    const id = this.currentId++;
    const sortOrder = this.soundButtons.size;
    const button: SoundButton = { 
      ...insertButton, 
      id, 
      sortOrder,
      description: insertButton.description || null,
      volume: insertButton.volume || 80,
      customJson: insertButton.customJson || null
    };
    this.soundButtons.set(id, button);
    return button;
  }

  async updateSoundButton(id: number, updates: Partial<SoundButton>): Promise<SoundButton | undefined> {
    const button = this.soundButtons.get(id);
    if (!button) return undefined;
    
    const updatedButton = { ...button, ...updates };
    this.soundButtons.set(id, updatedButton);
    return updatedButton;
  }

  async deleteSoundButton(id: number): Promise<boolean> {
    return this.soundButtons.delete(id);
  }

  async getScenes(): Promise<Scene[]> {
    return Array.from(this.scenes.values());
  }

  async getScene(id: number): Promise<Scene | undefined> {
    return this.scenes.get(id);
  }

  async createScene(insertScene: InsertScene): Promise<Scene> {
    const id = this.currentId++;
    const scene: Scene = { 
      ...insertScene, 
      id,
      description: insertScene.description || null,
      colors: insertScene.colors || null,
      icon: insertScene.icon || 'lightbulb',
      targetDevices: insertScene.targetDevices || []
    };
    this.scenes.set(id, scene);
    return scene;
  }

  async updateScene(id: number, updates: Partial<Scene>): Promise<Scene | undefined> {
    const scene = this.scenes.get(id);
    if (!scene) return undefined;
    
    const updatedScene = { ...scene, ...updates };
    this.scenes.set(id, updatedScene);
    return updatedScene;
  }

  async updateScene(id: number, updates: Partial<Scene>): Promise<Scene | undefined> {
    const scene = this.scenes.get(id);
    if (!scene) return undefined;
    
    const updatedScene = { ...scene, ...updates };
    this.scenes.set(id, updatedScene);
    return updatedScene;
  }

  async deleteScene(id: number): Promise<boolean> {
    return this.scenes.delete(id);
  }

  async getLightEffects(): Promise<LightEffect[]> {
    return Array.from(this.lightEffects.values());
  }

  async getLightEffect(id: number): Promise<LightEffect | undefined> {
    return this.lightEffects.get(id);
  }

  async createLightEffect(insertEffect: InsertLightEffect): Promise<LightEffect> {
    const id = this.currentId++;
    const effect: LightEffect = { 
      ...insertEffect, 
      id,
      duration: insertEffect.duration || 1000,
      hiddenFromDashboard: insertEffect.hiddenFromDashboard || false
    };
    this.lightEffects.set(id, effect);
    return effect;
  }

  async updateLightEffect(id: number, updates: Partial<LightEffect>): Promise<LightEffect | undefined> {
    const effect = this.lightEffects.get(id);
    if (!effect) return undefined;
    
    const updatedEffect = { ...effect, ...updates };
    this.lightEffects.set(id, updatedEffect);
    return updatedEffect;
  }

  async deleteLightEffect(id: number): Promise<boolean> {
    return this.lightEffects.delete(id);
  }
}

export const storage = new MemStorage();
