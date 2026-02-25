'use client';

/**
 * Login Form Component
 *
 * Email + password login with error handling and loading state.
 * Integrates with MFA challenge when the user has MFA enabled.
 * Shows SSO button when the tenant has SSO configured.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MFAChallenge } from './mfa-challenge';

interface LoginUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
}

interface SSOInfo {
  protocol: 'saml' | 'oidc';
  enforceSso: boolean;
  idpName: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA challenge state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaUser, setMfaUser] = useState<LoginUser | null>(null);

  // SSO state
  const [ssoInfo, setSsoInfo] = useState<SSOInfo | null>(null);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [tenant, setTenant] = useState<string | null>(null);

  // Check for SSO error from callback redirect
  useEffect(() => {
    const ssoError = searchParams.get('error');
    if (ssoError === 'sso_failed') {
      const desc = searchParams.get('error_description');
      setError(desc || 'SSO authentication failed. Please try again.');
    } else if (ssoError === 'not_provisioned') {
      setError('Your account has not been provisioned. Please contact your administrator.');
    }
  }, [searchParams]);

  // Detect tenant from URL (subdomain or query param)
  useEffect(() => {
    let detectedTenant: string | null = null;

    // Check query param first
    detectedTenant = searchParams.get('tenant');

    // Try to detect from hostname subdomain
    if (!detectedTenant && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // If hostname is like "holycross.proveground.com" => subdomain is "holycross"
      if (parts.length >= 3 && parts[0] !== 'www') {
        detectedTenant = parts[0];
      }
    }

    setTenant(detectedTenant);

    // Fetch SSO info for the detected tenant
    if (detectedTenant) {
      fetch(`/api/sso/info?tenant=${encodeURIComponent(detectedTenant)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.sso) {
            setSsoInfo(data.sso);
          }
        })
        .catch(() => {
          // Silently fail — SSO is optional
        })
        .finally(() => setSsoLoading(false));
    } else {
      setSsoLoading(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Check if MFA is required
      if (data.requiresMFA) {
        setMfaUser(data.user);
        setShowMFA(true);
        return;
      }

      // Redirect based on role
      const dashboardRoutes: Record<string, string> = {
        admin: '/admin',
        student: '/dashboard',
        corporate_partner: '/corporate',
        educational_admin: '/education',
      };

      const dashboardPath = dashboardRoutes[data.user.role] || '/dashboard';

      // If the user belongs to a different tenant, redirect to that tenant's subdomain
      if (data.tenantSubdomain && typeof window !== 'undefined') {
        const currentHost = window.location.hostname;

        // Platform domains where the first segment is NOT a tenant subdomain
        // Must match PLATFORM_DOMAINS in src/lib/tenant/resolve.ts
        const PLATFORM_DOMAINS = [
          'localhost',
          'herokuapp.com',
          'street2ivy.com',
          'proveground.com',
          'vercel.app',
        ];

        // Determine if the current host is on a platform domain
        // e.g., "street2ivy-dev-c54ffcb26038.herokuapp.com" → platform domain "herokuapp.com"
        //       "proveground.com" → platform domain "proveground.com"
        //       "holy-cross-pilot.proveground.com" → tenant subdomain on "proveground.com"
        const findBaseDomain = (host: string): { baseDomain: string; currentSubdomain: string | null } => {
          const hostNoPort = host.split(':')[0];

          for (const pd of PLATFORM_DOMAINS) {
            // Exact match (e.g., "proveground.com" or "localhost")
            if (hostNoPort === pd || hostNoPort === `www.${pd}`) {
              return { baseDomain: hostNoPort, currentSubdomain: null };
            }
            // Ends with platform domain (e.g., "xyz.herokuapp.com" or "holy-cross-pilot.proveground.com")
            if (hostNoPort.endsWith(`.${pd}`)) {
              const prefix = hostNoPort.slice(0, -(pd.length + 1)); // everything before ".herokuapp.com"
              const prefixParts = prefix.split('.');
              // If the prefix itself has dots, the first segment might be a tenant subdomain
              // e.g., "holy-cross-pilot.proveground.com" → prefix="holy-cross-pilot", baseDomain="proveground.com"
              // e.g., "street2ivy-dev-c54ffcb26038.herokuapp.com" → prefix="street2ivy-dev-c54ffcb26038", baseDomain="street2ivy-dev-c54ffcb26038.herokuapp.com" (app name, not tenant)
              if (pd === 'herokuapp.com' || pd === 'vercel.app') {
                // On Heroku/Vercel, the first segment is the app name, not a tenant
                // Tenant subdomains go in front: "holy-cross-pilot.street2ivy-dev-xxx.herokuapp.com"
                return { baseDomain: hostNoPort, currentSubdomain: null };
              }
              // On custom domains (proveground.com, street2ivy.com), first segment IS the tenant
              if (prefixParts.length === 1 && prefixParts[0] !== 'www') {
                return { baseDomain: pd, currentSubdomain: prefixParts[0] };
              }
              return { baseDomain: hostNoPort, currentSubdomain: null };
            }
          }

          // Unknown domain — fallback to simple subdomain detection
          const parts = hostNoPort.split('.');
          if (parts.length >= 3 && parts[0] !== 'www') {
            return { baseDomain: parts.slice(1).join('.'), currentSubdomain: parts[0] };
          }
          return { baseDomain: hostNoPort, currentSubdomain: null };
        };

        const { baseDomain, currentSubdomain } = findBaseDomain(currentHost);

        // Only redirect if logging in from the main site (no subdomain)
        // or from a different tenant's subdomain
        if (!currentSubdomain || currentSubdomain !== data.tenantSubdomain) {
          const protocol = window.location.protocol;
          const port = window.location.port ? `:${window.location.port}` : '';
          window.location.href = `${protocol}//${data.tenantSubdomain}.${baseDomain}${port}${dashboardPath}`;
          return;
        }
      }

      router.push(dashboardPath);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = () => {
    if (!tenant || !ssoInfo) return;
    const ssoUrl =
      ssoInfo.protocol === 'saml'
        ? `/api/sso/saml/login?tenant=${encodeURIComponent(tenant)}`
        : `/api/sso/oidc/login?tenant=${encodeURIComponent(tenant)}`;
    window.location.href = ssoUrl;
  };

  // Show MFA challenge if needed
  if (showMFA && mfaUser) {
    return (
      <MFAChallenge
        user={mfaUser}
        onBack={() => {
          setShowMFA(false);
          setMfaUser(null);
          setPassword('');
        }}
      />
    );
  }

  const showPasswordForm = !ssoInfo?.enforceSso;
  const showSSOButton = ssoInfo && !ssoLoading;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          {ssoInfo?.enforceSso
            ? `Sign in with your ${ssoInfo.idpName} account`
            : 'Enter your email and password to access your account'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}

        {/* SSO Button */}
        {showSSOButton && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-2 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={handleSSOLogin}
            >
              <svg
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Sign in with {ssoInfo.idpName}
            </Button>

            {showPasswordForm && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">
                    Or continue with email
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Password form (hidden when SSO is enforced) */}
        {showPasswordForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus={!showSSOButton}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        {showPasswordForm && (
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
            >
              Sign Up
            </Link>
          </p>
        )}

        {ssoInfo?.enforceSso && (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            Your institution requires SSO authentication.
            Contact your IT department for access.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
