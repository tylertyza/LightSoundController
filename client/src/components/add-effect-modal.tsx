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
import { Device, InsertSoundButton, InsertScene, Scene, customLightingEffectSchema } from "@shared/schema";
import LightingEffects from "./lighting-effects";

interface AddEffectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSound: (data: InsertSoundButton & { audioFile: File }) => void;
  onSaveScene: (data: InsertScene) => void;
  devices: Device[];
  editingScene?: Scene | null;
}

export function AddEffectModal({ isOpen, onClose, onSaveSound, onSaveScene, devices, editingScene }: AddEffectModalProps) {
  const [effectType, setEffectType] = useState<'sound' | 'scene' | 'lighting'>('sound');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  
  // Sound effect form
  const [soundName, setSoundName] = useState('');
  const [soundDescription, setSoundDescription] = useState('');
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundColor, setSoundColor] = useState('#3b82f6');
  const [soundIcon, setSoundIcon] = useState('volume-2');
  const [soundLightEffect, setSoundLightEffect] = useState('flash');
  
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

  // Initialize form with editing scene data
  useEffect(() => {
    if (editingScene) {
      setEffectType('scene');
      setSceneName(editingScene.name);
      setSceneDescription(editingScene.description || '');
      setSceneIcon(editingScene.icon);
      setSelectedDevices(editingScene.targetDevices || []);
      
      // Parse scene configuration
      const config = editingScene.configuration;
      if (config) {
        setSceneColor(config.color || '#ffffff');
        setSceneBrightness(config.brightness || 80);
        setSceneFadeIn(config.fadeIn || 1000);
        setSceneFadeOut(config.fadeOut || 1000);
      }
    }
  }, [editingScene]);

  const adoptedDevices = devices.filter(device => device.isAdopted);

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSubmit = () => {
    if (effectType === 'sound') {
      if (!soundName || !soundFile) return;
      
      // Check if sound effect uses custom JSON
      let customJson = null;
      let lightEffect = soundLightEffect;
      
      if (soundLightEffect === 'custom') {
        if (!customEffectJson) return;
        try {
          const parsedJson = JSON.parse(customEffectJson);
          const validated = customLightingEffectSchema.parse(parsedJson);
          customJson = validated;
        } catch (error) {
          console.error('Invalid custom JSON:', error);
          return;
        }
      }
      
      onSaveSound({
        name: soundName,
        description: soundDescription || undefined,
        audioFile: soundFile,
        lightEffect: lightEffect,
        color: soundColor,
        icon: soundIcon,
        targetDevices: selectedDevices,
        customJson,
      });
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
        colors: [sceneColor],
        icon: sceneIcon,
        targetDevices: selectedDevices,
        customJson: null,
      });
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

  const exampleJson = {
    name: "Rainbow Wave",
    description: "A wave of colors across lights",
    loop: true,
    loopCount: 3,
    globalDelay: 0,
    steps: [
      {
        brightness: 100,
        color: "#ff0000",
        duration: 1000,
        easing: { type: "ease-in-out", duration: 200 },
        deviceIds: ["device1", "device2"]
      },
      {
        brightness: 80,
        color: "#00ff00",
        duration: 1000,
        easing: { type: "ease-in-out", duration: 200 },
        deviceIds: ["device1", "device2"]
      },
      {
        brightness: 60,
        color: "#0000ff",
        duration: 1000,
        easing: { type: "ease-in-out", duration: 200 },
        deviceIds: ["device1", "device2"]
      }
    ]
  };

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
              <TabsTrigger value="sound" className="data-[state=active]:bg-slate-700 text-white">
                <Volume2 className="w-4 h-4 mr-2" />
                Sound Effect
              </TabsTrigger>
              <TabsTrigger value="scene" className="data-[state=active]:bg-slate-700 text-white">
                <Lightbulb className="w-4 h-4 mr-2" />
                Lighting Scene
              </TabsTrigger>
              <TabsTrigger value="lighting" className="data-[state=active]:bg-slate-700 text-white">
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

            <div>
              <Label className="text-white">Lighting Effect</Label>
              <Select value={soundLightEffect} onValueChange={setSoundLightEffect}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select a lighting effect" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="flash" className="text-white">Flash</SelectItem>
                  <SelectItem value="pulse" className="text-white">Pulse</SelectItem>
                  <SelectItem value="strobe" className="text-white">Strobe</SelectItem>
                  <SelectItem value="fade" className="text-white">Fade</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Per-Device Controls */}
            <div>
              <Label className="text-white mb-3 block">Device-Specific Settings</Label>
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
                          defaultValue={sceneColor}
                          className="w-full h-8 bg-slate-700 border-slate-600 p-0"
                          onChange={(e) => {
                            // Handle device-specific color changes
                            console.log(`Device ${device.label} color:`, e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Brightness</Label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          defaultValue={sceneBrightness}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          onChange={(e) => {
                            // Handle device-specific brightness changes
                            console.log(`Device ${device.label} brightness:`, e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

            <div className="space-y-4">
              <Label className="text-white">Device-Specific Colors</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {adoptedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                      <span className="text-white text-sm">{device.name || `Device ${device.id}`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        defaultValue={sceneColor}
                        className="w-10 h-8 bg-slate-800 border-slate-700 p-0"
                        onChange={(e) => {
                          // Handle device-specific color changes
                          console.log(`Device ${device.id} color:`, e.target.value);
                        }}
                      />
                      <Checkbox
                        checked={selectedDevices.includes(device.id.toString())}
                        onCheckedChange={() => handleDeviceToggle(device.id.toString())}
                        className="border-slate-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lighting" className="space-y-4">
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

            <div>
              <Label className="text-white">Custom JSON Effect</Label>
              <Textarea
                value={customEffectJson}
                onChange={(e) => setCustomEffectJson(e.target.value)}
                placeholder="Enter custom JSON effect..."
                className="bg-slate-800 border-slate-700 text-white h-32 font-mono text-sm"
              />
              <div className="mt-2 text-xs text-slate-400">
                <details>
                  <summary className="cursor-pointer hover:text-slate-300">View JSON example</summary>
                  <pre className="mt-2 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{JSON.stringify(exampleJson, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Device Selection - Only show for sound and scene tabs */}
        {effectType !== 'lighting' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white">Target Devices</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDevices(adoptedDevices.map(d => d.id.toString()))}
                className="text-slate-400 border-slate-700 hover:bg-slate-800"
              >
                Select All
              </Button>
            </div>
            
            {adoptedDevices.length === 0 ? (
              <p className="text-slate-400 text-sm">No adopted devices available. Please adopt devices first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {adoptedDevices.map((device) => (
                  <div key={device.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`device-${device.id}`}
                      checked={selectedDevices.includes(device.id.toString())}
                      onCheckedChange={() => handleDeviceToggle(device.id.toString())}
                    />
                    <Label
                      htmlFor={`device-${device.id}`}
                      className="text-slate-300 text-sm cursor-pointer"
                    >
                      {device.label}
                    </Label>
                    {device.isOnline && (
                      <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                        Online
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="border-slate-700 text-slate-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (effectType === 'sound' && (!soundName || !soundFile)) ||
              (effectType === 'scene' && (!sceneName || (sceneType === 'custom' && !customEffectJson))) ||
              (effectType === 'lighting')
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            {effectType === 'lighting' ? 'Manage Effects' : editingScene ? 'Update Scene' : 'Create Effect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}