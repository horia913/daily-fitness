"use client";

import React, { useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type FoodLogEntry as FoodLogEntryType, updateEntry } from "@/lib/foodLogService";

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
  onDelete: () => void;
}

export function FoodLogEntry({ entry, onDelete }: FoodLogEntryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(entry.quantity);
  const [saving, setSaving] = useState(false);
  
  const foodName = entry.food?.name || 'Unknown Food';
  const brand = entry.food?.brand;
  
  const handleSave = async () => {
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    
    try {
      setSaving(true);
      await updateEntry(entry.id, quantity, entry.client_id, entry.log_date);
      setIsEditing(false);
      // Trigger parent refresh
      window.dispatchEvent(new CustomEvent('foodEntryUpdated'));
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    setQuantity(entry.quantity);
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
      <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3 space-y-3">
        <div>
          <div className="text-sm font-semibold fc-text-primary">{foodName}</div>
          {brand && <div className="text-xs fc-text-dim">{brand}</div>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            step="0.1"
            min="0.1"
            className="flex-1 fc-glass rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm font-mono fc-text-primary bg-transparent"
            autoFocus
          />
          <span className="text-sm fc-text-dim">{entry.unit}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="flex-1"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="fc-primary"
            size="sm"
            onClick={handleSave}
            className="flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3 flex items-center justify-between gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold fc-text-primary truncate">{foodName}</div>
        {brand && <div className="text-xs fc-text-dim truncate">{brand}</div>}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono fc-text-dim">
            {entry.quantity} {entry.unit}
          </span>
          <span className="text-xs fc-text-dim">•</span>
          <span className="text-xs fc-text-dim">
            {Math.round(entry.calories)} cal
          </span>
          <span className="text-xs fc-text-dim">•</span>
          <span className="text-xs fc-text-dim">
            {Math.round(entry.protein_g)}P / {Math.round(entry.carbs_g)}C / {Math.round(entry.fat_g)}F
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-red-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
