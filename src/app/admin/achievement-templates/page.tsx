'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Search,
  ChevronDown,
  Trophy,
  Medal,
  Zap,
  AlertCircle
} from 'lucide-react';

interface AchievementTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  achievement_type: string;
  is_tiered: boolean;
  tier_bronze_threshold: number | null;
  tier_bronze_label: string | null;
  tier_silver_threshold: number | null;
  tier_silver_label: string | null;
  tier_gold_threshold: number | null;
  tier_gold_label: string | null;
  tier_platinum_threshold: number | null;
  tier_platinum_label: string | null;
  single_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TrackingSource {
  id: string;
  source_key: string;
  display_name: string;
  category: string;
  unit: string;
}

const CATEGORIES = [
  'workout',
  'strength',
  'consistency',
  'program',
  'nutrition',
  'wellness',
  'social',
  'milestone'
];

const ACHIEVEMENT_TYPES = [
  'workout_count',
  'streak',
  'personal_record',
  'program_completion',
  'volume',
  'weight_lifted',
  'custom'
];

const EMPTY_TEMPLATE: Partial<AchievementTemplate> = {
  name: '',
  description: '',
  icon: '🏆',
  category: 'workout',
  achievement_type: 'workout_count',
  is_tiered: false,
  tier_bronze_threshold: null,
  tier_bronze_label: 'Bronze',
  tier_silver_threshold: null,
  tier_silver_label: 'Silver',
  tier_gold_threshold: null,
  tier_gold_label: 'Gold',
  tier_platinum_threshold: null,
  tier_platinum_label: 'Platinum',
  single_threshold: null,
  is_active: true,
};

