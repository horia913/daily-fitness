"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  Activity,
  Target,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  getProgressionSuggestions,
  getProgressionGuidelines,
  type ProgressionSuggestion,
  type ProgressionGuideline,
} from "@/lib/coachGuidelinesService";

interface ProgressionSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestions?: (suggestions: ProgressionSuggestion[]) => void;
  programId: string;
  currentWeek: number;
  category: string;
  difficulty: string;
  lastDeloadWeek?: number;
}

export default function ProgressionSuggestionsModal({
  isOpen,
  onClose,
  onApplySuggestions,
  programId,
  currentWeek,
  category,
  difficulty,
  lastDeloadWeek = 0,
}: ProgressionSuggestionsModalProps) {
  const [activeTab, setActiveTab] = useState("progression");

  // Get progression guidelines (async)
  const [guideline, setGuideline] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const loadGuidelineData = async () => {
      const guidelineData = await getProgressionGuidelines(category, difficulty.toLowerCase());
      setGuideline(guidelineData);
      
      if (guidelineData) {
        const suggestionData = await getProgressionSuggestions(
          currentWeek,
          lastDeloadWeek,
          category,
          difficulty.toLowerCase()
        );
        setSuggestions(suggestionData);
      } else {
        setSuggestions([]);
      }
    };

    loadGuidelineData();
  }, [currentWeek, lastDeloadWeek, category, difficulty]);

  // Calculate weeks since last deload
  const weeksSinceDeload = currentWeek - lastDeloadWeek;

  // Get suggestion type color
  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case "deload":
        return "fc-text-warning";
      case "volume":
        return "fc-text-success";
      case "intensity":
        return "fc-text-workouts";
      case "maintain":
        return "fc-text-subtle";
      default:
        return "fc-text-subtle";
    }
  };

  const getSuggestionIconTone = (type: string) => {
    switch (type) {
      case "maintain":
        return "fc-icon-neutral";
      default:
        return "fc-icon-workouts";
    }
  };

  // Get suggestion type icon
  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case "deload":
        return <RefreshCw className="w-4 h-4" />;
      case "volume":
        return <TrendingUp className="w-4 h-4" />;
      case "intensity":
        return <Zap className="w-4 h-4" />;
      case "maintain":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Handle apply suggestions
  const handleApplySuggestions = () => {
    if (onApplySuggestions && suggestions.length > 0) {
      onApplySuggestions(suggestions);
      onClose();
    }
  };

  if (!isOpen) return null;

  if (!guideline) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="fc-modal fc-card w-full max-w-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
            <div className="text-xl font-bold fc-text-primary">
              Progression Suggestions
            </div>
            <p className="text-sm fc-text-dim">
              No progression guidelines available for this category and difficulty.
            </p>
          </div>
          <div className="px-6 py-4 border-t border-[color:var(--fc-glass-border)] flex justify-end">
            <Button onClick={onClose} className="fc-btn fc-btn-secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fc-modal fc-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3 text-2xl font-bold fc-text-primary">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-5 h-5" />
            </div>
            Progression Suggestions — Week {currentWeek}
          </div>
          <p className="fc-text-dim">
            Recommendations based on {category} guidelines for {difficulty} level
          </p>
        </div>

          <div className="px-6 py-5">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="progression">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Progression Rates
                </TabsTrigger>
                <TabsTrigger value="structure">
                  <Layers className="w-4 h-4 mr-2" />
                  Block Structure
                </TabsTrigger>
                <TabsTrigger value="recovery">
                  <Activity className="w-4 h-4 mr-2" />
                  Recovery
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Weekly Progression Rates */}
              <TabsContent value="progression" className="space-y-4 mt-4">
                <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h3 className="font-semibold fc-text-primary mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Week {currentWeek} Recommendations
                  </h3>

                  {/* Current Status */}
                  <div className="mb-4 p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm fc-text-dim">
                        Weeks since last deload:
                      </span>
                      <span
                        className={`fc-pill fc-pill-glass ${
                          weeksSinceDeload >= guideline.deloadFrequencyWeeks
                            ? "fc-text-error"
                            : "fc-text-success"
                        }`}
                      >
                        {weeksSinceDeload} weeks
                      </span>
                    </div>
                    {weeksSinceDeload >= guideline.deloadFrequencyWeeks && (
                      <div className="flex items-start gap-2 mt-2 p-2 rounded border border-[color:var(--fc-status-error)] fc-glass-soft">
                        <AlertCircle className="w-4 h-4 fc-text-error mt-0.5 flex-shrink-0" />
                        <p className="text-xs fc-text-error">
                          <strong>Deload Recommended:</strong> You've reached the deload threshold
                          ({guideline.deloadFrequencyWeeks} weeks). Consider reducing volume by{" "}
                          {guideline.deloadVolumeReduction}% this week.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 ? (
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`fc-icon-tile ${getSuggestionIconTone(suggestion.type)}`}>
                              {getSuggestionTypeIcon(suggestion.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`fc-pill fc-pill-glass text-xs ${getSuggestionTypeColor(suggestion.type)}`}
                                >
                                  {suggestion.type}
                                </span>
                                <span className="font-semibold fc-text-primary">
                                  {suggestion.suggestion}
                                </span>
                              </div>
                              {suggestion.details && (
                                <p className="text-sm fc-text-dim mt-1">
                                  {suggestion.details}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] text-center">
                      <p className="text-sm fc-text-dim">
                        No specific suggestions for this week. Continue with current progression.
                      </p>
                    </div>
                  )}

                  {/* Guideline Summary */}
                  <div className="mt-4 p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                    <h4 className="font-semibold fc-text-primary mb-2">
                      Progression Guidelines Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="fc-text-subtle">Volume Increase:</span>
                        <span className="font-semibold fc-text-primary ml-2">
                          {guideline.volumeIncreaseWeekMin}-
                          {guideline.volumeIncreaseWeekMax}% per week
                        </span>
                      </div>
                      <div>
                        <span className="fc-text-subtle">Intensity Increase:</span>
                        <span className="font-semibold fc-text-primary ml-2">
                          {guideline.intensityIncreaseWeek}% per week
                        </span>
                      </div>
                      <div>
                        <span className="fc-text-subtle">Deload Frequency:</span>
                        <span className="font-semibold fc-text-primary ml-2">
                          Every {guideline.deloadFrequencyWeeks} weeks
                        </span>
                      </div>
                      <div>
                        <span className="fc-text-subtle">Deload Reduction:</span>
                        <span className="font-semibold fc-text-primary ml-2">
                          {guideline.deloadVolumeReduction}% volume
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)]">
                      <p className="text-xs fc-text-subtle">
                        <strong>Progress When:</strong> {guideline.progressWhen}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

          {/* Tab 2: Block Structure */}
              <TabsContent value="structure" className="space-y-4 mt-4">
                <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                  <h3 className="font-semibold fc-text-primary mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Periodization Recommendations
                  </h3>

              <div className="space-y-4">
                {/* Program Duration Recommendations */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Recommended Program Duration
                  </h4>
                  <p className="text-sm fc-text-dim mb-2">
                    Based on {category} training principles:
                  </p>
                  <ul className="text-sm fc-text-dim list-disc list-inside space-y-1">
                    <li>
                      <strong>4-6 weeks:</strong> Short mesocycle for beginners or skill
                      development
                    </li>
                    <li>
                      <strong>6-8 weeks:</strong> Standard mesocycle for most trainees
                    </li>
                    <li>
                      <strong>8-12 weeks:</strong> Extended mesocycle for advanced trainees
                      or specific goals
                    </li>
                  </ul>
                </div>

                {/* Block Type Recommendations */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Block Type Recommendations
                  </h4>
                  <p className="text-sm fc-text-dim mb-2">
                    For {category} training:
                  </p>
                  <div className="text-sm fc-text-dim space-y-1">
                    {category === "Hypertrophy" && (
                      <>
                        <p>
                          • <strong>Straight Sets:</strong> Primary block type for volume
                          accumulation
                        </p>
                        <p>
                          • <strong>Supersets:</strong> Time-efficient volume increases
                        </p>
                        <p>
                          • <strong>Drop Sets:</strong> Advanced technique for volume
                          intensification
                        </p>
                        <p>
                          • <strong>Pre-Exhaustion:</strong> For lagging muscle groups
                        </p>
                      </>
                    )}
                    {category === "Max Strength" && (
                      <>
                        <p>
                          • <strong>Straight Sets:</strong> Focus on heavy loads, low reps
                          (1-5)
                        </p>
                        <p>
                          • <strong>Cluster Sets:</strong> Maintain intensity with brief
                          rest
                        </p>
                        <p>
                          • <strong>Rest-Pause:</strong> Extend strength work capacity
                        </p>
                      </>
                    )}
                    {(category === "Strength Endurance" ||
                      category === "Aerobic Endurance" ||
                      category === "Anaerobic Capacity") && (
                      <>
                        <p>
                          • <strong>Straight Sets:</strong> Moderate loads, higher reps
                        </p>
                        <p>
                          • <strong>Circuit:</strong> For endurance and conditioning
                        </p>
                        <p>
                          • <strong>Time-Based Protocols:</strong> AMRAP, EMOM for
                          endurance
                        </p>
                      </>
                    )}
                    {(category === "Explosive Power" || category === "Sprint Speed") && (
                      <>
                        <p>
                          • <strong>Straight Sets:</strong> Low volume, high intensity
                        </p>
                        <p>
                          • <strong>Time-Based:</strong> EMOM, For Time for power output
                        </p>
                        <p>
                          • <strong>Rest-Pause:</strong> Maintain power across sets
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Periodization Pattern */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Suggested Periodization Pattern
                  </h4>
                  <div className="text-sm fc-text-dim space-y-2">
                    <p>
                      <strong>Weeks 1-{Math.floor(guideline.deloadFrequencyWeeks * 0.6)}:</strong>{" "}
                      Volume accumulation phase
                    </p>
                    <p>
                      <strong>Weeks {Math.floor(guideline.deloadFrequencyWeeks * 0.6) + 1}-{guideline.deloadFrequencyWeeks - 1}:</strong>{" "}
                      Intensity/peaking phase
                    </p>
                    <p>
                      <strong>Week {guideline.deloadFrequencyWeeks}:</strong> Deload week
                      ({guideline.deloadVolumeReduction}% volume reduction)
                    </p>
                  </div>
                </div>
              </div>
                </div>
              </TabsContent>

          {/* Tab 3: Recovery Indicators */}
              <TabsContent value="recovery" className="space-y-4 mt-4">
                <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                  <h3 className="font-semibold fc-text-primary mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recovery Monitoring
                  </h3>

              <div className="space-y-4">
                {/* Warning Thresholds */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 fc-text-warning" />
                    Warning Thresholds
                  </h4>
                  <ul className="text-sm fc-text-dim list-disc list-inside space-y-1">
                    <li>
                      <strong>Volume:</strong> If weekly volume exceeds recommended maximum
                      by 20%+, consider deload
                    </li>
                    <li>
                      <strong>Intensity:</strong> If RPE consistently above 9/10, reduce
                      intensity
                    </li>
                    <li>
                      <strong>Frequency:</strong> If training more than recommended
                      sessions/week, monitor recovery closely
                    </li>
                    <li>
                      <strong>Performance:</strong> If performance decreases for 2+
                      consecutive sessions, deload immediately
                    </li>
                  </ul>
                </div>

                {/* Recovery Indicators */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 fc-text-success" />
                    Positive Recovery Indicators
                  </h4>
                  <ul className="text-sm fc-text-dim list-disc list-inside space-y-1">
                    <li>Sleep quality improves</li>
                    <li>Performance increases or maintains</li>
                    <li>No excessive soreness between sessions</li>
                    <li>Energy levels stable throughout the week</li>
                    <li>Motivation remains high</li>
                  </ul>
                </div>

                {/* Monitoring Recommendations */}
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Monitoring Recommendations
                  </h4>
                  <div className="text-sm fc-text-dim space-y-2">
                    <p>
                      <strong>Weekly Check-ins:</strong> Monitor performance metrics, RPE,
                      and recovery markers
                    </p>
                    <p>
                      <strong>Deload Triggers:</strong> Automatic deload every{" "}
                      {guideline.deloadFrequencyWeeks} weeks, or when recovery indicators
                      suggest need
                    </p>
                    <p>
                      <strong>Volume Adjustments:</strong> Adjust volume based on recovery
                      and performance feedback
                    </p>
                    <p>
                      <strong>Client Communication:</strong> Regularly check in on sleep,
                      stress, and overall well-being
                    </p>
                  </div>
                </div>
              </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        <div className="px-6 py-4 border-t border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm fc-text-subtle">
              These are informational suggestions. Configure progression rules manually in the Progression tab.
            </p>
            <Button variant="outline" onClick={onClose} className="fc-btn fc-btn-secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
