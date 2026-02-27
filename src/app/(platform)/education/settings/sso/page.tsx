'use client';

/**
 * SSO Configuration Page
 *
 * Allows educational admins to configure Single Sign-On (SAML 2.0 / OIDC)
 * for their institution. Part of the education admin settings panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Key,
  Lock,
  Save,
  Shield,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SSOConfigData {
  id: string;
  protocol: 'saml' | 'oidc';
  isEnabled: boolean;
  enforceSso: boolean;
  samlEntryPoint: string | null;
  samlIssuer: string | null;
  samlCert: string | null;
  samlCallbackUrl: string | null;
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcClientSecret: string | null;
  oidcRedirectUri: string | null;
  oidcScopes: string | null;
  idpName: string | null;
  metadataUrl: string | null;
  emailAttribute: string;
  firstNameAttribute: string;
  lastNameAttribute: string;
  roleAttribute: string | null;
  defaultRole: string;
  jitProvisioning: boolean;
}

export default function SSOSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingConfig, setExistingConfig] = useState<SSOConfigData | null>(null);

  // Form state
  const [protocol, setProtocol] = useState<'saml' | 'oidc'>('saml');
  const [isEnabled, setIsEnabled] = useState(false);
  const [enforceSso, setEnforceSso] = useState(false);
  const [idpName, setIdpName] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');

  // SAML fields
  const [samlEntryPoint, setSamlEntryPoint] = useState('');
  const [samlIssuer, setSamlIssuer] = useState('');
  const [samlCert, setSamlCert] = useState('');

  // OIDC fields
  const [oidcIssuer, setOidcIssuer] = useState('');
  const [oidcClientId, setOidcClientId] = useState('');
  const [oidcClientSecret, setOidcClientSecret] = useState('');
  const [oidcScopes, setOidcScopes] = useState('openid email profile');

  // Mapping fields
  const [emailAttribute, setEmailAttribute] = useState('email');
  const [firstNameAttribute, setFirstNameAttribute] = useState('firstName');
  const [lastNameAttribute, setLastNameAttribute] = useState('lastName');
  const [roleAttribute, setRoleAttribute] = useState('');
  const [defaultRole, setDefaultRole] = useState('student');
  const [jitProvisioning, setJitProvisioning] = useState(true);

  // Auto-generated URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const samlCallbackUrl = `${baseUrl}/api/sso/saml/callback`;
  const oidcRedirectUri = `${baseUrl}/api/sso/oidc/callback`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/sso/config');
      const data = await res.json();
      if (res.ok && data.config) {
        const cfg = data.config as SSOConfigData;
        setExistingConfig(cfg);
        setProtocol(cfg.protocol);
        setIsEnabled(cfg.isEnabled);
        setEnforceSso(cfg.enforceSso);
        setIdpName(cfg.idpName || '');
        setMetadataUrl(cfg.metadataUrl || '');
        setSamlEntryPoint(cfg.samlEntryPoint || '');
        setSamlIssuer(cfg.samlIssuer || '');
        setSamlCert(cfg.samlCert === '**CONFIGURED**' ? '' : (cfg.samlCert || ''));
        setOidcIssuer(cfg.oidcIssuer || '');
        setOidcClientId(cfg.oidcClientId || '');
        setOidcScopes(cfg.oidcScopes || 'openid email profile');
        setEmailAttribute(cfg.emailAttribute || 'email');
        setFirstNameAttribute(cfg.firstNameAttribute || 'firstName');
        setLastNameAttribute(cfg.lastNameAttribute || 'lastName');
        setRoleAttribute(cfg.roleAttribute || '');
        setDefaultRole(cfg.defaultRole || 'student');
        setJitProvisioning(cfg.jitProvisioning ?? true);
      }
    } catch (err) {
      console.error('Failed to load SSO config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const payload: Record<string, unknown> = {
        protocol,
        isEnabled,
        enforceSso,
        idpName: idpName || undefined,
        metadataUrl: metadataUrl || undefined,
        emailAttribute,
        firstNameAttribute,
        lastNameAttribute,
        roleAttribute: roleAttribute || undefined,
        defaultRole,
        jitProvisioning,
      };

      if (protocol === 'saml') {
        payload.samlEntryPoint = samlEntryPoint || undefined;
        payload.samlIssuer = samlIssuer || undefined;
        payload.samlCallbackUrl = samlCallbackUrl;
        // Only send cert if the user entered a new one
        if (samlCert) {
          payload.samlCert = samlCert;
        }
      } else {
        payload.oidcIssuer = oidcIssuer || undefined;
        payload.oidcClientId = oidcClientId || undefined;
        payload.oidcRedirectUri = oidcRedirectUri;
        payload.oidcScopes = oidcScopes || 'openid email profile';
        // Only send secret if the user entered a new one
        if (oidcClientSecret) {
          payload.oidcClientSecret = oidcClientSecret;
        }
      }

      const res = await csrfFetch('/api/sso/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SSO configuration');
      }

      setMsg({ type: 'success', text: 'SSO configuration saved successfully' });
      // Clear sensitive fields after save
      setSamlCert('');
      setOidcClientSecret('');
      fetchConfig();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMsg({ type: 'success', text: 'Copied to clipboard' });
      setTimeout(() => setMsg(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <a href="/education/settings" className="text-slate-400 hover:text-teal-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Single Sign-On (SSO)
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-8">
            Configure SAML 2.0 or OIDC for your institution&apos;s identity provider
          </p>
        </div>
        <Badge
          variant="outline"
          className={isEnabled ? 'border-green-500 text-green-700' : 'border-slate-300 text-slate-500'}
        >
          {isEnabled ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Status message */}
      {msg && (
        <div
          className={`p-3 rounded-md text-sm flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {msg.text}
        </div>
      )}

      {/* Protocol Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Protocol
          </CardTitle>
          <CardDescription>
            Choose your identity provider&apos;s protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setProtocol('saml')}
              className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                protocol === 'saml'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
              }`}
            >
              <p className="font-semibold text-slate-900 dark:text-white">SAML 2.0</p>
              <p className="text-xs text-slate-500 mt-1">
                Security Assertion Markup Language. Used by Okta, Azure AD, ADFS, OneLogin, Shibboleth.
              </p>
            </button>
            <button
              onClick={() => setProtocol('oidc')}
              className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                protocol === 'oidc'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
              }`}
            >
              <p className="font-semibold text-slate-900 dark:text-white">OpenID Connect</p>
              <p className="text-xs text-slate-500 mt-1">
                OAuth 2.0 based. Used by Google Workspace, Azure AD, Okta, Auth0, Keycloak.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* IdP Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-teal-600" />
            Identity Provider Details
          </CardTitle>
          <CardDescription>
            Enter the details from your identity provider (IdP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IdP Name</Label>
              <Input
                value={idpName}
                onChange={(e) => setIdpName(e.target.value)}
                placeholder="e.g., Okta, Azure AD, Google"
              />
              <p className="text-xs text-slate-400">
                Display name shown to users on the login page
              </p>
            </div>
            <div className="space-y-2">
              <Label>Metadata URL (optional)</Label>
              <Input
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="https://idp.example.com/metadata"
              />
              <p className="text-xs text-slate-400">
                IdP metadata URL for auto-configuration
              </p>
            </div>
          </div>

          {/* SAML-specific fields */}
          {protocol === 'saml' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                SAML 2.0 Configuration
              </p>

              <div className="space-y-2">
                <Label>IdP SSO URL (Entry Point)</Label>
                <Input
                  value={samlEntryPoint}
                  onChange={(e) => setSamlEntryPoint(e.target.value)}
                  placeholder="https://idp.example.com/sso/saml"
                />
                <p className="text-xs text-slate-400">
                  The IdP&apos;s Single Sign-On URL where users are redirected
                </p>
              </div>

              <div className="space-y-2">
                <Label>SP Entity ID (Issuer)</Label>
                <Input
                  value={samlIssuer}
                  onChange={(e) => setSamlIssuer(e.target.value)}
                  placeholder="https://yourapp.com/saml/metadata"
                />
                <p className="text-xs text-slate-400">
                  Unique identifier for this service provider. Share this with your IdP.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  IdP Signing Certificate (PEM)
                  {existingConfig?.samlCert === '**CONFIGURED**' && (
                    <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                      Configured
                    </Badge>
                  )}
                </Label>
                <Textarea
                  value={samlCert}
                  onChange={(e) => setSamlCert(e.target.value)}
                  placeholder={
                    existingConfig?.samlCert === '**CONFIGURED**'
                      ? 'Certificate is configured. Paste a new one to replace it.'
                      : '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'
                  }
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-slate-400">
                  The public certificate from your IdP used to verify SAML response signatures
                </p>
              </div>

              <div className="space-y-2">
                <Label>ACS URL (Callback)</Label>
                <div className="flex items-center gap-2">
                  <Input value={samlCallbackUrl} readOnly className="bg-slate-50 dark:bg-slate-800" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(samlCallbackUrl)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Assertion Consumer Service URL. Enter this in your IdP configuration.
                </p>
              </div>
            </div>
          )}

          {/* OIDC-specific fields */}
          {protocol === 'oidc' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                OpenID Connect Configuration
              </p>

              <div className="space-y-2">
                <Label>Issuer URL</Label>
                <Input
                  value={oidcIssuer}
                  onChange={(e) => setOidcIssuer(e.target.value)}
                  placeholder="https://accounts.google.com"
                />
                <p className="text-xs text-slate-400">
                  The OIDC provider&apos;s issuer URL (used for auto-discovery)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={oidcClientId}
                  onChange={(e) => setOidcClientId(e.target.value)}
                  placeholder="your-client-id"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Client Secret
                  {existingConfig?.oidcClientSecret === '**CONFIGURED**' && (
                    <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                      Configured
                    </Badge>
                  )}
                </Label>
                <Input
                  type="password"
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                  placeholder={
                    existingConfig?.oidcClientSecret === '**CONFIGURED**'
                      ? 'Secret is configured. Enter a new one to replace it.'
                      : 'your-client-secret'
                  }
                />
                <p className="text-xs text-slate-400">
                  Client secret from your OIDC provider. Stored encrypted (AES-256-GCM).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <Input
                  value={oidcScopes}
                  onChange={(e) => setOidcScopes(e.target.value)}
                  placeholder="openid email profile"
                />
                <p className="text-xs text-slate-400">
                  Space-separated list of OIDC scopes
                </p>
              </div>

              <div className="space-y-2">
                <Label>Redirect URI</Label>
                <div className="flex items-center gap-2">
                  <Input value={oidcRedirectUri} readOnly className="bg-slate-50 dark:bg-slate-800" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(oidcRedirectUri)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Enter this redirect URI in your OIDC provider configuration.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal-600" />
            User Mapping & Provisioning
          </CardTitle>
          <CardDescription>
            Map IdP attributes to user fields and configure automatic account creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Email Attribute</Label>
              <Input
                value={emailAttribute}
                onChange={(e) => setEmailAttribute(e.target.value)}
                placeholder="email"
              />
            </div>
            <div className="space-y-2">
              <Label>First Name Attribute</Label>
              <Input
                value={firstNameAttribute}
                onChange={(e) => setFirstNameAttribute(e.target.value)}
                placeholder="firstName"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name Attribute</Label>
              <Input
                value={lastNameAttribute}
                onChange={(e) => setLastNameAttribute(e.target.value)}
                placeholder="lastName"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role Attribute (optional)</Label>
              <Input
                value={roleAttribute}
                onChange={(e) => setRoleAttribute(e.target.value)}
                placeholder="groups or role"
              />
              <p className="text-xs text-slate-400">
                Map an IdP attribute to user roles. Leave blank to use default role.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default Role</Label>
              <select
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="student">Student</option>
                <option value="educational_admin">Educational Admin</option>
              </select>
              <p className="text-xs text-slate-400">
                Role assigned to new users created via SSO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <input
              type="checkbox"
              id="jit"
              checked={jitProvisioning}
              onChange={(e) => setJitProvisioning(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="jit" className="cursor-pointer">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Just-in-Time (JIT) Provisioning
              </p>
              <p className="text-xs text-slate-500">
                Automatically create user accounts when they first log in via SSO.
                If disabled, users must be pre-created in the system.
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Enable/Enforce */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            Enable & Enforce
          </CardTitle>
          <CardDescription>
            Control SSO availability for your institution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <input
              type="checkbox"
              id="enable-sso"
              checked={isEnabled}
              onChange={(e) => {
                setIsEnabled(e.target.checked);
                if (!e.target.checked) setEnforceSso(false);
              }}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-5 w-5"
            />
            <label htmlFor="enable-sso" className="cursor-pointer flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Enable SSO
              </p>
              <p className="text-xs text-slate-500">
                Show the &quot;Sign in with {idpName || 'SSO'}&quot; button on the login page.
                Users can still use email/password.
              </p>
            </label>
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-lg border ${!isEnabled ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              id="enforce-sso"
              checked={enforceSso}
              onChange={(e) => setEnforceSso(e.target.checked)}
              disabled={!isEnabled}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-5 w-5"
            />
            <label htmlFor="enforce-sso" className="cursor-pointer flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Enforce SSO
                </p>
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-xs text-slate-500">
                Disable password login for this institution. Users MUST use SSO.
                Admins can still log in with email/password as a fallback.
              </p>
            </label>
          </div>

          {enforceSso && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Enforcing SSO will hide the password login form for all users in this institution.
                Make sure SSO is tested and working before enabling this.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Connection Info */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-teal-600" />
              Test SSO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              After saving, test your SSO configuration by opening the login URL in an incognito window:
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={
                  protocol === 'saml'
                    ? `${baseUrl}/api/sso/saml/login?tenant=YOUR_SUBDOMAIN`
                    : `${baseUrl}/api/sso/oidc/login?tenant=YOUR_SUBDOMAIN`
                }
                readOnly
                className="bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    protocol === 'saml'
                      ? `${baseUrl}/api/sso/saml/login?tenant=YOUR_SUBDOMAIN`
                      : `${baseUrl}/api/sso/oidc/login?tenant=YOUR_SUBDOMAIN`
                  )
                }
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Replace YOUR_SUBDOMAIN with your institution&apos;s subdomain.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        <Button
          className="bg-teal-600 hover:bg-teal-700 shadow-lg"
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save SSO Configuration'}
        </Button>
      </div>
    </div>
  );
}
