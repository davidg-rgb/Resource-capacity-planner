import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';
import { createOrganization } from '@/features/organizations/organization.service';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_SECRET,
    });

    switch (evt.type) {
      case 'organization.created': {
        const { id, name, slug } = evt.data;
        await createOrganization({
          clerkOrgId: id,
          name: name,
          slug: slug ?? id,
        });
        break;
      }
      // Future: organization.updated, organization.deleted, user lifecycle events
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      console.error(`Webhook handler error: ${error.code}`, error.message);
      return new Response(JSON.stringify(error.toJSON()), {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Webhook verification failed:', error);
    return new Response('Webhook verification failed', { status: 400 });
  }
}
