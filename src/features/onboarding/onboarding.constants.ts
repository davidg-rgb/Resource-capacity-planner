/**
 * Pre-filled department suggestions for the onboarding wizard.
 * These are common engineering department names that help new tenants get started quickly.
 */
export const DEPARTMENT_SUGGESTIONS: string[] = [
  'Software Engineering',
  'Hardware Engineering',
  'Test & Verification',
  'Systems Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
];

/**
 * Pre-filled discipline suggestions for the onboarding wizard.
 * Each discipline has a name and abbreviation used in the resource grid.
 */
export const DISCIPLINE_SUGGESTIONS: { name: string; abbreviation: string }[] = [
  { name: 'Software', abbreviation: 'SW' },
  { name: 'Hardware', abbreviation: 'HW' },
  { name: 'Mechanical', abbreviation: 'ME' },
  { name: 'Electrical', abbreviation: 'EE' },
  { name: 'Test', abbreviation: 'TE' },
  { name: 'Systems', abbreviation: 'SYS' },
];
