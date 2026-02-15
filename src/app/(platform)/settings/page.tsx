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
  Building2,
  Eye,
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
  companyName: string | null;
  jobTitle: string | null;
  department: string | null;
  companyDescription: string | null;
  companyWebsite: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  stockSymbol: string | null;
  isPubliclyTraded: boolean | null;
  sportsPlayed: string | null;
  activities: string | null;
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

  // Corporate fields
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [stockSymbol, setStockSymbol] = useState('');
  const [isPubliclyTraded, setIsPubliclyTraded] = useState(false);

  // Student sports/activities
  const [sportsPlayed, setSportsPlayed] = useState('');
  const [activities, setActivities] = useState('');

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
        setCompanyName(p.companyName || '');
        setJobTitle(p.jobTitle || '');
        setDepartment(p.department || '');
        setCompanyDescription(p.companyDescription || '');
        setCompanyWebsite(p.companyWebsite || '');
        setCompanySize(p.companySize || '');
        setCompanyIndustry(p.companyIndustry || '');
        setStockSymbol(p.stockSymbol || '');
        setIsPubliclyTraded(p.isPubliclyTraded || false);
        setSportsPlayed(p.sportsPlayed || '');
        setActivities(p.activities || '');

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
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
          companyDescription: companyDescription || undefined,
          companyWebsite: companyWebsite || undefined,
          companySize: companySize || undefined,
          companyIndustry: companyIndustry || undefined,
          stockSymbol: stockSymbol || undefined,
          isPubliclyTraded: isPubliclyTraded,
          sportsPlayed: sportsPlayed || undefined,
          activities: activities || undefined,
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

          {/* Corporate Partner: Company Information */}
          {profile?.role === 'corporate_partner' && (
            <>
              <Separator />
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Company Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Hiring Manager"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description</Label>
                <Textarea
                  id="companyDescription"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Describe your company..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <select
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select size...</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyIndustry">Company Industry</Label>
                <Input
                  id="companyIndustry"
                  value={companyIndustry}
                  onChange={(e) => setCompanyIndustry(e.target.value)}
                  placeholder="e.g. Technology, Finance, Healthcare"
                />
              </div>

              <Separator className="my-2" />
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Stock &amp; Public Company Info</h4>
              </div>

              <div className="flex items-center gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPubliclyTraded}
                    onChange={(e) => setIsPubliclyTraded(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">Publicly traded company</span>
                </label>
              </div>

              {isPubliclyTraded && (
                <div className="space-y-2">
                  <Label htmlFor="stockSymbol">Stock Ticker Symbol</Label>
                  <Input
                    id="stockSymbol"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL, MSFT, GOOGL"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-slate-400">
                    Students will see a link to live stock performance and news
                  </p>
                </div>
              )}
            </>
          )}

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

          {/* Student: Sports & Activities */}
          {profile?.role === 'student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sportsPlayed">Sports Played</Label>
                <Input
                  id="sportsPlayed"
                  value={sportsPlayed}
                  onChange={(e) => setSportsPlayed(e.target.value)}
                  placeholder="e.g. Basketball, Track & Field"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activities">Activities</Label>
                <Input
                  id="activities"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder="e.g. Debate Club, Student Government"
                />
              </div>
              <p className="text-xs text-slate-400">
                Adding sports and activities helps corporate partners find you
              </p>
            </>
          )}
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

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Profile Preview
          </CardTitle>
          <CardDescription>
            This is how your public profile appears to others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 space-y-4">
            {/* Name */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Your Name'}
              </h3>
              <p className="text-sm text-slate-500 capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>

            <Separator />

            {profile?.role === 'student' && (
              <div className="space-y-3 text-sm">
                {university && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">University</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{university}</p>
                  </div>
                )}
                {major && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Major</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{major}</p>
                  </div>
                )}
                {gpa && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">GPA</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{gpa}</p>
                  </div>
                )}
                {bio && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Bio</p>
                    <p className="text-slate-700 dark:text-slate-200">{bio}</p>
                  </div>
                )}
                {selectedSkillIds.size > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {allSkills
                        .filter((s) => selectedSkillIds.has(s.id))
                        .map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                {sportsPlayed && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Sports</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{sportsPlayed}</p>
                  </div>
                )}
                {activities && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Activities</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{activities}</p>
                  </div>
                )}
                {!university && !major && !gpa && !bio && selectedSkillIds.size === 0 && !sportsPlayed && !activities && (
                  <p className="text-slate-400 italic">Complete your profile to see a preview</p>
                )}
              </div>
            )}

            {profile?.role === 'corporate_partner' && (
              <div className="space-y-3 text-sm">
                {companyName && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Company</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{companyName}</p>
                  </div>
                )}
                {jobTitle && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Job Title</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{jobTitle}</p>
                  </div>
                )}
                {department && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Department</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{department}</p>
                  </div>
                )}
                {companyDescription && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Company Description</p>
                    <p className="text-slate-700 dark:text-slate-200">{companyDescription}</p>
                  </div>
                )}
                {companyWebsite && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Website</p>
                    <p className="font-medium text-teal-600">{companyWebsite}</p>
                  </div>
                )}
                {companyIndustry && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Industry</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{companyIndustry}</p>
                  </div>
                )}
                {companySize && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Company Size</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{companySize} employees</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {isPubliclyTraded ? (
                    <>
                      {stockSymbol && (
                        <Badge className="bg-blue-100 text-blue-700 border-0">
                          {stockSymbol}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        Publicly Traded
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="outline" className="border-slate-300 text-slate-600">
                      Privately Held
                    </Badge>
                  )}
                </div>
                {!companyName && !jobTitle && !department && !companyDescription && !companyWebsite && !companyIndustry && !companySize && (
                  <p className="text-slate-400 italic">Complete your company profile to see a preview</p>
                )}
              </div>
            )}

            {profile?.role !== 'student' && profile?.role !== 'corporate_partner' && (
              <div className="space-y-3 text-sm">
                {bio && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Bio</p>
                    <p className="text-slate-700 dark:text-slate-200">{bio}</p>
                  </div>
                )}
                {!bio && (
                  <p className="text-slate-400 italic">Complete your profile to see a preview</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
