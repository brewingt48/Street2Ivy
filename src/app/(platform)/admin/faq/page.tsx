'use client';

/**
 * Admin FAQ Management
 *
 * Create, edit, reorder, and delete FAQ items displayed on the homepage.
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Info,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  order: number;
}

export default function AdminFaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/faq')
      .then((r) => r.json())
      .then((data) => {
        setItems(
          (data.items || []).map((item: Record<string, unknown>, i: number) => ({
            question: (item.question as string) || '',
            answer: (item.answer as string) || '',
            order: (item.order as number) ?? i,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const orderedItems = items.map((item, i) => ({ ...item, order: i }));
      const res = await fetch('/api/admin/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderedItems }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      setMsg({ type: 'success', text: 'FAQ saved successfully' });
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setItems([...items, { question: '', answer: '', order: items.length }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">FAQ Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage frequently asked questions displayed on the homepage
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">How FAQ Management Works</p>
            <ul className="space-y-1 text-teal-700 dark:text-teal-400">
              <li>&bull; Add questions and answers that will appear on the public homepage</li>
              <li>&bull; Use the arrow buttons to reorder items &mdash; they display in the order shown here</li>
              <li>&bull; Changes are not live until you click <strong>Save All</strong></li>
              <li>&bull; You can hide the entire FAQ section from the Homepage Editor page</li>
            </ul>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* FAQ Items */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">No FAQ items yet</h3>
            <p className="text-sm text-slate-400 mt-1">
              Add your first question and answer to get started
            </p>
            <Button variant="outline" className="mt-4" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" /> Add First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                    Question {index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Question</Label>
                  <Input
                    placeholder="e.g., How does Proveground work?"
                    value={item.question}
                    onChange={(e) => updateItem(index, 'question', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer</Label>
                  <Textarea
                    placeholder="Provide a clear, helpful answer..."
                    value={item.answer}
                    onChange={(e) => updateItem(index, 'answer', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" /> Add Question
        </Button>
        {items.length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        )}
      </div>
    </div>
  );
}
