'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RPEModalProps {
  isOpen: boolean;
  onSelect: (rpe: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

/**
 * RPE Modal - Rate of Perceived Exertion
 * 
 * Non-blocking modal that appears after a set is logged.
 * User can quickly tap an RPE value (1-10) or skip.
 * The set is already logged - this just adds the RPE data.
 */

const RPE_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Very Easy', color: 'bg-green-500', description: 'Could do many more' },
  { value: 2, emoji: '😌', label: 'Easy', color: 'bg-green-400', description: 'Barely any effort' },
  { value: 3, emoji: '🙂', label: 'Light', color: 'bg-lime-400', description: 'Light effort' },
  { value: 4, emoji: '😊', label: 'Moderate', color: 'bg-lime-500', description: 'Comfortable' },
  { value: 5, emoji: '😐', label: 'Somewhat Hard', color: 'bg-yellow-400', description: 'Starting to work' },
  { value: 6, emoji: '😤', label: 'Hard', color: 'bg-yellow-500', description: 'Challenging' },
  { value: 7, emoji: '😓', label: 'Very Hard', color: 'bg-orange-400', description: '2-3 reps left' },
  { value: 8, emoji: '😰', label: 'Really Hard', color: 'bg-orange-500', description: '1-2 reps left' },
  { value: 9, emoji: '🥵', label: 'Max Effort', color: 'bg-red-500', description: '1 rep left' },
  { value: 10, emoji: '🔥', label: 'Failure', color: 'bg-red-600', description: 'Could not do more' },
];

export function RPEModal({ isOpen, onSelect, onSkip, onClose }: RPEModalProps) {
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRpe(null);
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Handle RPE selection with quick animation
  const handleSelect = (rpe: number) => {
    setSelectedRpe(rpe);
    
    // Brief visual feedback then submit
    setTimeout(() => {
      onSelect(rpe);
    }, 150);
  };

  // Handle skip
  const handleSkip = () => {
    onSkip();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
      
      {/* Modal - Centered on all screens, light/dark mode support */}
      <div 
        className={`relative w-full max-w-[320px] sm:max-w-sm 
          bg-white dark:bg-slate-900 
          rounded-2xl border border-slate-200 dark:border-slate-700 
          shadow-xl dark:shadow-none
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onAnimationEnd={() => setIsAnimating(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">How hard was that set?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Rate your perceived exertion</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* RPE Grid */}
        <div className="px-3 py-3">
          <div className="grid grid-cols-5 gap-1.5">
            {RPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-lg 
                  transition-all duration-150 active:scale-95
                  ${selectedRpe === option.value 
                    ? `${option.color} ring-2 ring-white dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-slate-900` 
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <span className="text-xl">{option.emoji}</span>
                <span className={`text-sm font-bold ${selectedRpe === option.value ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                  {option.value}
                </span>
              </button>
            ))}
          </div>
          
          {/* Legend for selected */}
          {selectedRpe && (
            <div className="mt-3 text-center animate-fade-in">
              <p className="text-slate-900 dark:text-white font-medium text-sm">
                {RPE_OPTIONS[selectedRpe - 1].label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {RPE_OPTIONS[selectedRpe - 1].description}
              </p>
            </div>
          )}
          
          {/* Quick Legend */}
          {!selectedRpe && (
            <div className="mt-3 flex justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
              <span>1-4: Easy</span>
              <span>5-6: Mod</span>
              <span>7-8: Hard</span>
              <span>9-10: Max</span>
            </div>
          )}
        </div>
        
        {/* Skip Button */}
        <div className="px-3 pb-4 pt-1">
          <button
            onClick={handleSkip}
            className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default RPEModal;
