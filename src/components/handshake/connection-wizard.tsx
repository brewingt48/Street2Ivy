'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, Link2, Shield } from 'lucide-react';

interface ConnectionWizardProps {
  onConnected: () => void;
}

export function ConnectionWizard({ onConnected }: ConnectionWizardProps) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('weekly');
  const [permissions, setPermissions] = useState({
    jobs: true,
    applications: false,
    students: false,
    fairs: false,
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // First save the key temporarily for testing
      await fetch('/api/education/handshake/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, syncFrequency: 'manual', dataPermissions: permissions }),
      });

      const res = await fetch('/api/education/handshake/test', { method: 'POST' });
      const result = await res.json();
      setTestResult(result);
      if (result.success) setStep(4);
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection', latencyMs: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/education/handshake/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, syncFrequency, dataPermissions: permissions }),
      });
      if (res.ok) {
        onConnected();
      }
    } catch (err) {
      console.error('Setup failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              s < step ? 'bg-teal-600 text-white' : s === step ? 'bg-teal-100 text-teal-700 border-2 border-teal-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 5 && <div className={`w-8 h-0.5 ${s < step ? 'bg-teal-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Instructions */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-teal-600" />
              Connect Handshake EDU API
            </CardTitle>
            <CardDescription>
              Enrich your skills analytics with real employer demand data from Handshake.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Before you begin:</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
                <li>Contact your Handshake representative to request EDU API access</li>
                <li>You will need an API key with the appropriate permissions</li>
                <li>Enterprise plan required for this integration</li>
              </ul>
            </div>
            <Button onClick={() => setStep(2)}>I have my API key</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: API Key */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Enter API Key</CardTitle>
            <CardDescription>Your API key will be encrypted and stored securely.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="h-3 w-3" />
              AES-256-GCM encrypted at rest
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Handshake EDU API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={apiKey.length < 10}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Test Connection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Verify your API key works before activating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTest} disabled={testing}>
              {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="text-sm">{testResult.message}</span>
                {testResult.success && (
                  <Badge variant="outline" className="ml-auto">{testResult.latencyMs}ms</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Permissions & Frequency */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Sync Settings</CardTitle>
            <CardDescription>Choose what data to sync and how often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Data Permissions</Label>
              {Object.entries(permissions).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => togglePermission(key as keyof typeof permissions)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm capitalize">{key}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={() => setStep(5)}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Activate */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Activate Integration</CardTitle>
            <CardDescription>Review your settings and activate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Sync Frequency:</span> {syncFrequency}</div>
              <div><span className="font-medium">Data:</span> {Object.entries(permissions).filter(([, v]) => v).map(([k]) => k).join(', ')}</div>
            </div>
            <Button onClick={handleActivate} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? 'Activating...' : 'Activate Handshake Integration'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
