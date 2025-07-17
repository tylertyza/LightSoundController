import { useState } from "react";
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
import { Device, InsertSoundButton, InsertScene, customLightingEffectSchema } from "@shared/schema";

interface AddEffectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSound: (data: InsertSoundButton & { audioFile: File }) => void;
  onSaveScene: (data: InsertScene) => void;
  devices: Device[];
}

export function AddEffectModal({ isOpen, onClose, onSaveSound, onSaveScene, devices }: AddEffectModalProps) {
  const [effectType, setEffectType] = useState<'sound' | 'scene'>('sound');
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
      
      onSaveSound({
        name: soundName,
        description: soundDescription || undefined,
        audioFile: soundFile,
        lightEffect: soundLightEffect,
        color: soundColor,
        icon: soundIcon,
        targetDevices: selectedDevices,
      });
    } else {
      if (!sceneName) return;
      
      let configuration: any = {};
      let customJson = null;
      
      if (sceneType === 'custom') {
        try {
          const parsedJson = JSON.parse(customEffectJson);
          const validated = customLightingEffectSchema.parse(parsedJson);
          customJson = validated;
          configuration = { type: 'custom' };
        } catch (error) {
          console.error('Invalid custom JSON:', error);
          return;
        }
      } else {
        configuration = {
          type: 'preset',
          effect: presetEffect,
          brightness: sceneBrightness,
          color: sceneColor,
          temperature: sceneTemperature,
        };
      }
      
      onSaveScene({
        name: sceneName,
        description: sceneDescription || undefined,
        configuration,
        colors: [sceneColor],
        icon: sceneIcon,
        targetDevices: selectedDevices,
        customJson,
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
          <DialogTitle className="text-white">Add New Effect</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new sound effect or lighting scene with device targeting
          </DialogDescription>
        </DialogHeader>

        <Tabs value={effectType} onValueChange={(value) => setEffectType(value as 'sound' | 'scene')}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="sound" className="data-[state=active]:bg-slate-700">
              <Volume2 className="w-4 h-4 mr-2" />
              Sound Effect
            </TabsTrigger>
            <TabsTrigger value="scene" className="data-[state=active]:bg-slate-700">
              <Lightbulb className="w-4 h-4 mr-2" />
              Lighting Scene
            </TabsTrigger>
          </TabsList>

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
                    <SelectItem value="volume-2">Volume</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="zap">Zap</SelectItem>
                    <SelectItem value="bell">Bell</SelectItem>
                    <SelectItem value="megaphone">Megaphone</SelectItem>
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
                <Label className="text-white">Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={soundColor}
                    onChange={(e) => setSoundColor(e.target.value)}
                    className="w-16 h-10 bg-slate-800 border-slate-700"
                  />
                  <Input
                    value={soundColor}
                    onChange={(e) => setSoundColor(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Light Effect</Label>
                <Select value={soundLightEffect} onValueChange={setSoundLightEffect}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="flash">Flash</SelectItem>
                    <SelectItem value="strobe">Strobe</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="breathe">Breathe</SelectItem>
                    <SelectItem value="cycle">Color Cycle</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="lightbulb">Lightbulb</SelectItem>
                    <SelectItem value="sun">Sun</SelectItem>
                    <SelectItem value="moon">Moon</SelectItem>
                    <SelectItem value="zap">Lightning</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="brain">Focus</SelectItem>
                    <SelectItem value="glass-cheers">Party</SelectItem>
                    <SelectItem value="leaf">Relax</SelectItem>
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

            <div className="space-y-4">
              <Label className="text-white">Effect Type</Label>
              <Tabs value={sceneType} onValueChange={(value) => setSceneType(value as 'preset' | 'custom')}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                  <TabsTrigger value="preset">Preset Effects</TabsTrigger>
                  <TabsTrigger value="custom">Custom JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="preset" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Preset Effect</Label>
                      <Select value={presetEffect} onValueChange={setPresetEffect}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="breathe">Breathe</SelectItem>
                          <SelectItem value="pulse">Pulse</SelectItem>
                          <SelectItem value="strobe">Strobe</SelectItem>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="cycle">Color Cycle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white">Brightness ({sceneBrightness}%)</Label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={sceneBrightness}
                        onChange={(e) => setSceneBrightness(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={sceneColor}
                          onChange={(e) => setSceneColor(e.target.value)}
                          className="w-16 h-10 bg-slate-800 border-slate-700"
                        />
                        <Input
                          value={sceneColor}
                          onChange={(e) => setSceneColor(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-white">Temperature ({sceneTemperature}K)</Label>
                      <input
                        type="range"
                        min="2500"
                        max="9000"
                        step="100"
                        value={sceneTemperature}
                        onChange={(e) => setSceneTemperature(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <Label className="text-white">Upload JSON File</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileUpload(e, 'custom')}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      {customEffectFile && (
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          {customEffectFile.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-white">Custom Effect JSON</Label>
                    <Textarea
                      value={customEffectJson}
                      onChange={(e) => setCustomEffectJson(e.target.value)}
                      placeholder="Paste your custom lighting effect JSON here..."
                      className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                      rows={10}
                    />
                  </div>
                  
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Example JSON Structure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-slate-300 text-xs overflow-x-auto">
                        {JSON.stringify(exampleJson, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        {/* Device Selection */}
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="border-slate-700 text-slate-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (effectType === 'sound' && (!soundName || !soundFile)) ||
              (effectType === 'scene' && (!sceneName || (sceneType === 'custom' && !customEffectJson)))
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Create Effect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}