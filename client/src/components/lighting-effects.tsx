import { useState } from "react";
import { Plus, Lightbulb, FileText, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Device } from "@shared/schema";


interface LightingEffectsProps {}



export default function LightingEffects() {
  const queryClient = useQueryClient();
  const [isAddEffectOpen, setIsAddEffectOpen] = useState(false);
  const [isEditEffectOpen, setIsEditEffectOpen] = useState(false);
  const [editingEffect, setEditingEffect] = useState<any>(null);
  const [newEffectName, setNewEffectName] = useState("");
  const [newEffectDescription, setNewEffectDescription] = useState("");
  const [newEffectJson, setNewEffectJson] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch lighting effects from the database
  const { data: lightEffects = [], isLoading } = useQuery({
    queryKey: ['/api/light-effects'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/light-effects');
      return response.json();
    },
  });

  // Apply effect mutation
  const applyEffectMutation = useMutation({
    mutationFn: async ({ effectId, loopCount = 1 }: { effectId: number; loopCount?: number }) => {
      const response = await apiRequest('POST', `/api/light-effects/${effectId}/apply`, { loopCount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });

  // Stop effect mutation
  const stopEffectMutation = useMutation({
    mutationFn: async (effectId: number) => {
      const response = await apiRequest('POST', `/api/light-effects/${effectId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });

  // Delete effect mutation
  const deleteEffectMutation = useMutation({
    mutationFn: async (effectId: number) => {
      const response = await apiRequest('DELETE', `/api/light-effects/${effectId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/light-effects'] });
    },
  });

  // Create effect mutation
  const createEffectMutation = useMutation({
    mutationFn: async (effectData: any) => {
      const response = await apiRequest('POST', '/api/light-effects', effectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/light-effects'] });
      setIsAddEffectOpen(false);
      resetForm();
    },
  });

  // Update effect mutation
  const updateEffectMutation = useMutation({
    mutationFn: async ({ effectId, effectData }: { effectId: number; effectData: any }) => {
      const response = await apiRequest('PUT', `/api/light-effects/${effectId}`, effectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/light-effects'] });
      setIsEditEffectOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setNewEffectName("");
    setNewEffectDescription("");
    setNewEffectJson("");
    setSelectedFile(null);
    setEditingEffect(null);
  };

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
      const effectData = {
        name: newEffectName,
        description: newEffectDescription,
        type: "custom",
        duration: parsedJson.duration || 1000,
        customJson: parsedJson
      };

      createEffectMutation.mutate(effectData);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleDeleteCustomEffect = (id: number) => {
    deleteEffectMutation.mutate(id);
  };

  const handleEditEffect = (effect: any) => {
    setEditingEffect(effect);
    setNewEffectName(effect.name);
    setNewEffectDescription(effect.description || "");
    setNewEffectJson(JSON.stringify(effect.customJson || {}, null, 2));
    setIsEditEffectOpen(true);
  };

  const handleSaveEditedEffect = () => {
    if (!editingEffect || !newEffectName || !newEffectJson) return;

    try {
      const parsedJson = JSON.parse(newEffectJson);
      const effectData = {
        name: newEffectName,
        description: newEffectDescription,
        type: "custom",
        duration: parsedJson.duration || 1000,
        customJson: parsedJson
      };

      updateEffectMutation.mutate({ effectId: editingEffect.id, effectData });
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
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

        <Dialog open={isEditEffectOpen} onOpenChange={setIsEditEffectOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                Edit {editingEffect?.isPreset ? 'Preset' : 'Custom'} Effect
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Name</Label>
                  <Input
                    value={newEffectName}
                    onChange={(e) => setNewEffectName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Description</Label>
                  <Input
                    value={newEffectDescription}
                    onChange={(e) => setNewEffectDescription(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Effect JSON</Label>
                <Textarea
                  value={newEffectJson}
                  onChange={(e) => setNewEffectJson(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  rows={10}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditEffectOpen(false)}
                  className="border-slate-700 text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditedEffect}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="h-[400px] w-full rounded-md border border-slate-700 bg-slate-800 p-4 overflow-y-auto">
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-20">
              <div className="text-slate-400">Loading effects...</div>
            </div>
          ) : lightEffects.length === 0 ? (
            <div className="flex justify-center items-center h-20">
              <div className="text-slate-400">No lighting effects found</div>
            </div>
          ) : (
            lightEffects.map((effect: any) => (
              <Card 
                key={effect.id} 
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 cursor-pointer transition-colors"
                onClick={() => applyEffectMutation.mutate({ effectId: effect.id })}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <CardTitle className="text-white text-sm">{effect.name}</CardTitle>
                      {effect.customJson && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEffect(effect);
                        }}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
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
                    </div>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}