/**
 * Security Rules Verification Suite for WhiskerWatch Hydra
 * Verifies that all Dirty Dozen adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Write',
    collection: '/cats/cat_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { email_verified: false }
  },
  {
    id: 2,
    name: 'Owner Spoofing on Create',
    collection: '/cats/cat_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { ownerId: 'uid_spoofed_other' }
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Create',
    collection: '/cats/cat_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { isVerified: true }
  },
  {
    id: 4,
    name: 'Oversized String Resource Exhaustion',
    collection: '/cats/cat_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { markingsDescription: 'A'.repeat(5000) }
  },
  {
    id: 5,
    name: 'ID Poisoning Attack',
    collection: '/cats/invalid$id!',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Client Timestamp Forgery',
    collection: '/cats/cat_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { createdAt: '2020-01-01T00:00:00Z' }
  },
  {
    id: 7,
    name: 'Immutable Field Mutation on Update',
    collection: '/cats/cat_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { ownerId: 'uid_new_owner' }
  },
  {
    id: 8,
    name: 'Update-Gap Value Poisoning',
    collection: '/cats/cat_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { healthStatus: 'INVALID_STATUS' }
  },
  {
    id: 9,
    name: 'Orphaned Sighting Creation',
    collection: '/sightings/sight_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { catId: 'non_existent_cat_id' }
  },
  {
    id: 10,
    name: 'Cross-Tenant Sighting Injection',
    collection: '/sightings/sight_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { catId: 'cat_owned_by_other_user' }
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping',
    collection: '/cats',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    collection: '/admins/uid_attacker',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { uid: 'uid_attacker', role: 'admin' }
  }
];
