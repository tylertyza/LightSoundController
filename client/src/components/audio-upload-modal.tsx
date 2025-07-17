import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function AudioUploadModal({ isOpen, onClose, onSave }: AudioUploadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    lightEffect: 'flash',
    color: 'blue',
    icon: 'bolt',
    audioFile: null as File | null,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/sound-buttons', {
        method: 'POST',
        body: data,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload sound button');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sound button created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sound-buttons'] });
      handleClose();
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create sound button",
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, audioFile: file }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.audioFile) {
      toast({
        title: "Error",
        description: "Please select an audio file",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a button name",
        variant: "destructive",
      });
      return;
    }
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('lightEffect', formData.lightEffect);
    data.append('color', formData.color);
    data.append('icon', formData.icon);
    data.append('audioFile', formData.audioFile);
    
    uploadMutation.mutate(data);
  };
  
  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      lightEffect: 'flash',
      color: 'blue',
      icon: 'bolt',
      audioFile: null,
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add Sound Effect</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-300">Button Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter button name"
              className="bg-slate-900 border-slate-600 text-white placeholder-slate-400"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description" className="text-slate-300">Description (optional)</Label>
            <Input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter description"
              className="bg-slate-900 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <Label htmlFor="audioFile" className="text-slate-300">Audio File</Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="bg-slate-900 border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="lightEffect" className="text-slate-300">Light Effect</Label>
            <Select value={formData.lightEffect} onValueChange={(value) => handleInputChange('lightEffect', value)}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600">
                <SelectItem value="flash">Flash</SelectItem>
                <SelectItem value="strobe">Strobe</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="cycle">Color Cycle</SelectItem>
                <SelectItem value="breathe">Breathe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="color" className="text-slate-300">Button Color</Label>
            <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600">
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="indigo">Indigo</SelectItem>
                <SelectItem value="pink">Pink</SelectItem>
                <SelectItem value="cyan">Cyan</SelectItem>
                <SelectItem value="lime">Lime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="icon" className="text-slate-300">Icon</Label>
            <Select value={formData.icon} onValueChange={(value) => handleInputChange('icon', value)}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600">
                <SelectItem value="bolt">Lightning</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="fire">Fire</SelectItem>
                <SelectItem value="bell">Bell</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="heart">Heart</SelectItem>
                <SelectItem value="snowflake">Snowflake</SelectItem>
                <SelectItem value="leaf">Leaf</SelectItem>
                <SelectItem value="star">Star</SelectItem>
                <SelectItem value="music">Music</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="bg-slate-600 hover:bg-slate-700 border-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
