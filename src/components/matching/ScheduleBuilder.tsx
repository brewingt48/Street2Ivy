'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Plus,
  Trash2,
  Trophy,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface SportSeason {
  id: string;
  sport_name: string;
  season_type: string;
  start_month: number;
  end_month: number;
  practice_hours_per_week: number;
  competition_hours_per_week: number;
  travel_days_per_month: number;
  intensity_level: number;
}

interface ScheduleEntry {
  id: string;
  schedule_type: string;
  sport_season_id: string | null;
  sport_name?: string;
  season_type?: string;
  custom_blocks: Array<{ day: string; startTime: string; endTime: string; label?: string }>;
  available_hours_per_week: number | null;
  travel_conflicts: Array<{ startDate: string; endDate: string; reason?: string }>;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

interface ScheduleBuilderProps {
  className?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ScheduleBuilder({ className }: ScheduleBuilderProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [sportSeasons, setSportSeasons] = useState<SportSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New schedule form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'sport' | 'custom' | 'work'>('sport');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [availableHours, setAvailableHours] = useState<string>('');
  const [customBlocks, setCustomBlocks] = useState<Array<{ day: string; startTime: string; endTime: string; label: string }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, sportRes] = await Promise.all([
        fetch('/api/match-engine/schedules'),
        fetch('/api/match-engine/sport-seasons'),
      ]);
      const schedData = await schedRes.json();
      const sportData = await sportRes.json();
      setSchedules(schedData.schedules || []);
      setSportSeasons(sportData.seasons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSchedule = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        scheduleType: formType,
      };

      if (formType === 'sport' && selectedSport) {
        payload.sportSeasonId = selectedSport;
      }

      if (availableHours) {
        payload.availableHoursPerWeek = parseInt(availableHours);
      }

      if (customBlocks.length > 0) {
        payload.customBlocks = customBlocks;
      }

      const res = await fetch('/api/match-engine/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create schedule');
      }

      setSuccess('Schedule added successfully');
      setShowForm(false);
      setSelectedSport('');
      setAvailableHours('');
      setCustomBlocks([]);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/match-engine/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const addCustomBlock = () => {
    setCustomBlocks([...customBlocks, { day: 'Monday', startTime: '09:00', endTime: '17:00', label: '' }]);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            My Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              My Schedule
            </CardTitle>
            <CardDescription>
              Manage your sport seasons and availability to improve match quality
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 space-y-4 bg-teal-50/50 dark:bg-teal-900/10">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as 'sport' | 'custom' | 'work')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sport">Sport Season</SelectItem>
                  <SelectItem value="custom">Custom Block</SelectItem>
                  <SelectItem value="work">Work Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formType === 'sport' && (
              <div className="space-y-2">
                <Label>Sport Season</Label>
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport season..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sportSeasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sport_name} — {s.season_type} ({MONTHS[s.start_month - 1]}–{MONTHS[s.end_month - 1]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formType === 'custom' || formType === 'work') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Time Blocks</Label>
                  <Button variant="ghost" size="sm" onClick={addCustomBlock}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Block
                  </Button>
                </div>
                {customBlocks.map((block, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Day</Label>
                      <Select
                        value={block.day}
                        onValueChange={(v) => {
                          const updated = [...customBlocks];
                          updated[idx] = { ...updated[idx], day: v };
                          setCustomBlocks(updated);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d.slice(0, 3)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="time"
                        value={block.startTime}
                        onChange={(e) => {
                          const updated = [...customBlocks];
                          updated[idx] = { ...updated[idx], startTime: e.target.value };
                          setCustomBlocks(updated);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="time"
                        value={block.endTime}
                        onChange={(e) => {
                          const updated = [...customBlocks];
                          updated[idx] = { ...updated[idx], endTime: e.target.value };
                          setCustomBlocks(updated);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={block.label}
                        onChange={(e) => {
                          const updated = [...customBlocks];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setCustomBlocks(updated);
                        }}
                        placeholder="e.g., Practice"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCustomBlocks(customBlocks.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Available Hours/Week (optional)</Label>
              <Input
                type="number"
                min="0"
                max="168"
                value={availableHours}
                onChange={(e) => setAvailableHours(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddSchedule} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Schedule'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Existing schedules */}
        {schedules.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              No schedules configured
            </p>
            <p className="text-xs text-slate-400">
              Add your sport seasons and availability to get better match recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  entry.is_active
                    ? 'border-slate-200 dark:border-slate-700'
                    : 'border-slate-100 dark:border-slate-800 opacity-60'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  entry.schedule_type === 'sport'
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : entry.schedule_type === 'academic'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  {entry.schedule_type === 'sport' ? (
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : entry.schedule_type === 'academic' ? (
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {entry.sport_name
                      ? `${entry.sport_name} — ${entry.season_type}`
                      : entry.schedule_type === 'work'
                        ? 'Work Schedule'
                        : 'Custom Schedule'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {entry.available_hours_per_week && (
                      <span>{entry.available_hours_per_week}h/week available</span>
                    )}
                    {entry.custom_blocks && entry.custom_blocks.length > 0 && (
                      <span>{entry.custom_blocks.length} time block{entry.custom_blocks.length !== 1 ? 's' : ''}</span>
                    )}
                    {entry.travel_conflicts && entry.travel_conflicts.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {entry.travel_conflicts.length} travel conflict{entry.travel_conflicts.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Active badge */}
                {entry.is_active && (
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Active
                  </Badge>
                )}

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
