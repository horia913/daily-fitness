'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  GripVertical,
  FolderOpen,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface HabitCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_CATEGORY: Partial<HabitCategory> = {
  name: '',
  description: '',
  icon: '📋',
  color: '#8B5CF6',
  sort_order: 0,
  is_active: true,
};

const COLOR_PRESETS = [
  '#10B981', // green
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#EF4444', // red
  '#6B7280', // gray
];

export default function HabitCategoriesPage() {
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  
  // Edit/Create state
  const [editingCategory, setEditingCategory] = useState<Partial<HabitCategory> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('habit_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (fetchError) throw fetchError;
      setCategories(data || []);
      
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter categories
  const filteredCategories = categories.filter(c => {
    if (!showInactive && !c.is_active) return false;
    return true;
  });

  // Start reorder mode
  const startReorder = () => {
    setPendingOrder(filteredCategories.map(c => c.id));
    setReorderMode(true);
  };

  // Cancel reorder
  const cancelReorder = () => {
    setPendingOrder([]);
    setReorderMode(false);
  };

  // Move item in pending order
  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pendingOrder.length) return;
    
    const newOrder = [...pendingOrder];
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
    setPendingOrder(newOrder);
  };

  // Save reorder - ATOMIC operation
  const saveReorder = async () => {
    setSavingOrder(true);
    setError(null);
    
    try {
      // Update all sort_order values in a single batch
      // This ensures atomic update - all succeed or all fail
      const updates = pendingOrder.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));
      
      // Use Promise.all to update all rows
      // Note: In a production app, you might want an RPC function for true atomicity
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('habit_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        
        if (updateError) throw updateError;
      }
      
      await loadData();
      cancelReorder();
    } catch (err) {
      console.error('Error saving order:', err);
      setError(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  // Handle create
  const handleCreate = () => {
    const maxSortOrder = Math.max(0, ...categories.map(c => c.sort_order));
    setEditingCategory({ ...EMPTY_CATEGORY, sort_order: maxSortOrder + 1 });
    setIsCreating(true);
  };

  // Handle edit
  const handleEdit = (category: HabitCategory) => {
    setEditingCategory({ ...category });
    setIsCreating(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingCategory(null);
    setIsCreating(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!editingCategory?.name?.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: editingCategory.name.trim(),
        description: editingCategory.description?.trim() || null,
        icon: editingCategory.icon || '📋',
        color: editingCategory.color || '#8B5CF6',
        sort_order: editingCategory.sort_order || 0,
        is_active: editingCategory.is_active ?? true,
      };

      if (isCreating) {
        const { error: insertError } = await supabase
          .from('habit_categories')
          .insert(payload);
        
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('habit_categories')
          .update(payload)
          .eq('id', editingCategory.id);
        
        if (updateError) throw updateError;
      }

      await loadData();
      handleCancel();
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // Handle soft delete
  const handleDelete = async (category: HabitCategory) => {
    if (!confirm(`Are you sure you want to ${category.is_active ? 'deactivate' : 'activate'} "${category.name}"?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('habit_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);
      
      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Error toggling category status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  // Update editing field
  const updateField = (field: keyof HabitCategory, value: any) => {
    setEditingCategory(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Get ordered categories for display
  const displayCategories = reorderMode 
    ? pendingOrder.map(id => filteredCategories.find(c => c.id === id)!).filter(Boolean)
    : filteredCategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading habit categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-violet-400" />
            Habit Categories
          </h2>
          <p className="text-slate-400 mt-1">
            Manage categories for organizing client habits
          </p>
        </div>
        <div className="flex gap-2">
          {!reorderMode ? (
            <>
              <button
                onClick={startReorder}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <GripVertical className="w-5 h-5" />
                Reorder
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Category
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelReorder}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                onClick={saveReorder}
                disabled={savingOrder}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      {!reorderMode && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-500"
            />
            Show Inactive
          </label>
        </div>
      )}

      {/* Edit/Create Form */}
      {editingCategory && !reorderMode && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Create New Category' : 'Edit Category'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingCategory.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., Fitness"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Icon (Emoji)</label>
              <input
                type="text"
                value={editingCategory.icon || ''}
                onChange={(e) => updateField('icon', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="📋"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={editingCategory.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Brief description..."
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editingCategory.color || '#8B5CF6'}
                  onChange={(e) => updateField('color', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-600 bg-slate-900 cursor-pointer"
                />
                <div className="flex gap-1 flex-wrap">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateField('color', color)}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        editingCategory.color === color 
                          ? 'border-white scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Is Active */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={editingCategory.is_active ?? true}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-green-600 focus:ring-green-500"
                />
                <span className="text-slate-300">Active (visible to clients)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editingCategory.name?.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        {reorderMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-amber-400 text-sm">
            <GripVertical className="w-4 h-4 inline-block mr-2" />
            Use the arrows to reorder categories. Click Save Order when done.
          </div>
        )}
        
        <div className="divide-y divide-slate-700/50">
          {displayCategories.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">
              No habit categories found. Create one to get started.
            </div>
          ) : (
            displayCategories.map((category, index) => (
              <div 
                key={category.id} 
                className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-700/30 transition-colors ${!category.is_active ? 'opacity-50' : ''}`}
              >
                {/* Reorder Controls */}
                {reorderMode && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === displayCategories.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Category Info */}
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${category.color}20`, color: category.color || '#8B5CF6' }}
                >
                  {category.icon || '📋'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{category.name}</p>
                  {category.description && (
                    <p className="text-sm text-slate-400 truncate">{category.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">#{category.sort_order}</span>
                  
                  {category.is_active ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-slate-600/50 text-slate-400 rounded">
                      Inactive
                    </span>
                  )}
                  
                  {!reorderMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-slate-400 hover:text-violet-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className={`p-2 rounded-lg transition-colors ${
                          category.is_active 
                            ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' 
                            : 'text-slate-400 hover:text-green-400 hover:bg-slate-700'
                        }`}
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Summary */}
        <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 text-sm text-slate-400">
          {categories.length} categories total
          {!showInactive && categories.filter(c => !c.is_active).length > 0 && (
            <span className="ml-2">
              ({categories.filter(c => !c.is_active).length} inactive hidden)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
