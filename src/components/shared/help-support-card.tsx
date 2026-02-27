'use client';

/**
 * Help & Support Card
 *
 * Reusable card that fetches and displays support/contact information
 * from the platform support settings API. Designed to be embedded
 * in multiple dashboard pages.
 */

import { useEffect, useState } from 'react';
import { HelpCircle, Mail, Phone, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SupportSettings {
  supportEmail: string;
  supportPhone: string;
  officeHours: string;
  helpCenterUrl: string;
  supportMessage: string;
}

export function HelpSupportCard() {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/support-settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
        }
      } catch {
        // Silently handle — the fallback message will display
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const hasAnySettings =
    settings &&
    (settings.supportEmail ||
      settings.supportPhone ||
      settings.officeHours ||
      settings.helpCenterUrl ||
      settings.supportMessage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5 text-teal-600" />
          Help & Support
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !hasAnySettings ? (
          <p className="text-sm text-muted-foreground">
            Need help? Contact your system administrator to configure support
            information.
          </p>
        ) : (
          <div className="space-y-4">
            {settings.supportMessage && (
              <p className="text-sm text-muted-foreground">
                {settings.supportMessage}
              </p>
            )}

            <div className="space-y-3">
              {settings.supportEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-teal-600" />
                  <a
                    href={`mailto:${settings.supportEmail}`}
                    className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
                  >
                    {settings.supportEmail}
                  </a>
                </div>
              )}

              {settings.supportPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-teal-600" />
                  <a
                    href={`tel:${settings.supportPhone}`}
                    className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
                  >
                    {settings.supportPhone}
                  </a>
                </div>
              )}

              {settings.officeHours && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="text-muted-foreground">
                    {settings.officeHours}
                  </span>
                </div>
              )}

              {settings.helpCenterUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 shrink-0 text-teal-600" />
                  <a
                    href={settings.helpCenterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
                  >
                    Help Center
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
