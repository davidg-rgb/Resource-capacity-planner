import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ConflictError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

const DEFAULT_DISCIPLINES = [
  { name: 'Software', abbreviation: 'SW' },
  { name: 'Mechanical', abbreviation: 'ME' },
  { name: 'Electronics', abbreviation: 'EL' },
  { name: 'Test', abbreviation: 'TE' },
  { name: 'Systems', abbreviation: 'SY' },
  { name: 'Hardware', abbreviation: 'HW' },
];

const DEFAULT_DEPARTMENTS = [
  { name: 'Engineering' },
  { name: 'Product' },
  { name: 'Operations' },
];

export async function createOrganization(data: {
  clerkOrgId: string;
  name: string;
  slug: string;
}) {
  // Check for duplicate clerkOrgId
  const existing = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.clerkOrgId, data.clerkOrgId))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('Organization already exists', {
      conflictType: 'duplicate',
      field: 'clerkOrgId',
      value: data.clerkOrgId,
    });
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({
      clerkOrgId: data.clerkOrgId,
      name: data.name,
      slug: data.slug,
    })
    .returning();

  await seedDefaults(org.id);
  return org;
}

export async function seedDefaults(orgId: string) {
  const tenant = withTenant(orgId);

  await Promise.all(
    DEFAULT_DISCIPLINES.map((d) =>
      tenant.insertDiscipline({ name: d.name, abbreviation: d.abbreviation }),
    ),
  );

  await Promise.all(
    DEFAULT_DEPARTMENTS.map((d) => tenant.insertDepartment({ name: d.name })),
  );
}
