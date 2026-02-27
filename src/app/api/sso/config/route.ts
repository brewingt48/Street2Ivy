/**
 * GET/PUT /api/sso/config
 *
 * SSO Configuration management for educational admins.
 * GET: Return SSO config for the current tenant
 * PUT: Update SSO config (educational_admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentSession } from '@/lib/auth/middleware';
import { getTenantSSOConfig, upsertSSOConfig } from '@/lib/auth/sso';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function GET() {
  try {
    const session = await requireRole('educational_admin', 'admin');
    const tenantId = session.data.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with this account' },
        { status: 400 }
      );
    }

    const config = await getTenantSSOConfig(tenantId);

    if (!config) {
      return NextResponse.json({
        config: null,
        message: 'No SSO configuration found for this tenant',
      });
    }

    // Redact sensitive fields for the response
    return NextResponse.json({
      config: {
        id: config.id,
        tenantId: config.tenantId,
        protocol: config.protocol,
        isEnabled: config.isEnabled,
        enforceSso: config.enforceSso,
        samlEntryPoint: config.samlEntryPoint,
        samlIssuer: config.samlIssuer,
        samlCert: config.samlCert ? '**CONFIGURED**' : null,
        samlCallbackUrl: config.samlCallbackUrl,
        oidcIssuer: config.oidcIssuer,
        oidcClientId: config.oidcClientId,
        oidcClientSecret: config.oidcClientSecret ? '**CONFIGURED**' : null,
        oidcRedirectUri: config.oidcRedirectUri,
        oidcScopes: config.oidcScopes,
        idpName: config.idpName,
        metadataUrl: config.metadataUrl,
        emailAttribute: config.emailAttribute,
        firstNameAttribute: config.firstNameAttribute,
        lastNameAttribute: config.lastNameAttribute,
        roleAttribute: config.roleAttribute,
        defaultRole: config.defaultRole,
        jitProvisioning: config.jitProvisioning,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('SSO config GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('educational_admin', 'admin');
    const tenantId = session.data.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with this account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ip, userAgent } = extractRequestInfo(request);

    // Validate protocol
    if (!body.protocol || !['saml', 'oidc'].includes(body.protocol)) {
      return NextResponse.json(
        { error: 'Invalid protocol. Must be "saml" or "oidc".' },
        { status: 400 }
      );
    }

    // Validate SAML config if enabling
    if (body.protocol === 'saml' && body.isEnabled) {
      if (!body.samlEntryPoint || !body.samlIssuer || !body.samlCert) {
        return NextResponse.json(
          { error: 'SAML requires entry point URL, issuer, and IdP certificate' },
          { status: 400 }
        );
      }
    }

    // Validate OIDC config if enabling
    if (body.protocol === 'oidc' && body.isEnabled) {
      if (!body.oidcIssuer || !body.oidcClientId) {
        return NextResponse.json(
          { error: 'OIDC requires issuer URL and client ID' },
          { status: 400 }
        );
      }
    }

    const config = await upsertSSOConfig(tenantId, {
      protocol: body.protocol,
      isEnabled: body.isEnabled,
      enforceSso: body.enforceSso,
      samlEntryPoint: body.samlEntryPoint,
      samlIssuer: body.samlIssuer,
      samlCert: body.samlCert,
      samlCallbackUrl: body.samlCallbackUrl,
      oidcIssuer: body.oidcIssuer,
      oidcClientId: body.oidcClientId,
      oidcClientSecret: body.oidcClientSecret,
      oidcRedirectUri: body.oidcRedirectUri,
      oidcScopes: body.oidcScopes,
      idpName: body.idpName,
      metadataUrl: body.metadataUrl,
      emailAttribute: body.emailAttribute,
      firstNameAttribute: body.firstNameAttribute,
      lastNameAttribute: body.lastNameAttribute,
      roleAttribute: body.roleAttribute,
      defaultRole: body.defaultRole,
      jitProvisioning: body.jitProvisioning,
    });

    // Audit log
    await auditLog('ADMIN_ACTION', {
      userId: session.data.userId,
      email: session.data.email,
      ip,
      userAgent,
      path: '/api/sso/config',
      resource: 'sso_config',
      resourceId: config.id,
      details: {
        action: 'sso_config_updated',
        protocol: body.protocol,
        isEnabled: body.isEnabled,
        enforceSso: body.enforceSso,
      },
    });

    return NextResponse.json({
      config: {
        id: config.id,
        protocol: config.protocol,
        isEnabled: config.isEnabled,
        enforceSso: config.enforceSso,
        idpName: config.idpName,
      },
      message: 'SSO configuration updated successfully',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('SSO config PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
