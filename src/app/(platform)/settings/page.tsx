'use client';

/**
 * Settings Page
 *
 * Full profile editor, skills management, and password change.
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  User,
  GraduationCap,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  gpa: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [gpa, setGpa] = useState('');

  // Skills form
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skillsSaving, setSkillsSaving] = useState(false);
  const [skillsMsg, setSkillsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/skills').then((r) => r.json()),
    ])
      .then(([profileData, skillsData]) => {
        const p = profileData.profile;
        setProfile(p);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setBio(p.bio || '');
        setPhone(p.phone || '');
        setUniversity(p.university || '');
        setMajor(p.major || '');
        setGraduationYear(p.graduationYear ? String(p.graduationYear) : '');
        setGpa(p.gpa || '');

        setSelectedSkillIds(new Set((profileData.skills || []).map((s: Skill) => s.id)));
        setAllSkills(skillsData.skills || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          bio: bio || undefined,
          phone: phone || undefined,
          university: university || undefined,
          major: major || undefined,
          graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
          gpa: gpa || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSkillsSave = async () => {
    setSkillsSaving(true);
    setSkillsMsg(null);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillIds: Array.from(selectedSkillIds) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      await res.json();
      setSkillsMsg({ type: 'success', text: 'Skills updated successfully' });
    } catch (err) {
      setSkillsMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSkillsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your profile, skills, and account security
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Keep your profile up to date for better visibility. Adding <strong>skills</strong> improves project matching. Use a <strong>strong password</strong> (8+ characters) to keep your account secure.
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-teal-600" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal details and academic background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileMsg && (
            <div
              className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {profileMsg.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-slate-50"
            />
            <p className="text-xs text-slate-400">
              Email cannot be changed.
              {profile?.emailVerified
                ? ' Your email is verified.'
                : ' Your email is not yet verified.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell companies about yourself..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Harvard University"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradYear">Graduation Year</Label>
              <Input
                id="gradYear"
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="3.8"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-600" />
            Skills
          </CardTitle>
          <CardDescription>
            Manage your skills to improve project matching ({selectedSkillIds.size} selected)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {skillsMsg && (
            <div
              className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                skillsMsg.type === 'success'
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {skillsMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {skillsMsg.text}
            </div>
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
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleSkillsSave}
            disabled={skillsSaving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {skillsSaving ? 'Saving...' : 'Save Skills'}
          </Button>
        </CardFooter>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordMsg && (
            <div
              className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                passwordMsg.type === 'success'
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {passwordMsg.text}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handlePasswordChange}
            disabled={passwordSaving || !currentPassword || !newPassword}
            variant="outline"
          >
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </Button>
        </CardFooter>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Role</p>
              <p className="font-medium capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-slate-400">Member Since</p>
              <p className="font-medium">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Email Verified</p>
              <p className="font-medium">
                {profile?.emailVerified ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="text-yellow-600">Not verified</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
