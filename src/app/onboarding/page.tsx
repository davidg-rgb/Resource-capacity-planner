'use client';

import { CreateOrganization, useOrganization } from '@clerk/nextjs';

import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

function LoadingSkeleton() {
  return (
    <div className="bg-surface flex min-h-screen items-center justify-center">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  );
}

export default function OnboardingPage() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) return <LoadingSkeleton />;

  if (!organization) {
    return (
      <div className="bg-surface flex min-h-screen items-center justify-center">
        <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
      </div>
    );
  }

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <OnboardingWizard />
    </div>
  );
}
