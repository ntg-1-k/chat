# Security Specification - OmniLink

## Data Invariants
1. **User Profiles**: Every user must have a profile. A user can only write to their own profile. `uid` must match `request.auth.uid`.
2. **Hubs**: Hubs are public for reading. Creation is restricted to authenticated users. Only the creator (if tracked) or an admin can delete/update. In this version, we'll allow authenticated creations and lock down updates.
3. **Messages**: Messages must belong to a valid hub. The `senderId` must match `request.auth.uid`.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Create a message with `senderId: "attacker_id"`.
2. **Profile Hijacking**: Update `users/target_user_id` with `email: "attacker@malicious.com"`.
3. **Shadow Field Injection**: Create a hub with an extra field `isSystem: true`.
4. **ID Poisoning**: Request `hubs/VERY_LONG_ID_WITH_JUNK_CHARACTERS`.
5. **PII Leak**: Non-admin user tries to `list` the entire `users` collection (we'll restrict `list` to self-reads or specific patterns if needed).
6. **Relational Orphan**: Create a message in a non-existent hub `hubs/ghost_hub/messages/msg1`.
7. **Timestamp Fraud**: Send a message with `timestamp: 0`.
8. **Resource Exhaustion**: Send a 1MB string in a message `content` field.
9. **State Shortcutting**: Change a hub name after creation (we'll make it immutable or restricted).
10. **Query Scrapping**: `list` hubs without a limit or filter (we'll enforce rules that require specific queries if necessary).
11. **Admin Escalation**: User tries to write to a hypothetical `admins` collection.
12. **Unverified Auth**: Accessing resources with `email_verified: false` (conditional).

## Test Runner Plan
We will use `@firebase/rules-unit-testing` or similar concepts in our logic. For now, we will verify via rules deployment and ESLint.
