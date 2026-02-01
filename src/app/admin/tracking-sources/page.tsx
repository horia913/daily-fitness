'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  Search,
  ChevronDown,
  Activity,
  Heart,
  Dumbbell,
  Apple,
  Sparkles,
  AlertCircle,
  Info
} from 'lucide-react';

interface TrackingSource {
  id: string;
  source_key: string;
  display_name: string;
  description: string | null;
  source_table: string;
  aggregation_type: string | null;
  value_column: string | null;
  filter_column: string | null;
  unit: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  fitness: { icon: Dumbbell, color: 'text-blue-400 bg-blue-400/10', label: 'Fitness' },
  body: { icon: Heart, color: 'text-pink-400 bg-pink-400/10', label: 'Body Metrics' },
  habits: { icon: Sparkles, color: 'text-purple-400 bg-purple-400/10', label: 'Habits' },
  wellness: { icon: Activity, color: 'text-green-400 bg-green-400/10', label: 'Wellness' },
  nutrition: { icon: Apple, color: 'text-amber-400 bg-amber-400/10', label: 'Nutrition' },
};

export default function TrackingSourcesPage() {
  const [sources, setSources] = useState<TrackingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tracking_sources')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });
      
      if (fetchError) throw fetchError;
      setSources(data || []);
      
    } catch (err) {
      console.error('Error loading tracking sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tracking sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter sources
  const filteredSources = sources.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        s.display_name.toLowerCase().includes(search) ||
        s.source_key.toLowerCase().includes(search) ||
        s.description?.toLowerCase().includes(search) ||
        s.source_table.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Group by category
  const categories = [...new Set(sources.map(s => s.category).filter(Boolean))] as string[];
  const groupedSources = categories.reduce((acc, category) => {
    acc[category] = filteredSources.filter(s => s.category === category);
    return acc;
  }, {} as Record<string, TrackingSource[]>);

  // Get category config
  const getCategoryConfig = (category: string | null) => {
    return CATEGORY_CONFIG[category || ''] || { 
      icon: Database, 
      color: 'text-slate-400 bg-slate-400/10', 
      label: category || 'Other' 
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading tracking sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-7 h-7 text-cyan-400" />
          Tracking Sources Reference
        </h2>
        <p className="text-slate-400 mt-1">
          Available data sources for auto-tracking goals and achievements
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-cyan-400 font-medium">How to use tracking sources</p>
          <p className="text-cyan-300 text-sm mt-1">
            When creating goal templates or achievements, you can link them to a tracking source 
            to enable automatic progress tracking. The app will automatically update progress 
            based on the data collected from the corresponding table.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{getCategoryConfig(cat).label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Sources by Category */}
      {categoryFilter === 'all' ? (
        // Grouped view
        <div className="space-y-8">
          {categories.map(category => {
            const config = getCategoryConfig(category);
            const Icon = config.icon;
            const categorySources = groupedSources[category];
            
            if (!categorySources || categorySources.length === 0) return null;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                  <span className="text-sm text-slate-500">({categorySources.length})</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorySources.map(source => (
                    <SourceCard 
                      key={source.id} 
                      source={source} 
                      expanded={expandedSource === source.id}
                      onToggle={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Filtered view
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSources.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              No tracking sources match your filters
            </div>
          ) : (
            filteredSources.map(source => (
              <SourceCard 
                key={source.id} 
                source={source} 
                expanded={expandedSource === source.id}
                onToggle={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
              />
            ))
          )}
        </div>
      )}
      
      {/* Summary */}
      <div className="text-sm text-slate-400 pt-4 border-t border-slate-700">
        {filteredSources.length} tracking sources available
      </div>
    </div>
  );
}

// Source Card Component
function SourceCard({ 
  source, 
  expanded, 
  onToggle 
}: { 
  source: TrackingSource; 
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div 
      className={`bg-slate-800/50 border rounded-lg overflow-hidden transition-all ${
        expanded ? 'border-cyan-500/50' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white">{source.display_name}</h4>
            <code className="text-xs text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              {source.source_key}
            </code>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {source.unit && (
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                {source.unit}
              </span>
            )}
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {source.description && (
          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{source.description}</p>
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Source Table:</span>
              <p className="text-white font-mono text-xs mt-0.5">{source.source_table}</p>
            </div>
            <div>
              <span className="text-slate-500">Aggregation:</span>
              <p className="text-white mt-0.5">{source.aggregation_type || '-'}</p>
            </div>
            {source.value_column && (
              <div>
                <span className="text-slate-500">Value Column:</span>
                <p className="text-white font-mono text-xs mt-0.5">{source.value_column}</p>
              </div>
            )}
            {source.filter_column && (
              <div>
                <span className="text-slate-500">Filter Column:</span>
                <p className="text-white font-mono text-xs mt-0.5">{source.filter_column}</p>
              </div>
            )}
          </div>
          
          {/* Copy button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(source.source_key);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Copy source_key to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
