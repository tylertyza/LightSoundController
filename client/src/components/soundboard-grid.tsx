import { useState } from "react";
import { SoundButton } from "@shared/schema";

interface SoundboardGridProps {
  soundButtons: SoundButton[];
  onSoundButtonClick: (button: SoundButton) => void;
}

export default function SoundboardGrid({ soundButtons, onSoundButtonClick }: SoundboardGridProps) {
  const [activeButtons, setActiveButtons] = useState<Set<number>>(new Set());
  
  const handleButtonClick = (button: SoundButton) => {
    setActiveButtons(prev => new Set(prev).add(button.id));
    onSoundButtonClick(button);
    
    // Remove active state after 2 seconds
    setTimeout(() => {
      setActiveButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(button.id);
        return newSet;
      });
    }, 2000);
  };
  
  const getButtonStyle = (button: SoundButton, isActive: boolean) => {
    const baseStyle = "bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition-all duration-200 cursor-pointer group border border-slate-700";
    const colorMap: { [key: string]: string } = {
      purple: "hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20",
      green: "hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20",
      red: "hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20",
      yellow: "hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20",
      blue: "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20",
      indigo: "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20",
      pink: "hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/20",
      cyan: "hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20",
      lime: "hover:border-lime-500 hover:shadow-lg hover:shadow-lime-500/20",
    };
    
    const activeStyle = isActive ? "scale-105 shadow-lg shadow-blue-500/50" : "";
    const hoverStyle = colorMap[button.color] || "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20";
    
    return `${baseStyle} ${hoverStyle} ${activeStyle}`;
  };
  
  const getIconBackgroundStyle = (button: SoundButton) => {
    const colorMap: { [key: string]: string } = {
      purple: "bg-gradient-to-br from-purple-500 to-pink-600",
      green: "bg-gradient-to-br from-emerald-500 to-teal-600",
      red: "bg-gradient-to-br from-red-500 to-orange-600",
      yellow: "bg-gradient-to-br from-yellow-500 to-orange-600",
      blue: "bg-gradient-to-br from-blue-500 to-indigo-600",
      indigo: "bg-gradient-to-br from-indigo-500 to-purple-600",
      pink: "bg-gradient-to-br from-pink-500 to-rose-600",
      cyan: "bg-gradient-to-br from-cyan-500 to-blue-600",
      lime: "bg-gradient-to-br from-lime-500 to-green-600",
    };
    
    return colorMap[button.color] || "bg-gradient-to-br from-blue-500 to-indigo-600";
  };
  
  const getHoverTextColor = (button: SoundButton) => {
    const colorMap: { [key: string]: string } = {
      purple: "group-hover:text-purple-400",
      green: "group-hover:text-green-400",
      red: "group-hover:text-red-400",
      yellow: "group-hover:text-yellow-400",
      blue: "group-hover:text-blue-400",
      indigo: "group-hover:text-indigo-400",
      pink: "group-hover:text-pink-400",
      cyan: "group-hover:text-cyan-400",
      lime: "group-hover:text-lime-400",
    };
    
    return colorMap[button.color] || "group-hover:text-blue-400";
  };
  
  if (soundButtons.length === 0) {
    return (
      <div className="text-center py-16">
        <i className="fas fa-music text-slate-600 text-6xl mb-4"></i>
        <h3 className="text-lg font-medium text-slate-400 mb-2">No Sound Effects</h3>
        <p className="text-slate-500 text-sm">Click "Add Sound" to create your first sound effect button</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {soundButtons.map((button) => {
        const isActive = activeButtons.has(button.id);
        
        return (
          <div
            key={button.id}
            className={getButtonStyle(button, isActive)}
            onClick={() => handleButtonClick(button)}
          >
            <div className="text-center">
              <div className={`w-12 h-12 ${getIconBackgroundStyle(button)} rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform`}>
                <i className={`fas fa-${button.icon}`}></i>
              </div>
              <h3 className={`text-sm font-semibold text-white ${getHoverTextColor(button)} transition-colors`}>
                {button.name}
              </h3>
              {button.description && (
                <p className="text-xs text-slate-400 mt-1">{button.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
