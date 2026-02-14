'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Section {
  section: string;
  content: Record<string, unknown>;
  updatedAt: string;
}

const SECTIONS = ['hero', 'features', 'testimonials', 'cta', 'about', 'stats'];

export default function AdminContentPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/content').then((r) => r.json()).then((d) => setSections(d.sections || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleEdit = (section: Section) => {
    setEditingSection(section.section);
    setEditContent(JSON.stringify(section.content, null, 2));
    setError('');
    setSaved('');
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved('');
    try {
      const content = JSON.parse(editContent);
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: editingSection, content }),
      });
      if (res.ok) {
        setSaved(editingSection);
        // Refresh data
        const d = await (await fetch('/api/admin/content')).json();
        setSections(d.sections || []);
        setEditingSection('');
      } else { setError('Failed to save'); }
    } catch { setError('Invalid JSON'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;

  const existingSectionMap = Object.fromEntries(sections.map((s) => [s.section, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Landing Page Content</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Edit content sections for the public landing page</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid gap-4">
        {SECTIONS.map((sectionKey) => {
          const section = existingSectionMap[sectionKey];
          const isEditing = editingSection === sectionKey;
          return (
            <Card key={sectionKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">{sectionKey} Section</CardTitle>
                    {section && <CardDescription>Last updated: {new Date(section.updatedAt).toLocaleString()}</CardDescription>}
                  </div>
                  {saved === sectionKey && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Saved</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8} className="font-mono text-xs" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                        <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSection('')}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {section ? (
                      <pre className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded max-h-32 overflow-auto">
                        {JSON.stringify(section.content, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-slate-400">No content yet. Click edit to add.</p>
                    )}
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => handleEdit(section || { section: sectionKey, content: {}, updatedAt: '' })}>
                      Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