export default function AchievementTemplatesPage() {
  const [templates, setTemplates] = useState<AchievementTemplate[]>([]);
  const [trackingSources, setTrackingSources] = useState<TrackingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Edit/Create state
  const [editingTemplate, setEditingTemplate] = useState<Partial<AchievementTemplate> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('achievement_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
      
      // Load tracking sources for reference
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('tracking_sources')
        .select('id, source_key, display_name, category, unit')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (sourcesError) throw sourcesError;
      setTrackingSources(sourcesData || []);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (!showInactive && !t.is_active) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Handle create
  const handleCreate = () => {
    setEditingTemplate({ ...EMPTY_TEMPLATE });
    setIsCreating(true);
  };

  // Handle edit
  const handleEdit = (template: AchievementTemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!editingTemplate?.name?.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: editingTemplate.name.trim(),
        description: editingTemplate.description?.trim() || null,
        icon: editingTemplate.icon || '🏆',
        category: editingTemplate.category || 'workout',
        achievement_type: editingTemplate.achievement_type || 'workout_count',
        is_tiered: editingTemplate.is_tiered || false,
        is_active: editingTemplate.is_active ?? true,
      };

      if (editingTemplate.is_tiered) {
        payload.tier_bronze_threshold = editingTemplate.tier_bronze_threshold;
        payload.tier_bronze_label = editingTemplate.tier_bronze_label || 'Bronze';
        payload.tier_silver_threshold = editingTemplate.tier_silver_threshold;
        payload.tier_silver_label = editingTemplate.tier_silver_label || 'Silver';
        payload.tier_gold_threshold = editingTemplate.tier_gold_threshold;
        payload.tier_gold_label = editingTemplate.tier_gold_label || 'Gold';
        payload.tier_platinum_threshold = editingTemplate.tier_platinum_threshold;
        payload.tier_platinum_label = editingTemplate.tier_platinum_label || 'Platinum';
        payload.single_threshold = null;
      } else {
        payload.single_threshold = editingTemplate.single_threshold;
        payload.tier_bronze_threshold = null;
        payload.tier_bronze_label = null;
        payload.tier_silver_threshold = null;
        payload.tier_silver_label = null;
        payload.tier_gold_threshold = null;
        payload.tier_gold_label = null;
        payload.tier_platinum_threshold = null;
        payload.tier_platinum_label = null;
      }

      if (isCreating) {
        const { error: insertError } = await supabase
          .from('achievement_templates')
          .insert(payload);
        
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('achievement_templates')
          .update(payload)
          .eq('id', editingTemplate.id);
        
        if (updateError) throw updateError;
      }

      await loadData();
      handleCancel();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Handle soft delete
  const handleDelete = async (template: AchievementTemplate) => {
    if (!confirm(`Are you sure you want to ${template.is_active ? 'deactivate' : 'activate'} "${template.name}"?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('achievement_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      
      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Error toggling template status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  // Update field
  const updateField = (field: keyof AchievementTemplate, value: any) => {
    setEditingTemplate(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Get tier badge color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-600 bg-amber-600/20';
      case 'silver': return 'text-slate-300 bg-slate-300/20';
      case 'gold': return 'text-yellow-400 bg-yellow-400/20';
      case 'platinum': return 'text-cyan-300 bg-cyan-300/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading achievement templates...</p>
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
            <Trophy className="w-7 h-7 text-yellow-400" />
            Achievement Templates
          </h2>
          <p className="text-slate-400 mt-1">
            Manage achievements and badges that clients can earn
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Achievement
        </button>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-yellow-600 focus:ring-yellow-500"
          />
          Show Inactive
        </label>
      </div>

      {/* Edit/Create Form */}
      {editingTemplate && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Create New Achievement' : 'Edit Achievement'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingTemplate.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="e.g., Workout Warrior"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Icon (Emoji)</label>
              <input
                type="text"
                value={editingTemplate.icon || ''}
                onChange={(e) => updateField('icon', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="🏆"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={editingTemplate.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                placeholder="Achievement description..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={editingTemplate.category || 'workout'}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Achievement Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Achievement Type</label>
              <select
                value={editingTemplate.achievement_type || 'workout_count'}
                onChange={(e) => updateField('achievement_type', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {ACHIEVEMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Tiered Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTemplate.is_tiered || false}
                  onChange={(e) => updateField('is_tiered', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-slate-300">
                  <Medal className="w-4 h-4 inline-block mr-1 text-yellow-400" />
                  Tiered achievement (Bronze → Silver → Gold → Platinum)
                </span>
              </label>
            </div>

            {/* Tiered Thresholds */}
            {editingTemplate.is_tiered ? (
              <>
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bronze */}
                  <div>
                    <label className="block text-sm font-medium text-amber-600 mb-1">Bronze</label>
                    <input
                      type="number"
                      value={editingTemplate.tier_bronze_threshold || ''}
                      onChange={(e) => updateField('tier_bronze_threshold', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="10"
                    />
                  </div>
                  {/* Silver */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Silver</label>
                    <input
                      type="number"
                      value={editingTemplate.tier_silver_threshold || ''}
                      onChange={(e) => updateField('tier_silver_threshold', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="25"
                    />
                  </div>
                  {/* Gold */}
                  <div>
                    <label className="block text-sm font-medium text-yellow-400 mb-1">Gold</label>
                    <input
                      type="number"
                      value={editingTemplate.tier_gold_threshold || ''}
                      onChange={(e) => updateField('tier_gold_threshold', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-slate-900 border border-yellow-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="50"
                    />
                  </div>
                  {/* Platinum */}
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-1">Platinum</label>
                    <input
                      type="number"
                      value={editingTemplate.tier_platinum_threshold || ''}
                      onChange={(e) => updateField('tier_platinum_threshold', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-slate-900 border border-cyan-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      placeholder="100"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Threshold Value</label>
                <input
                  type="number"
                  value={editingTemplate.single_threshold || ''}
                  onChange={(e) => updateField('single_threshold', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., 10"
                />
              </div>
            )}

            {/* Is Active */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTemplate.is_active ?? true}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-green-600 focus:ring-green-500"
                />
                <span className="text-slate-300">Active (visible to clients)</span>
              </label>
            </div>
          </div>

          {/* Preview Card */}
          {editingTemplate.name && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-sm font-medium text-slate-400 mb-3">Preview:</p>
              <div className="inline-flex items-center gap-3 bg-slate-900 rounded-lg px-4 py-3 border border-slate-700">
                <span className="text-3xl">{editingTemplate.icon || '🏆'}</span>
                <div>
                  <p className="font-semibold text-white">{editingTemplate.name}</p>
                  {editingTemplate.description && (
                    <p className="text-sm text-slate-400">{editingTemplate.description}</p>
                  )}
                  {editingTemplate.is_tiered && (
                    <div className="flex gap-1 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('bronze')}`}>
                        {editingTemplate.tier_bronze_threshold || '?'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('silver')}`}>
                        {editingTemplate.tier_silver_threshold || '?'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('gold')}`}>
                        {editingTemplate.tier_gold_threshold || '?'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('platinum')}`}>
                        {editingTemplate.tier_platinum_threshold || '?'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              disabled={saving || !editingTemplate.name?.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Achievement'}
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            {searchTerm || categoryFilter !== 'all' 
              ? 'No achievements match your filters'
              : 'No achievement templates found. Create one to get started.'}
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div 
              key={template.id} 
              className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all ${!template.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{template.icon || '🏆'}</span>
                  <div>
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <span className="text-xs text-slate-500">{template.category} • {template.achievement_type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className={`p-1.5 rounded transition-colors ${
                      template.is_active 
                        ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' 
                        : 'text-slate-400 hover:text-green-400 hover:bg-slate-700'
                    }`}
                    title={template.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {template.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{template.description}</p>
              )}
              
              {/* Thresholds */}
              {template.is_tiered ? (
                <div className="flex flex-wrap gap-1">
                  {template.tier_bronze_threshold && (
                    <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('bronze')}`}>
                      {template.tier_bronze_threshold}
                    </span>
                  )}
                  {template.tier_silver_threshold && (
                    <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('silver')}`}>
                      {template.tier_silver_threshold}
                    </span>
                  )}
                  {template.tier_gold_threshold && (
                    <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('gold')}`}>
                      {template.tier_gold_threshold}
                    </span>
                  )}
                  {template.tier_platinum_threshold && (
                    <span className={`px-2 py-0.5 text-xs rounded ${getTierColor('platinum')}`}>
                      {template.tier_platinum_threshold}
                    </span>
                  )}
                </div>
              ) : template.single_threshold ? (
                <span className="text-sm text-slate-300">
                  Threshold: {template.single_threshold}
                </span>
              ) : null}
              
              {/* Status */}
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                {template.is_active ? (
                  <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium bg-slate-600/50 text-slate-400 rounded">
                    Inactive
                  </span>
                )}
                {template.is_tiered && (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <Medal className="w-3 h-3" />
                    Tiered
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary */}
      <div className="text-sm text-slate-400">
        Showing {filteredTemplates.length} of {templates.length} achievements
        {!showInactive && templates.filter(t => !t.is_active).length > 0 && (
          <span className="ml-2">
            ({templates.filter(t => !t.is_active).length} inactive hidden)
          </span>
        )}
      </div>
    </div>
  );
}
