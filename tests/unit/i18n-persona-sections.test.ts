import { describe, it, expect } from 'vitest';
import sv from '../../src/messages/sv.json';
import en from '../../src/messages/en.json';

const EXPECTED_KEYS = [
  'pm',
  'pmHome',
  'pmProjects',
  'pmWishes',
  'lineManager',
  'lmOverview',
  'lmTimeline',
  'lmApprovalQueue',
  'lmImportActuals',
  'staff',
  'staffSchedule',
  'rd',
  'rdPortfolio',
  'rdAlerts',
  'adminMain',
  'changeLog',
  'adminPeople',
  'adminProjects',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svSidebar = (sv as any).sidebar;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enSidebar = (en as any).sidebar;

describe('i18n persona sections (NAV-05)', () => {
  it('sv.json has all 18 personaSections keys', () => {
    const keys = Object.keys(svSidebar.personaSections);
    expect(keys).toEqual(expect.arrayContaining(EXPECTED_KEYS));
    expect(keys).toHaveLength(18);
  });

  it('en.json has all 18 personaSections keys', () => {
    const keys = Object.keys(enSidebar.personaSections);
    expect(keys).toEqual(expect.arrayContaining(EXPECTED_KEYS));
    expect(keys).toHaveLength(18);
  });

  it('no empty values in either locale', () => {
    for (const key of EXPECTED_KEYS) {
      expect(svSidebar.personaSections[key]).toBeTruthy();
      expect(enSidebar.personaSections[key]).toBeTruthy();
    }
  });
});
