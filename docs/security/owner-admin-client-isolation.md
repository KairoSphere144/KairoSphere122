# Access control and client-isolation model

**Status:** Architecture proposal for review. This document does not claim that the controls below are implemented or deployed.

## 1. Authority model

KairoSphere has one platform owner: the human operator. The owner's master-administrator identity is the only identity allowed to access the cross-client administration plane, including the complete client directory, platform configuration, internal file index, privileged diagnostics, and system-wide administration.

Client users are not platform administrators. Each client identity is bound to an explicitly provisioned organization/workspace and may access only records and files belonging to that workspace, plus records explicitly shared with that identity.

Do not implement owner authority as a hidden route, obscure UI control, hard-coded email check in browser code, or user-editable profile field.

## 2. Access classes

| Class | Permitted scope | Explicitly excluded |
|---|---|---|
| Platform owner | Cross-organization administration, client directory, platform configuration, internal file index, audit review | No bypass of external law, provider controls, or explicit human approval gates |
| Client member | Own organization records and explicitly shared files/actions | Other clients, platform configuration, internal filetree, other tenants' records |
| Task-scoped automation | Only approved code, sanitized diagnostics, and narrowly scoped task inputs/outputs | Master credentials, full client directory, raw client documents, unrestricted database/storage access |
| Unauthenticated visitor | Public marketing/documentation surfaces only, if enabled | All operational data and private storage |

A client workspace must not expose the platform owner's internal operating records or other clients' existence/details.

## 3. Authorization enforcement

Enforce authorization on the server and data plane. UI visibility is convenience, never a security boundary.

- Keep organization membership and role assignments in protected database records. Do not use user-editable Auth metadata for authorization.
- Use explicit, least-privilege role and membership checks for every read, write, export, file download, and administrative action.
- Apply tenant predicates to every organization-owned table through RLS and organization-aware foreign keys. Validate both row visibility and update checks.
- The owner-wide administrative capability must be represented by a protected, server-controlled assignment that client users cannot create, edit, or self-promote into.
- Do not grant service-role or Supabase secret keys to browser code, clients, or the bridge.
- Avoid privileged database functions as shortcuts. Any genuinely necessary privileged function must be narrowly scoped, kept out of exposed schemas where possible, check the authenticated actor, and have explicit execute grants.
- Protect views with invoker security where supported, or keep them inaccessible to client API roles and expose a separately authorized interface.
- Private Storage buckets must be private by default. Object paths must be tenant-scoped and storage policies must independently verify membership and operation scope.
- Cross-tenant owner operations should use a narrowly scoped server-side administrative interface, not broad client-side queries with a bypass flag.

## 4. Private filetree and records

Separate at least these logical areas:

1. **Platform-internal:** operating procedures, system configuration, private development notes, internal client index and administrative evidence. Owner only.
2. **Client workspace:** each tenant's documents, supplier/client records, evidence and exports. Accessible only to that tenant's authorized members and the owner.
3. **Automation workspace:** temporary, task-specific, sanitized inputs and outputs with explicit expiry and audit metadata. No implicit access to either private area.

Store file metadata with tenant/workspace ID, object key, uploader, classification, source, checksum, created time, retention state and access policy. Do not place confidential client files, credentials, environment files, private keys, or production exports in either public Git repository.

## 5. Audit and accountability

Record security-relevant events: authentication/session changes where available, membership and role changes, privileged reads/exports, file access, policy denials, administrative actions, and data lifecycle changes. Include actor, action, target, tenant scope, timestamp, outcome and correlation ID. Avoid logging secrets or unnecessary document contents.

Audit records must not be editable by ordinary client users. Retention and export access require a defined policy.

## 6. Bootstrap and recovery

- Provision the first platform-owner assignment through a controlled, documented administrative bootstrap; never through public signup or a client-editable profile.
- Require strong authentication and MFA for the owner where the provider supports it.
- Keep recovery procedures independent of ordinary client membership.
- Role changes, owner reassignment, disabling the owner, and recovery-factor changes require explicit owner approval and a verified recovery path.
- Do not silently create a second platform owner.

## 7. Required negative and positive tests

Before enabling client access, test against the actual database policies and storage rules:

- Owner can list and administer multiple client workspaces.
- Client A can read/write only its own authorized records and files.
- Client A cannot enumerate, read, update, delete, export, or download Client B data, even with guessed UUIDs or object keys.
- Client users cannot access platform-internal records or system administration endpoints.
- Client users cannot self-assign owner/admin roles by changing profile metadata or request payloads.
- Cross-tenant foreign-key substitutions and update-based tenant reassignment are rejected.
- Unauthenticated users cannot access operational tables or private files.
- Task-scoped automation cannot query unrestricted client tables or private storage.
- Revoked membership and expired sessions cease to authorize new operations.
- Tests cover views, RPC/functions, Storage, exports and background jobs, not just the visible UI.

## 8. Delivery sequence

1. Inventory current Auth, organization membership, RLS policies, views/functions, Storage buckets and tests. Do not duplicate the existing organization model.
2. Map each existing table and object class to owner, tenant-member, automation or public access.
3. Identify policy gaps and add a least-privilege migration with positive and negative tests.
4. Implement owner-only administration and client workspace UI after backend enforcement is proven.
5. Add private file storage and audited, expiring, task-scoped automation access.
6. Verify the complete model in a non-production environment before any production migration or deployment.

## 9. Boundaries

This is an architecture and implementation contract, not a legal privacy certification or proof of current security. Do not store real client data until tenant isolation, private storage, backup/recovery and access tests pass. Production migrations, owner-account changes, repository visibility changes, credential rotation and deployment remain explicit approval gates.
