'use client';

/**
 * Student Onboarding Wizard
 *
 * Multi-step form: Profile → Skills → Institution → Done
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, User, GraduationCap, Sparkles } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
}

const STEPS = ['Profile', 'Skills', 'Complete'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile state
  const [profile, setProfile] = useState({
    university: '',
    major: '',
    graduationYear: '',
    gpa: '',
    bio: '',
    phone: '',
  });

  // Skills state
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    fetch('/api/skills')
      .then((res) => res.json())
      .then((data) => setAllSkills(data.skills || []))
      .catch(console.error);
  }, []);

  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProfileSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await csrfFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university: profile.university || undefined,
          major: profile.major || undefined,
          graduationYear: profile.graduationYear ? parseInt(profile.graduationYear) : undefined,
          gpa: profile.gpa || undefined,
          bio: profile.bio || undefined,
          phone: profile.phone || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSkillsSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await csrfFetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillIds: Array.from(selectedSkillIds) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save skills');
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                i < step
                  ? 'bg-teal-600 text-white'
                  : i === step
                  ? 'bg-teal-100 text-teal-700 border-2 border-teal-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'font-medium' : 'text-slate-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-4 h-px w-12 ${i < step ? 'bg-teal-600' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Profile */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal-600" />
              Complete Your Profile
            </CardTitle>
            <CardDescription>
              Tell us about your academic background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  placeholder="e.g. Harvard University"
                  value={profile.university}
                  onChange={(e) => setProfile((p) => ({ ...p, university: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  placeholder="e.g. Computer Science"
                  value={profile.major}
                  onChange={(e) => setProfile((p) => ({ ...p, major: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradYear">Graduation Year</Label>
                <Input
                  id="gradYear"
                  type="number"
                  placeholder="2026"
                  value={profile.graduationYear}
                  onChange={(e) => setProfile((p) => ({ ...p, graduationYear: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA (optional)</Label>
                <Input
                  id="gpa"
                  placeholder="3.8"
                  value={profile.gpa}
                  onChange={(e) => setProfile((p) => ({ ...p, gpa: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell companies a bit about yourself..."
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                placeholder="+1 (555) 000-0000"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Skip for now
            </Button>
            <Button onClick={handleProfileSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
              {loading ? 'Saving...' : 'Next: Skills'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 1: Skills */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-600" />
              Select Your Skills
            </CardTitle>
            <CardDescription>
              Choose skills that match your abilities ({selectedSkillIds.size} selected)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
            )}
            <Input
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto border rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {filteredSkills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant={selectedSkillIds.has(skill.id) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      selectedSkillIds.has(skill.id)
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'hover:bg-teal-50'
                    }`}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {skill.name}
                  </Badge>
                ))}
                {filteredSkills.length === 0 && (
                  <p className="text-sm text-slate-400">No skills found</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={handleSkillsSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Complete */}
      {step === 2 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-teal-600" />
            </div>
            <CardTitle>You&apos;re All Set!</CardTitle>
            <CardDescription>
              Your profile is ready. Start browsing projects and submit applications.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button onClick={() => router.push('/projects')} className="bg-teal-600 hover:bg-teal-700">
              Browse Projects
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
