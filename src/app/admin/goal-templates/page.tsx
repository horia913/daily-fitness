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
  Target,
  Zap,
  AlertCircle
} from 'lucide-react';

interface GoalTemplate {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  category: string | null;
  subcategory: string | null;
  default_unit: string | null;
  suggested_unit_display: string | null;
  is_auto_tracked: boolean;
  auto_track_source: string | null;
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
  'body_composition',
  'strength',
  'consistency',
  'endurance',
  'flexibility',
  'wellness',
  'nutrition',
  'custom'
];

const EMPTY_TEMPLATE: Partial<GoalTemplate> = {
  title: '',
  description: '',
  emoji: '🎯',
  category: 'custom',
  subcategory: '',
  default_unit: '',
  suggested_unit_display: '',
  is_auto_tracked: false,
  auto_track_source: null,
  is_active: true,
};

export default function GoalTemplatesPage() {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [trackingSources, setTrackingSources] = useState<TrackingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Edit/Create state
  const [editingTemplate, setEditingTemplate] = useState<Partial<GoalTemplate> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load goal templates (admin sees all, including inactive)
      const { data: templatesData, error: templatesError } = await supabase
        .from('goal_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
      
      // Load tracking sources for auto-track dropdown
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('tracking_sources')
        .select('id, source_key, display_name, category, unit')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });
      
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
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.category?.toLowerCase().includes(search)
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
  const handleEdit = (template: GoalTemplate) => {
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
    if (!editingTemplate?.title?.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: editingTemplate.title.trim(),
        description: editingTemplate.description?.trim() || null,
        emoji: editingTemplate.emoji || '🎯',
        category: editingTemplate.category || 'custom',
        subcategory: editingTemplate.subcategory?.trim() || null,
        default_unit: editingTemplate.default_unit?.trim() || null,
        suggested_unit_display: editingTemplate.suggested_unit_display?.trim() || null,
        is_auto_tracked: editingTemplate.is_auto_tracked || false,
        auto_track_source: editingTemplate.is_auto_tracked ? editingTemplate.auto_track_source : null,
        is_active: editingTemplate.is_active ?? true,
      };

      if (isCreating) {
        const { error: insertError } = await supabase
          .from('goal_templates')
          .insert(payload);
        
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('goal_templates')
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

  // Handle soft delete (set is_active = false)
  const handleDelete = async (template: GoalTemplate) => {
    if (!confirm(`Are you sure you want to ${template.is_active ? 'deactivate' : 'activate'} "${template.title}"?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('goal_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      
      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Error toggling template status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  // Update editing template field
  const updateField = (field: keyof GoalTemplate, value: any) => {
    setEditingTemplate(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading goal templates...</p>
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
            <Target className="w-7 h-7 text-blue-400" />
            Goal Templates
          </h2>
          <p className="text-slate-400 mt-1">
            Manage the goal types that clients can select
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Template
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
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
          />
          Show Inactive
        </label>
      </div>

      {/* Edit/Create Form */}
      {editingTemplate && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Create New Template' : 'Edit Template'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingTemplate.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Weight Loss"
              />
            </div>

            {/* Emoji */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Emoji</label>
              <input
                type="text"
                value={editingTemplate.emoji || ''}
                onChange={(e) => updateField('emoji', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="🎯"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={editingTemplate.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Brief description of this goal type..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={editingTemplate.category || 'custom'}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Subcategory</label>
              <input
                type="text"
                value={editingTemplate.subcategory || ''}
                onChange={(e) => updateField('subcategory', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., compound lifts"
              />
            </div>

            {/* Default Unit */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Default Unit</label>
              <input
                type="text"
                value={editingTemplate.default_unit || ''}
                onChange={(e) => updateField('default_unit', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., kg, %, workouts/week"
              />
            </div>

            {/* Suggested Unit Display */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Unit Display</label>
              <input
                type="text"
                value={editingTemplate.suggested_unit_display || ''}
                onChange={(e) => updateField('suggested_unit_display', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., kilograms, percent"
              />
            </div>

            {/* Auto Track Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTemplate.is_auto_tracked || false}
                  onChange={(e) => updateField('is_auto_tracked', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-300">
                  <Zap className="w-4 h-4 inline-block mr-1 text-amber-400" />
                  Auto-track this goal from app data
                </span>
              </label>
            </div>

            {/* Auto Track Source */}
            {editingTemplate.is_auto_tracked && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Tracking Source</label>
                <select
                  value={editingTemplate.auto_track_source || ''}
                  onChange={(e) => updateField('auto_track_source', e.target.value || null)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a tracking source...</option>
                  {trackingSources.map(source => (
                    <option key={source.source_key} value={source.source_key}>
                      {source.display_name} ({source.unit}) - {source.category}
                    </option>
                  ))}
                </select>
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
              disabled={saving || !editingTemplate.title?.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Template</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Unit</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Auto-Track</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'No templates match your filters'
                      : 'No goal templates found. Create one to get started.'}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map(template => (
                  <tr 
                    key={template.id} 
                    className={`hover:bg-slate-700/30 transition-colors ${!template.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.emoji || '🎯'}</span>
                        <div>
                          <p className="font-medium text-white">{template.title}</p>
                          {template.description && (
                            <p className="text-sm text-slate-400 line-clamp-1">{template.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded">
                        {template.category?.replace('_', ' ') || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {template.default_unit || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {template.is_auto_tracked ? (
                        <span className="flex items-center gap-1 text-amber-400 text-sm">
                          <Zap className="w-4 h-4" />
                          {template.auto_track_source || 'Yes'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {template.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-slate-600/50 text-slate-400 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className={`p-2 rounded-lg transition-colors ${
                            template.is_active 
                              ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' 
                              : 'text-slate-400 hover:text-green-400 hover:bg-slate-700'
                          }`}
                          title={template.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Summary */}
        <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 text-sm text-slate-400">
          Showing {filteredTemplates.length} of {templates.length} templates
          {!showInactive && templates.filter(t => !t.is_active).length > 0 && (
            <span className="ml-2">
              ({templates.filter(t => !t.is_active).length} inactive hidden)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
