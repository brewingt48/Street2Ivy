'use client';

/**
 * Target Roles (Professions) Management Page — Education Admin
 *
 * Allows education admins to create, view, edit, and delete target career roles
 * (professions) and their required skill qualifications. These roles are used
 * by the Skills Gap Analyzer and Skills Analytics dashboards to measure
 * student readiness for specific career paths.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  Star,
  Crosshair,
  Loader2,
  X,
} from 'lucide-react';

interface TargetRole {
  id: string;
  title: string;
  description: string;
  institutionId: string | null;
  source: string;
  skillCount: number;
}

interface SkillRequirement {
  skillId: string;
  skillName: string;
  skillCategory: string;
  importance: 'required' | 'preferred' | 'nice_to_have';
  minimumProficiency: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert',
};

const IMPORTANCE_LABELS: Record<string, { label: string; color: string }> = {
  required: { label: 'Required', color: 'bg-red-100 text-red-700' },
  preferred: { label: 'Preferred', color: 'bg-amber-100 text-amber-700' },
  nice_to_have: { label: 'Nice to Have', color: 'bg-slate-100 text-slate-600' },
};

export default function TargetRolesPage() {
  const [roles, setRoles] = useState<TargetRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TargetRole | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<SkillRequirement[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Skill search for adding requirements
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillResults, setShowSkillResults] = useState(false);

  // Delete confirmation
  const [deletingRole, setDeletingRole] = useState<TargetRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/target-roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(
          (data.roles || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            title: r.title as string,
            description: (r.description as string) || '',
            institutionId: r.institution_id as string | null,
            source: (r.source as string) || 'manual',
            skillCount: Number(r.skill_count) || 0,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load target roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setAllSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchSkills();
  }, [fetchRoles, fetchSkills]);

  const openCreateDialog = () => {
    setEditingRole(null);
    setTitle('');
    setDescription('');
    setRequirements([]);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEditDialog = async (role: TargetRole) => {
    setEditingRole(role);
    setTitle(role.title);
    setDescription(role.description);
    setDialogError(null);

    // Fetch existing requirements
    try {
      const res = await fetch(`/api/target-roles/${role.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequirements(
          (data.requirements || []).map((r: Record<string, unknown>) => ({
            skillId: r.skillId as string,
            skillName: r.skillName as string,
            skillCategory: r.skillCategory as string,
            importance: r.importance as 'required' | 'preferred' | 'nice_to_have',
            minimumProficiency: Number(r.minimumProficiency),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load role details:', err);
      setRequirements([]);
    }

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setDialogError('Profession title is required.');
      return;
    }

    setSaving(true);
    setDialogError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        skillRequirements: requirements.map((r) => ({
          skillId: r.skillId,
          importance: r.importance,
          minimumProficiency: r.minimumProficiency,
        })),
      };

      let res;
      if (editingRole) {
        res = await csrfFetch(`/api/target-roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await csrfFetch('/api/target-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to save profession');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      const res = await csrfFetch(`/api/target-roles/${deletingRole.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeletingRole(null);
        fetchRoles();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const addSkillRequirement = (skill: Skill) => {
    if (requirements.some((r) => r.skillId === skill.id)) return;
    setRequirements([
      ...requirements,
      {
        skillId: skill.id,
        skillName: skill.name,
        skillCategory: skill.category,
        importance: 'required',
        minimumProficiency: 2,
      },
    ]);
    setSkillSearch('');
    setShowSkillResults(false);
  };

  const removeSkillRequirement = (skillId: string) => {
    setRequirements(requirements.filter((r) => r.skillId !== skillId));
  };

  const updateRequirement = (skillId: string, field: string, value: string | number) => {
    setRequirements(
      requirements.map((r) =>
        r.skillId === skillId ? { ...r, [field]: value } : r
      )
    );
  };

  const filteredSkills = skillSearch.length >= 2
    ? allSkills
        .filter(
          (s) =>
            s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
            !requirements.some((r) => r.skillId === s.id)
        )
        .slice(0, 10)
    : [];

  const filteredRoles = searchQuery
    ? roles.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : roles;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-teal-600" />
            Target Roles (Professions)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Define career roles with required skills and proficiency levels. These professions
            power the Skills Gap Analyzer and Skills Analytics dashboards.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
          <Plus className="h-4 w-4" />
          Add Profession
        </Button>
      </div>

      {/* Explanation Card */}
      <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-slate-800 dark:text-white mb-1">How This Works</p>
              <p className="text-slate-600 dark:text-slate-300">
                Each profession defines the skills and proficiency levels that employers expect for that career path.
                When students run a Skills Gap Assessment, their skill profiles are compared against these requirements
                to generate readiness scores. On the <strong>Skills Analytics</strong> dashboard, you can filter by profession
                to see how ready your students are for specific careers. Professions are not randomly selected —
                they are intentionally configured here with researched skill requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search professions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Roles Grid */}
      {filteredRoles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 text-lg mb-2">
              {searchQuery ? 'No professions match your search' : 'No Professions Configured'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              {searchQuery
                ? 'Try a different search term.'
                : 'Create your first target profession to start measuring student readiness for specific career paths.'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
                <Plus className="h-4 w-4" />
                Add Profession
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4.5 w-4.5 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {role.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {role.skillCount} skill{role.skillCount !== 1 ? 's' : ''} required
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {role.source !== 'manual' && (
                      <Badge variant="outline" className="text-[10px]">{role.source}</Badge>
                    )}
                    {role.institutionId && (
                      <Badge className="bg-teal-100 text-teal-700 border-0 text-[10px]">Custom</Badge>
                    )}
                  </div>
                </div>

                {role.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{role.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="h-3.5 w-3.5 text-teal-500" />
                    <span className="text-xs text-slate-500">Skills Gap Assessment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-500 hover:text-teal-600"
                      onClick={() => openEditDialog(role)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-400 hover:text-red-600"
                      onClick={() => setDeletingRole(role)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-slate-400 text-center">
        {roles.length} profession{roles.length !== 1 ? 's' : ''} configured
        {' '}&middot; Used by Skills Gap Analyzer and Skills Analytics
      </p>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-teal-600" />
              {editingRole ? 'Edit Profession' : 'Add New Profession'}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Update this profession and its required skills. Changes will affect future Skills Gap Assessments.'
                : 'Define a target career role and the skills required for it. Students will be measured against these requirements.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="role-title">Profession Title</Label>
              <Input
                id="role-title"
                placeholder="e.g. Software Engineer, Data Analyst, Marketing Manager"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="role-description">Description (optional)</Label>
              <Textarea
                id="role-description"
                placeholder="Brief description of this career role and what it involves..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Skill Requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Required Skills & Qualifications</Label>
                <span className="text-xs text-slate-400">{requirements.length} skill{requirements.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Skill Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search skills to add..."
                  value={skillSearch}
                  onChange={(e) => {
                    setSkillSearch(e.target.value);
                    setShowSkillResults(true);
                  }}
                  onFocus={() => setShowSkillResults(true)}
                />
                {showSkillResults && filteredSkills.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSkills.map((skill) => (
                      <button
                        key={skill.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                        onClick={() => addSkillRequirement(skill)}
                      >
                        <span>{skill.name}</span>
                        <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Requirements List */}
              {requirements.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <Star className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No skills added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Search and add skills that this profession requires</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requirements.map((req) => (
                    <div
                      key={req.skillId}
                      className="border rounded-lg p-3 flex items-center gap-3 bg-white dark:bg-slate-900"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                            {req.skillName}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{req.skillCategory}</Badge>
                        </div>
                      </div>

                      {/* Importance */}
                      <Select
                        value={req.importance}
                        onValueChange={(v) => updateRequirement(req.skillId, 'importance', v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">Required</SelectItem>
                          <SelectItem value="preferred">Preferred</SelectItem>
                          <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Proficiency */}
                      <Select
                        value={String(req.minimumProficiency)}
                        onValueChange={(v) => updateRequirement(req.skillId, 'minimumProficiency', parseInt(v))}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <SelectItem key={lvl} value={String(lvl)}>
                              {lvl} - {PROFICIENCY_LABELS[lvl]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        onClick={() => removeSkillRequirement(req.skillId)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dialogError && (
              <p className="text-sm text-red-600">{dialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingRole ? (
                'Save Changes'
              ) : (
                'Create Profession'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Profession
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingRole?.title}&rdquo;? This will also remove all
              skill requirements and any associated skills gap snapshots. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRole(null)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Profession'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
