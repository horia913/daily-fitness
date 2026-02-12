'use client';

import { useState, useEffect, useRef } from 'react';
import { preventBackgroundScroll, restoreBackgroundScroll } from '@/lib/mobile-compatibility';

interface RPEModalProps {
  isOpen: boolean;
  onSelect: (rpe: number) => void;
  onSkip: () => void;
}

/**
 * RPE Modal - Rate of Perceived Exertion
 * 
 * BLOCKING modal that appears after a set is logged (Golden Logging Flow).
 * Cannot be dismissed by tapping outside or pressing back.
 * User MUST select an RPE value (1-10) or tap "Skip for now".
 * The set is already logged optimistically — RPE is included in background sync.
 */

const RPE_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Very Easy', description: 'Could do many more' },
  { value: 2, emoji: '😌', label: 'Easy', description: 'Barely any effort' },
  { value: 3, emoji: '🙂', label: 'Light', description: 'Light effort' },
  { value: 4, emoji: '😊', label: 'Moderate', description: 'Comfortable' },
  { value: 5, emoji: '😐', label: 'Somewhat Hard', description: 'Starting to work' },
  { value: 6, emoji: '😤', label: 'Hard', description: 'Challenging' },
  { value: 7, emoji: '😓', label: 'Very Hard', description: '2-3 reps left' },
  { value: 8, emoji: '😰', label: 'Really Hard', description: '1-2 reps left' },
  { value: 9, emoji: '🥵', label: 'Max Effort', description: '1 rep left' },
  { value: 10, emoji: '🔥', label: 'Failure', description: 'Could not do more' },
];

// Color gradient from green (easy) to red (max)
function getRpeColor(value: number): string {
  if (value <= 3) return 'var(--fc-status-success)';
  if (value <= 5) return 'var(--fc-status-warning)';
  if (value <= 7) return 'var(--fc-domain-workouts)';
  return 'var(--fc-status-error)';
}

export function RPEModal({ isOpen, onSelect, onSkip }: RPEModalProps) {
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset state + scroll lock when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedRpe(null);
      setIsAnimating(true);
      preventBackgroundScroll();
      // Focus trap: focus the grid on open so keyboard nav works
      requestAnimationFrame(() => {
        gridRef.current?.focus();
      });
    } else {
      restoreBackgroundScroll();
    }
    return () => {
      // Safety: always restore on unmount
      restoreBackgroundScroll();
    };
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      /* Blocking modal: no backdrop dismiss, no click-through */
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'color-mix(in srgb, var(--fc-app-bg) 70%, transparent)' }} />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-[320px] sm:max-w-sm 
          fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)]
          shadow-xl
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        onAnimationEnd={() => setIsAnimating(false)}
      >
        {/* Header — no X button: blocking modal, must select or skip */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--fc-surface-card-border)' }}>
          <div>
            <h3 className="text-base font-semibold fc-text-primary">How hard was that?</h3>
            <p className="text-[10px] uppercase tracking-wider fc-text-dim font-bold">Rate of Perceived Exertion</p>
          </div>
        </div>
        
        {/* RPE Grid */}
        <div className="px-3 py-3">
          <div ref={gridRef} tabIndex={-1} className="grid grid-cols-5 gap-1.5 outline-none">
            {RPE_OPTIONS.map((option) => {
              const isSelected = selectedRpe === option.value;
              const color = getRpeColor(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 active:scale-95"
                  style={{
                    background: isSelected
                      ? color
                      : 'var(--fc-surface-sunken)',
                    ...(isSelected ? { boxShadow: `0 0 12px ${color}` } : {}),
                  }}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: isSelected ? 'white' : 'var(--fc-text-primary)' }}
                  >
                    {option.value}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Legend for selected */}
          {selectedRpe && (
            <div className="mt-3 text-center">
              <p className="fc-text-primary font-semibold text-sm">
                {RPE_OPTIONS[selectedRpe - 1].label}
              </p>
              <p className="text-xs fc-text-dim">
                {RPE_OPTIONS[selectedRpe - 1].description}
              </p>
            </div>
          )}
          
          {/* Quick Legend */}
          {!selectedRpe && (
            <div className="mt-3 flex justify-between text-[10px] fc-text-dim px-1 font-mono">
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
            className="w-full py-2 fc-text-dim rounded-xl transition-colors text-xs font-medium"
            style={{ background: 'var(--fc-surface-sunken)' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default RPEModal;
