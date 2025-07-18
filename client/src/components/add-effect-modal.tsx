import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Volume2, Lightbulb, FileText, Zap } from "lucide-react";
import { Device, InsertSoundButton, InsertScene, Scene, LightEffect, customLightingEffectSchema } from "@shared/schema";
import LightingEffects from "./lighting-effects";

interface AddEffectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSound: (data: InsertSoundButton & { audioFile: File }) => void;
  onSaveScene: (data: InsertScene & { turnOnIfOff?: boolean; deviceSettings?: any }) => void;
  onDeleteScene?: (id: number) => void;
  devices: Device[];
  editingScene?: Scene | null;
  editingLightingEffect?: LightEffect | null;
  lightEffects: LightEffect[];
}

export function AddEffectModal({ isOpen, onClose, onSaveSound, onSaveScene, onDeleteScene, devices, editingScene, editingLightingEffect, lightEffects }: AddEffectModalProps) {
  const [effectType, setEffectType] = useState<'sound' | 'scene' | 'lighting'>('sound');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  
  // Sound effect form
  const [soundName, setSoundName] = useState('');
  const [soundDescription, setSoundDescription] = useState('');
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundColor, setSoundColor] = useState('#3b82f6');
  const [soundIcon, setSoundIcon] = useState('volume-2');
  const [soundLightEffect, setSoundLightEffect] = useState('flash');
  const [soundVolume, setSoundVolume] = useState(80);
  
  // Scene effect form
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [sceneIcon, setSceneIcon] = useState('lightbulb');
  const [sceneType, setSceneType] = useState<'preset' | 'custom'>('preset');
  const [customEffectFile, setCustomEffectFile] = useState<File | null>(null);
  const [customEffectJson, setCustomEffectJson] = useState('');
  const [presetEffect, setPresetEffect] = useState('breathe');
  const [sceneBrightness, setSceneBrightness] = useState(80);
  const [sceneColor, setSceneColor] = useState('#ffffff');
  const [sceneTemperature, setSceneTemperature] = useState(3500);
  const [sceneFadeIn, setSceneFadeIn] = useState(1000);
  const [sceneFadeOut, setSceneFadeOut] = useState(1000);
  const [turnOnIfOff, setTurnOnIfOff] = useState(true);
  const [deviceSettings, setDeviceSettings] = useState<{[key: string]: {color: string, brightness: number}}>({});
  
  // Custom lighting effect form fields
  const [customEffectLoop, setCustomEffectLoop] = useState(false);
  const [customEffectLoopCount, setCustomEffectLoopCount] = useState(1);
  const [customEffectGlobalDelay, setCustomEffectGlobalDelay] = useState(0);
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false);
  const [isDevicesCollapsed, setIsDevicesCollapsed] = useState(false);
  const [isModalDevicesCollapsed, setIsModalDevicesCollapsed] = useState(false);

  // Initialize form with editing scene data
  useEffect(() => {
    if (editingScene) {
      setEffectType('scene');
      setSceneName(editingScene.name);
      setSceneDescription(editingScene.description || '');
      setSceneIcon(editingScene.icon);
      setSelectedDevices(editingScene.targetDevices || []);
      
      // All scenes now show as custom with JSON data
      setSceneType('custom');
      
      // Convert scene to JSON format for editing
      let jsonData = (editingScene as any).customJson;
      if (!jsonData) {
        // Convert legacy scene to JSON format
        const config = editingScene.configuration;
        jsonData = {
          name: editingScene.name,
          description: editingScene.description || '',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: config?.brightness || 80, 
                temperature: config?.temperature || 3500,
                power: true 
              }, 
              delay: 1000 
            }
          ]
        };
      }
      
      // Extract just the steps array for the JSON editor
      const stepsArray = jsonData.steps || [];
      setCustomEffectJson(JSON.stringify(stepsArray, null, 2));
      
      // Set form fields from JSON data
      setCustomEffectLoop(jsonData.loop || false);
      setCustomEffectLoopCount(jsonData.loopCount || 1);
      setCustomEffectGlobalDelay(jsonData.globalDelay || 0);
      
      // Load device-specific settings
      const savedDeviceSettings = (editingScene as any).deviceSettings || {};
      setDeviceSettings(savedDeviceSettings);
      
      // Load turnOnIfOff setting
      setTurnOnIfOff((editingScene as any).turnOnIfOff !== false);
    } else {
      // Reset form when not editing
      setEffectType('sound');
      setSceneName('');
      setSceneDescription('');
      setSceneIcon('lightbulb');
      setSelectedDevices([]);
      setSceneColor('#ffffff');
      setSceneBrightness(80);
      setSceneFadeIn(1000);
      setSceneFadeOut(1000);
      setDeviceSettings({});
      setTurnOnIfOff(true);
    }
  }, [editingScene]);

  // Handle editing lighting effect
  useEffect(() => {
    if (editingLightingEffect) {
      setEffectType('lighting');
      setSceneName(editingLightingEffect.name);
      setSceneDescription(editingLightingEffect.description || '');
      setSceneIcon(editingLightingEffect.icon || 'zap');
      
      // All effects now show as custom with JSON data
      setSceneType('custom');
      
      // Convert effect to JSON format for editing
      let jsonData = editingLightingEffect.customJson;
      if (!jsonData) {
        // Convert legacy effect to JSON format
        jsonData = {
          name: editingLightingEffect.name,
          description: editingLightingEffect.description || '',
          loop: false,
          loopCount: 1,
          globalDelay: 0,
          steps: [
            { 
              deviceIds: [], 
              settings: { 
                brightness: 100, 
                power: true 
              }, 
              delay: editingLightingEffect.duration || 1000 
            }
          ]
        };
      }
      
      // Extract just the steps array for the JSON editor
      const stepsArray = jsonData.steps || [];
      setCustomEffectJson(JSON.stringify(stepsArray, null, 2));
      
      // Set form fields from JSON data
      setCustomEffectLoop(jsonData.loop || false);
      setCustomEffectLoopCount(jsonData.loopCount || 1);
      setCustomEffectGlobalDelay(jsonData.globalDelay || 0);
      setHiddenFromDashboard(editingLightingEffect.hiddenFromDashboard || false);
    }
  }, [editingLightingEffect]);

  const adoptedDevices = devices.filter(device => device.isAdopted);

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleDeviceColorChange = (deviceId: string, color: string) => {
    setDeviceSettings(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        color,
        brightness: prev[deviceId]?.brightness || 80
      }
    }));
  };

  const handleDeviceBrightnessChange = (deviceId: string, brightness: number) => {
    setDeviceSettings(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        brightness,
        color: prev[deviceId]?.color || '#ffffff'
      }
    }));
  };

  const handleSubmit = () => {
    if (effectType === 'sound') {
      if (!soundName || !soundFile) return;
      
      // Sound effects reference existing lighting effects
      const lightEffect = soundLightEffect;
      
      onSaveSound({
        name: soundName,
        description: soundDescription || undefined,
        audioFile: soundFile,
        lightEffect: lightEffect,
        color: soundColor,
        icon: soundIcon,
        volume: soundVolume,
        customJson: null,
      });
    } else if (effectType === 'lighting') {
      if (!sceneName) return;
      
      // Parse and validate the steps JSON
      let stepsArray = [];
      if (customEffectJson) {
        try {
          stepsArray = JSON.parse(customEffectJson);
          if (!Array.isArray(stepsArray)) {
            throw new Error('Steps must be an array');
          }
        } catch (error) {
          console.error('Invalid steps JSON:', error);
          return;
        }
      }
      
      // Create a complete lighting effect JSON
      const completeEffect = {
        name: sceneName,
        description: sceneDescription || undefined,
        loop: customEffectLoop,
        loopCount: customEffectLoopCount,
        globalDelay: customEffectGlobalDelay,
        steps: stepsArray
      };
      
      // Create a lighting effect
      const lightingEffect = {
        name: sceneName,
        description: sceneDescription || undefined,
        type: 'custom',
        duration: 2000,
        configuration: {
          customJson: completeEffect
        },
        hiddenFromDashboard: hiddenFromDashboard
      };
      
      // Use the onSaveScene callback to handle both create and update
      onSaveScene(lightingEffect);
      
    } else {
      if (!sceneName) return;
      
      const configuration = {
        type: 'simple',
        color: sceneColor,
        brightness: sceneBrightness,
        fadeIn: sceneFadeIn,
        fadeOut: sceneFadeOut,
      };
      
      onSaveScene({
        name: sceneName,
        description: sceneDescription || undefined,
        configuration,
        colors: [sceneColor, '#1f2937'], // Add second color for gradient
        icon: sceneIcon,
        targetDevices: selectedDevices,
        customJson: null,
        turnOnIfOff,
        deviceSettings
      });
    }
    
    handleClose();
  };

  const handleDelete = async () => {
    if (editingScene && onDeleteScene) {
      await onDeleteScene(editingScene.id);
    } else if (editingLightingEffect) {
      // Delete lighting effect
      try {
        const response = await fetch(`/api/light-effects/${editingLightingEffect.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Refresh the page to update the effects list
          window.location.reload();
        }
      } catch (error) {
        console.error('Error deleting lighting effect:', error);
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setSoundName('');
    setSoundDescription('');
    setSoundFile(null);
    setSoundColor('#3b82f6');
    setSoundIcon('volume-2');
    setSoundLightEffect('flash');
    setSoundVolume(80);
    setSceneName('');
    setSceneDescription('');
    setSceneIcon('lightbulb');
    setSceneType('preset');
    setCustomEffectFile(null);
    setCustomEffectJson('');
    setPresetEffect('breathe');
    setSceneBrightness(80);
    setSceneColor('#ffffff');
    setSceneTemperature(3500);
    setSelectedDevices([]);
    setTurnOnIfOff(true);
    setDeviceSettings({});
    setCustomEffectLoop(false);
    setCustomEffectLoopCount(1);
    setCustomEffectGlobalDelay(0);
    setHiddenFromDashboard(false);
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'sound' | 'custom') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'sound') {
      setSoundFile(file);
    } else {
      setCustomEffectFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCustomEffectJson(content);
      };
      reader.readAsText(file);
    }
  };

  const exampleSteps = [
    {
      brightness: 100,
      color: "#ff0000",
      duration: 1000,
      easing: { type: "ease-in-out", duration: 200 },
      deviceIds: ["1", "2"]
    },
    {
      brightness: 80,
      color: "#00ff00",
      duration: 1000,
      easing: { type: "ease-in-out", duration: 200 },
      deviceIds: ["1", "2"]
    },
    {
      brightness: 60,
      color: "#0000ff",
      duration: 1000,
      easing: { type: "ease-in-out", duration: 200 },
      deviceIds: ["1", "2"]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingScene ? 'Edit Scene' : 'Add New Effect'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {editingScene ? 'Edit the lighting scene' : 'Create a new sound effect or lighting scene with device targeting'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={effectType} onValueChange={(value) => setEffectType(value as 'sound' | 'scene' | 'lighting')}>
          {!editingScene && (
            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
              <TabsTrigger value="sound" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-white">
                <Volume2 className="w-4 h-4 mr-2" />
                Sound Effect
              </TabsTrigger>
              <TabsTrigger value="scene" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-white">
                <Lightbulb className="w-4 h-4 mr-2" />
                Lighting Scene
              </TabsTrigger>
              <TabsTrigger value="lighting" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-white">
                <Zap className="w-4 h-4 mr-2" />
                Lighting Effects
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="sound" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Name</Label>
                <Input
                  value={soundName}
                  onChange={(e) => setSoundName(e.target.value)}
                  placeholder="Sound effect name"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Icon</Label>
                <Select value={soundIcon} onValueChange={setSoundIcon}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="volume-2" className="text-white">Volume</SelectItem>
                    <SelectItem value="music" className="text-white">Music</SelectItem>
                    <SelectItem value="zap" className="text-white">Zap</SelectItem>
                    <SelectItem value="bell" className="text-white">Bell</SelectItem>
                    <SelectItem value="megaphone" className="text-white">Megaphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={soundDescription}
                onChange={(e) => setSoundDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Lighting Effect</Label>
                <Select value={soundLightEffect} onValueChange={setSoundLightEffect}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select a lighting effect" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white">No lighting effect</SelectItem>
                    {lightEffects.filter(effect => effect.customJson?.loopCount !== 0).map((effect) => (
                      <SelectItem key={effect.id} value={effect.id.toString()} className="text-white">
                        {effect.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Volume</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${soundVolume}%, #374151 ${soundVolume}%, #374151 100%)`
                    }}
                  />
                  <span className="text-white text-sm font-medium min-w-[3ch]">{soundVolume}%</span>
                </div>
              </div>
            </div>



            <div>
              <Label className="text-white">Audio File</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(e, 'sound')}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {soundFile && (
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    {soundFile.name}
                  </Badge>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scene" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Name</Label>
                <Input
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Scene name"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Icon</Label>
                <Select value={sceneIcon} onValueChange={setSceneIcon}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="lightbulb" className="text-white">Lightbulb</SelectItem>
                    <SelectItem value="sun" className="text-white">Sun</SelectItem>
                    <SelectItem value="moon" className="text-white">Moon</SelectItem>
                    <SelectItem value="zap" className="text-white">Lightning</SelectItem>
                    <SelectItem value="rainbow" className="text-white">Rainbow</SelectItem>
                    <SelectItem value="film" className="text-white">Film</SelectItem>
                    <SelectItem value="brain" className="text-white">Focus</SelectItem>
                    <SelectItem value="glass-cheers" className="text-white">Party</SelectItem>
                    <SelectItem value="leaf" className="text-white">Relax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="turnOnIfOff"
                checked={turnOnIfOff}
                onCheckedChange={(checked) => setTurnOnIfOff(checked as boolean)}
                className="border-slate-600"
              />
              <Label htmlFor="turnOnIfOff" className="text-white">
                Turn on light if off
              </Label>
            </div>

            {/* Per-Device Controls */}
            <div>
              <button
                onClick={() => setIsModalDevicesCollapsed(!isModalDevicesCollapsed)}
                className="flex items-center text-white mb-3 hover:text-blue-400 transition-colors"
              >
                <i className={`fas fa-chevron-${isModalDevicesCollapsed ? 'right' : 'down'} mr-2 text-xs`}></i>
                Device-Specific Settings ({adoptedDevices.length} devices)
              </button>
              {!isModalDevicesCollapsed && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {adoptedDevices.map((device) => (
                    <div key={device.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                          <span className="text-white font-medium">{device.label}</span>
                        </div>
                        <Checkbox
                          checked={selectedDevices.includes(device.id.toString())}
                          onCheckedChange={() => handleDeviceToggle(device.id.toString())}
                          className="border-slate-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-400 text-xs">Color</Label>
                          <Input
                            type="color"
                            value={deviceSettings[device.id]?.color || sceneColor}
                            className="w-full h-8 bg-slate-700 border-slate-600 p-0"
                            onChange={(e) => handleDeviceColorChange(device.id.toString(), e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Brightness ({deviceSettings[device.id]?.brightness || sceneBrightness}%)</Label>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={deviceSettings[device.id]?.brightness || sceneBrightness}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            onChange={(e) => handleDeviceBrightnessChange(device.id.toString(), parseInt(e.target.value))}
                            style={{
                              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${deviceSettings[device.id]?.brightness || sceneBrightness}%, #374151 ${deviceSettings[device.id]?.brightness || sceneBrightness}%, #374151 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Fade In Duration (ms)</Label>
                <Input
                  type="number"
                  value={sceneFadeIn}
                  onChange={(e) => setSceneFadeIn(Number(e.target.value))}
                  placeholder="1000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Fade Out Duration (ms)</Label>
                <Input
                  type="number"
                  value={sceneFadeOut}
                  onChange={(e) => setSceneFadeOut(Number(e.target.value))}
                  placeholder="1000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>


          </TabsContent>

          <TabsContent value="lighting" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <button
                onClick={() => setIsDevicesCollapsed(!isDevicesCollapsed)}
                className="flex items-center text-white font-medium mb-3 hover:text-blue-400 transition-colors"
              >
                <i className={`fas fa-chevron-${isDevicesCollapsed ? 'right' : 'down'} mr-2 text-xs`}></i>
                Adopted Devices ({adoptedDevices.length})
              </button>
              {!isDevicesCollapsed && (
                adoptedDevices.length === 0 ? (
                  <p className="text-slate-400 text-sm">No adopted devices available. Please adopt devices first to create lighting effects.</p>
                ) : (
                  <div className="space-y-2">
                    {adoptedDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-600">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                          <span className="text-white font-medium">{device.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                            ID: {device.id}
                          </Badge>
                          {device.isOnline && (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400 text-xs">
                              Online
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-white font-medium mb-3">How to Use Device IDs</h3>
              <div className="text-slate-400 text-sm space-y-2">
                <p>• Reference devices by their ID numbers in custom JSON effects</p>
                <p>• Use the "deviceIds" array in each step to target specific lights</p>
                <p>• Example: "deviceIds": ["1", "2"] targets devices with ID 1 and 2</p>
                <p>• Leave empty to target all adopted devices by default</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Name</Label>
                <Input
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Lighting effect name"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Icon</Label>
                <Select value={sceneIcon} onValueChange={setSceneIcon}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="zap" className="text-white">Lightning</SelectItem>
                    <SelectItem value="sun" className="text-white">Sun</SelectItem>
                    <SelectItem value="moon" className="text-white">Moon</SelectItem>
                    <SelectItem value="lightbulb" className="text-white">Lightbulb</SelectItem>
                    <SelectItem value="rainbow" className="text-white">Rainbow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Loop Effect</Label>
                <Select value={customEffectLoop.toString()} onValueChange={(value) => setCustomEffectLoop(value === 'true')}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="false" className="text-white">No Loop</SelectItem>
                    <SelectItem value="true" className="text-white">Loop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Loop Count</Label>
                <Input
                  type="number"
                  value={customEffectLoopCount}
                  onChange={(e) => setCustomEffectLoopCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                  disabled={!customEffectLoop}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Global Delay (ms)</Label>
                <Input
                  type="number"
                  value={customEffectGlobalDelay}
                  onChange={(e) => setCustomEffectGlobalDelay(parseInt(e.target.value) || 0)}
                  min="0"
                  max="5000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hiddenFromDashboard"
                checked={hiddenFromDashboard}
                onCheckedChange={(checked) => setHiddenFromDashboard(checked as boolean)}
                className="border-slate-600"
              />
              <Label htmlFor="hiddenFromDashboard" className="text-white">
                Hide from dashboard
              </Label>
            </div>

            <div>
              <Label className="text-white">Effect Steps (JSON Array)</Label>
              <Textarea
                value={customEffectJson}
                onChange={(e) => setCustomEffectJson(e.target.value)}
                placeholder="Enter steps array only..."
                className="bg-slate-800 border-slate-700 text-white h-32 font-mono text-sm"
              />
              <div className="mt-2 text-xs text-slate-400">
                <details>
                  <summary className="cursor-pointer hover:text-slate-300">View steps example</summary>
                  <pre className="mt-2 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{JSON.stringify(exampleSteps, null, 2)}
                  </pre>
                </details>
                <p className="mt-2">Only enter the steps array - the name, description, loop settings will be added automatically from the form fields above.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>



        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="border-slate-700 text-slate-400">
            Cancel
          </Button>
          {(editingScene || editingLightingEffect) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={
              (effectType === 'sound' && (!soundName || !soundFile)) ||
              (effectType === 'scene' && (!sceneName || (sceneType === 'custom' && !customEffectJson))) ||
              (effectType === 'lighting' && !sceneName)
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            {effectType === 'lighting' ? 
              (editingLightingEffect ? 'Update Lighting Effect' : 'Add Lighting Effect') : 
              editingScene ? 'Update' : 'Create Effect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}