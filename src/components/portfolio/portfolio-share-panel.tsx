'use client';

/**
 * Portfolio Share Panel Component
 *
 * Sharing and preview tools for the portfolio:
 * - Copy portfolio URL to clipboard
 * - Share to LinkedIn
 * - View count stat
 * - QR code placeholder
 * - Handshake integration tip
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Copy,
  Check,
  Linkedin,
  Eye,
  ExternalLink,
  QrCode,
  Info,
} from 'lucide-react';

interface PortfolioSharePanelProps {
  slug: string;
  headline: string;
  viewCount: number;
}

export function PortfolioSharePanel({
  slug,
  headline,
  viewCount,
}: PortfolioSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [showHandshakeTip, setShowHandshakeTip] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || 'https://proveground.com'
  );

  // Use the actual browser origin so preview URLs work in any deployment
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const portfolioUrl = `${baseUrl}/portfolio/${slug}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    portfolioUrl
  )}&title=${encodeURIComponent(headline + ' - Proveground Portfolio')}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.querySelector<HTMLInputElement>(
        '#portfolio-url-input'
      );
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleLinkedIn = () => {
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePreview = () => {
    window.open(portfolioUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* View Count */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2 dark:bg-blue-950">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {viewCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Portfolio views
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              id="portfolio-url-input"
              value={portfolioUrl}
              readOnly
              className="text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={handlePreview}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview Portfolio
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleLinkedIn}>
              <Linkedin className="h-4 w-4 mr-2" />
              Share to LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8">
            <div className="text-center space-y-2">
              <QrCode className="h-16 w-16 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-mono text-muted-foreground break-all max-w-[250px]">
                {portfolioUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                QR code generation coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handshake Tip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Add to Handshake
            <button
              type="button"
              onClick={() => setShowHandshakeTip(!showHandshakeTip)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="How to add to Handshake"
            >
              <Info className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showHandshakeTip ? (
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium text-slate-900 dark:text-white">
                How to add your portfolio to Handshake:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Log in to your Handshake account</li>
                <li>Go to your Profile settings</li>
                <li>
                  Find the &quot;Links&quot; or &quot;Portfolio&quot; section
                </li>
                <li>Paste your portfolio URL:</li>
              </ol>
              <Input
                value={portfolioUrl}
                readOnly
                className="text-xs bg-background mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Employers browsing Handshake will see a direct link to your
                Proveground portfolio.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Link your Proveground portfolio on Handshake to stand out to
              employers. Click the info icon above for instructions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
