'use client';

/**
 * Education Admin Legal Policies — CRUD management for tenant legal policies
 *
 * Allows education admins to create, edit, publish, and delete legal policies
 * for their institution. These supplement the platform-wide policies.
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  Pencil,
  X,
  Globe,
} from 'lucide-react';

interface Policy {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PolicyForm {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
}

interface PlatformPolicy {
  title: string;
  slug: string;
}

const EMPTY_FORM: PolicyForm = {
  title: '',
  slug: '',
  content: '',
  isPublished: false,
  sortOrder: 0,
};

export default function EducationLegalPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [platformPolicies, setPlatformPolicies] = useState<PlatformPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create mode
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<PolicyForm>(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PolicyForm>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Feedback
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/education/legal-policies');
      const data = await res.json();
      if (res.ok) {
        setPolicies(data.policies || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformPolicies = async () => {
    try {
      const res = await fetch('/api/legal-policies');
      const data = await res.json();
      if (res.ok) {
        setPlatformPolicies(data.policies || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPolicies();
    fetchPlatformPolicies();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCreate = async () => {
    setCreateSaving(true);
    setError('');
    try {
      const res = await fetch('/api/education/legal-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create policy');
        return;
      }
      setCreating(false);
      setCreateForm(EMPTY_FORM);
      showSuccess('Policy created successfully');
      await fetchPolicies();
    } catch {
      setError('Failed to create policy');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEdit = (policy: Policy) => {
    setEditingId(policy.id);
    setEditForm({
      title: policy.title,
      slug: policy.slug,
      content: policy.content,
      isPublished: policy.isPublished,
      sortOrder: policy.sortOrder,
    });
    setCreating(false);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/education/legal-policies/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to save policy');
        return;
      }
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      showSuccess('Policy saved successfully');
      await fetchPolicies();
    } catch {
      setError('Failed to save policy');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/education/legal-policies/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to delete policy');
        return;
      }
      showSuccess('Policy deleted');
      await fetchPolicies();
    } catch {
      setError('Failed to delete policy');
    }
  };

  const loadPolicyContent = async (id: string) => {
    try {
      const res = await fetch(`/api/education/legal-policies/${id}`);
      const data = await res.json();
      if (res.ok && data.policy) {
        setEditForm((prev) => ({ ...prev, content: data.policy.content }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Institution Legal Policies
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create legal policies for your institution&apos;s landing page. These supplement the platform-wide policies.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setCreateForm(EMPTY_FORM);
          }}
          className="bg-teal-600 hover:bg-teal-700"
          disabled={creating}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Create Form */}
      {creating && (
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-teal-600" />
              New Legal Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Student Data Policy"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="create-slug">
                  Slug <span className="text-xs text-slate-400">(auto-generated if blank)</span>
                </Label>
                <Input
                  id="create-slug"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="student-data-policy"
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-content">Content</Label>
              <Textarea
                id="create-content"
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                placeholder="Enter your legal policy content here..."
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-sortOrder">Sort Order</Label>
                <Input
                  id="create-sortOrder"
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Lower numbers appear first in the footer</p>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isPublished}
                    onChange={(e) => setCreateForm({ ...createForm, isPublished: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Publish immediately
                  </span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleCreate} disabled={createSaving || !createForm.title} className="bg-teal-600 hover:bg-teal-700">
                <Save className="h-4 w-4 mr-2" />
                {createSaving ? 'Creating...' : 'Create Policy'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setCreateForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      {policies.length === 0 && !creating ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">No institution policies yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Create your first institution-specific legal policy.
            </p>
            <Button
              onClick={() => {
                setCreating(true);
                setCreateForm(EMPTY_FORM);
              }}
              className="mt-4 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <Card key={policy.id} className={editingId === policy.id ? 'border-teal-200' : ''}>
              {editingId === policy.id ? (
                /* Edit Mode */
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Pencil className="h-5 w-5 text-teal-600" />
                      Edit Policy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>
                          Slug <span className="text-xs text-slate-400">(changing this breaks existing links)</span>
                        </Label>
                        <Input
                          value={editForm.slug}
                          onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                          className="mt-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Content</Label>
                      <Textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        rows={16}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editForm.sortOrder}
                          onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isPublished}
                            onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Published
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button onClick={handleEditSave} disabled={editSaving || !editForm.title} className="bg-teal-600 hover:bg-teal-700">
                        <Save className="h-4 w-4 mr-2" />
                        {editSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(EMPTY_FORM);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                /* View Mode */
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {policy.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              policy.isPublished
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }
                          >
                            {policy.isPublished ? (
                              <><Eye className="h-3 w-3 mr-1" /> Published</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" /> Draft</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-mono text-slate-400">slug: {policy.slug}</span>
                          <span className="text-xs text-slate-400">Order: {policy.sortOrder}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-teal-600"
                        onClick={() => {
                          handleEdit(policy);
                          loadPolicyContent(policy.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => handleDelete(policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Platform Policies Reference */}
      {platformPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-slate-400" />
              Platform-Wide Policies
            </CardTitle>
            <CardDescription>
              These platform policies are managed by the Proveground team and automatically appear on all pages alongside your institution policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {platformPolicies.map((p) => (
                <div key={p.slug} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <FileText className="h-4 w-4 text-slate-300" />
                  <span>{p.title}</span>
                  <span className="text-xs font-mono text-slate-400">(/legal/{p.slug})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
