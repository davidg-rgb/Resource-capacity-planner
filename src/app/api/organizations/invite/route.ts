import { clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { AppError, ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('admin');

    const body = await req.json();
    const { emailAddress, role } = body as { emailAddress?: string; role?: string };

    if (!emailAddress || typeof emailAddress !== 'string') {
      throw new ValidationError('Email address is required', {
        fields: [{ field: 'emailAddress', message: 'Must be a valid email address' }],
      });
    }

    // Validate role is one of our allowed roles (default to viewer)
    const allowedRoles = ['org:viewer', 'org:planner', 'org:admin'];
    const clerkRole = role && allowedRoles.includes(role) ? role : 'org:viewer';

    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role: clerkRole,
      inviterUserId: userId,
    });

    return NextResponse.json(
      {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: 'ERR_INTERNAL', message: 'Failed to send invitation' },
      { status: 500 },
    );
  }
}
