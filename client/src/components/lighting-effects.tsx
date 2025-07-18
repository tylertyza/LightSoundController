import { useState } from "react";
import { Plus, Lightbulb, FileText, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";


interface LightingEffect {
  id: string;
  name: string;
  description?: string;
  isPreset: boolean;
  json: any;
}

interface LightingEffectsProps {
  onEffectSelect?: (effect: LightingEffect) => void;
}

const presetEffects: LightingEffect[] = [
  {
    id: "breathe",
    name: "Breathe",
    description: "Gentle breathing effect",
    isPreset: true,
    json: {
      name: "Breathe",
      steps: [
        { brightness: 20, color: "#4F46E5", duration: 2000, easing: "ease-in-out" },
        { brightness: 80, color: "#4F46E5", duration: 2000, easing: "ease-in-out" }
      ],
      loop: true
    }
  },
  {
    id: "pulse",
    name: "Pulse",
    description: "Quick pulse effect",
    isPreset: true,
    json: {
      name: "Pulse",
      steps: [
        { brightness: 10, color: "#EF4444", duration: 300, easing: "ease-out" },
        { brightness: 100, color: "#EF4444", duration: 300, easing: "ease-in" }
      ],
      loop: true
    }
  },
  {
    id: "strobe",
    name: "Strobe",
    description: "Fast strobe effect",
    isPreset: true,
    json: {
      name: "Strobe",
      steps: [
        { brightness: 0, color: "#FFFFFF", duration: 100, easing: "linear" },
        { brightness: 100, color: "#FFFFFF", duration: 100, easing: "linear" }
      ],
      loop: true
    }
  },
  {
    id: "fade",
    name: "Fade",
    description: "Smooth fade effect",
    isPreset: true,
    json: {
      name: "Fade",
      steps: [
        { brightness: 100, color: "#F59E0B", duration: 3000, easing: "ease-in-out" },
        { brightness: 0, color: "#F59E0B", duration: 3000, easing: "ease-in-out" }
      ],
      loop: true
    }
  },
  {
    id: "cycle",
    name: "Color Cycle",
    description: "Rainbow color cycle",
    isPreset: true,
    json: {
      name: "Color Cycle",
      steps: [
        { brightness: 80, color: "#EF4444", duration: 1000, easing: "ease-in-out" },
        { brightness: 80, color: "#F59E0B", duration: 1000, easing: "ease-in-out" },
        { brightness: 80, color: "#10B981", duration: 1000, easing: "ease-in-out" },
        { brightness: 80, color: "#3B82F6", duration: 1000, easing: "ease-in-out" },
        { brightness: 80, color: "#8B5CF6", duration: 1000, easing: "ease-in-out" },
        { brightness: 80, color: "#EC4899", duration: 1000, easing: "ease-in-out" }
      ],
      loop: true
    }
  }
];

export default function LightingEffects({ onEffectSelect }: LightingEffectsProps) {
  const [customEffects, setCustomEffects] = useState<LightingEffect[]>([]);
  const [isAddEffectOpen, setIsAddEffectOpen] = useState(false);
  const [newEffectName, setNewEffectName] = useState("");
  const [newEffectDescription, setNewEffectDescription] = useState("");
  const [newEffectJson, setNewEffectJson] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const allEffects = [...presetEffects, ...customEffects];

  const exampleJson = {
    name: "Custom Effect",
    steps: [
      { brightness: 50, color: "#FF6B6B", duration: 1000, easing: "ease-in-out" },
      { brightness: 100, color: "#4ECDC4", duration: 1000, easing: "ease-in-out" }
    ],
    loop: true
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonContent = JSON.parse(e.target?.result as string);
          setNewEffectJson(JSON.stringify(jsonContent, null, 2));
        } catch (error) {
          console.error('Invalid JSON file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveCustomEffect = () => {
    if (!newEffectName || !newEffectJson) return;

    try {
      const parsedJson = JSON.parse(newEffectJson);
      const newEffect: LightingEffect = {
        id: `custom-${Date.now()}`,
        name: newEffectName,
        description: newEffectDescription,
        isPreset: false,
        json: parsedJson
      };

      setCustomEffects(prev => [...prev, newEffect]);
      setNewEffectName("");
      setNewEffectDescription("");
      setNewEffectJson("");
      setSelectedFile(null);
      setIsAddEffectOpen(false);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleDeleteCustomEffect = (id: string) => {
    setCustomEffects(prev => prev.filter(effect => effect.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Lighting Effects</h3>
        <Dialog open={isAddEffectOpen} onOpenChange={setIsAddEffectOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Effect
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Add Custom Lighting Effect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Name</Label>
                  <Input
                    value={newEffectName}
                    onChange={(e) => setNewEffectName(e.target.value)}
                    placeholder="Effect name"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Upload JSON File</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-white">Description</Label>
                <Input
                  value={newEffectDescription}
                  onChange={(e) => setNewEffectDescription(e.target.value)}
                  placeholder="Optional description"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Effect JSON</Label>
                <Textarea
                  value={newEffectJson}
                  onChange={(e) => setNewEffectJson(e.target.value)}
                  placeholder="Paste or edit your custom lighting effect JSON here..."
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  rows={8}
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
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddEffectOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCustomEffect}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Effect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="h-[400px] w-full rounded-md border border-slate-700 bg-slate-800 p-4 overflow-y-auto">
        <div className="space-y-2">
          {allEffects.map((effect) => (
            <Card 
              key={effect.id} 
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 cursor-pointer transition-colors"
              onClick={() => onEffectSelect?.(effect)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <CardTitle className="text-white text-sm">{effect.name}</CardTitle>
                    {effect.isPreset && (
                      <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                        Preset
                      </Badge>
                    )}
                  </div>
                  {!effect.isPreset && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomEffect(effect.id);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {effect.description && (
                <CardContent className="pt-0">
                  <CardDescription className="text-slate-400 text-xs">
                    {effect.description}
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}