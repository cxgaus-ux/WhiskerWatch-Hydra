# Security Specification — WhiskerWatch Hydra

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched is denied for all `read` and `write` operations.
2. **Verified Identity Invariant**: Every write operation (`create`, `update`, `delete`) across `/cats/{catId}`, `/sightings/{sightingId}`, and `/stations/{stationId}` requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Owner Binding & Immutability**: Every document in `/cats`, `/sightings`, and `/stations` must set `ownerId == request.auth.uid` on creation, and `ownerId` + `createdAt` must remain strictly immutable across all updates.
4. **Relational Parent Integrity on Sightings**: A `SightingLog` document in `/sightings/{sightingId}` can only be created if the referenced `/cats/$(incoming().catId)` document exists AND belongs to the user (`get(...).data.ownerId == request.auth.uid` or `isAdmin()`).
5. **Query Enforcer (Secure List Queries)**: `allow list` on `/cats`, `/sightings`, and `/stations` is strictly restricted to `isSignedIn() && (resource.data.ownerId == request.auth.uid || isAdmin())`. No blanket `isSignedIn()` reads or client-delegated filtering are allowed.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on both `create` and `update`.
7. **Strict Key & Size Enforcement**: Every entity validation helper enforces `hasAll` and `hasOnly` on document keys, string `.size()` boundaries matching `firebase-blueprint.json`, regex validation on IDs, and allowed enum values.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a `CatProfile` in `/cats/cat_1`. -> `PERMISSION_DENIED`
2. **Owner Spoofing on Create**: User `uid_alice` attempts to create `/cats/cat_1` with `ownerId: "uid_bob"`. -> `PERMISSION_DENIED`
3. **Shadow Field Injection on Create**: User sends a valid `CatProfile` payload plus an undeclared field `"isVerified": true`. -> `PERMISSION_DENIED`
4. **Oversized String Resource Exhaustion (Denial of Wallet)**: User sends `markingsDescription` with 5,000 characters (limit is 600). -> `PERMISSION_DENIED`
5. **ID Poisoning Attack**: User attempts to create a cat document with invalid ID characters `/cats/cat$bad!id`. -> `PERMISSION_DENIED`
6. **Client Timestamp Forgery**: User attempts to create `/cats/cat_1` with a forged past timestamp `createdAt != request.time`. -> `PERMISSION_DENIED`
7. **Immutable Field Mutation on Update**: Owner attempts to update `ownerId` or `createdAt` on `/cats/cat_1`. -> `PERMISSION_DENIED`
8. **Update-Gap Value Poisoning**: Owner updates allowed key `healthStatus` on `/cats/cat_1` to `"SuperHealthy"` (outside enum) or an integer `123`. -> `PERMISSION_DENIED`
9. **Orphaned Sighting Creation**: User attempts to create `/sightings/sight_1` referencing a non-existent `catId: "non_existent_cat"`. -> `PERMISSION_DENIED`
10. **Cross-Tenant Sighting Injection**: User `uid_attacker` attempts to create a sighting referencing `catId` owned by `uid_victim`. -> `PERMISSION_DENIED`
11. **Unauthorized List Scraping**: User `uid_attacker` executes an unconstrained `list` query on `/cats` without filtering by `ownerId == request.auth.uid`. -> `PERMISSION_DENIED`
12. **Self-Assigned Admin Escalation**: Regular user `uid_attacker` attempts to write a document to `/admins/uid_attacker`. -> `PERMISSION_DENIED`
