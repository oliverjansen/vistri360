---
name: laravel-backend-api
description: Build, modify, debug, optimize, test, or review production-ready backend APIs in Laravel and PHP. Use for controllers, routes, Form Requests, API Resources, services/actions, Eloquent queries, SQL and indexing, authentication and authorization, queues, transactions, migrations, validation, pagination, error handling, API tests, performance investigations, and secure REST endpoint work in an existing or new Laravel repository.
---

# Laravel Backend API

## Establish context

1. Inspect repository instructions, dependency manifests, and only the files relevant to the requested endpoint.
2. Determine the Laravel and PHP versions, database engine, authentication method, test framework, and architectural conventions from repository evidence; do not re-explain standard Laravel behavior.
3. Trace only the affected path end to end: route, middleware, validation, authorization, controller, service layer, queries, response, asynchronous work, and focused tests.
4. Ask only for missing requirements that materially change the API contract or data behavior. Otherwise, state reasonable assumptions and proceed.

## Minimize token use

- Start with targeted filename and symbol searches. Avoid broad file dumps, full logs, generated files, vendor dependencies, lockfiles, and unrelated modules.
- Exclude `.env` and secret-bearing environment variants from every file listing, search, read, and bulk operation. Ensure recursive commands cannot match them.
- Read narrow line ranges around relevant symbols, then expand only when necessary. Do not repeatedly read unchanged content.
- Reuse facts already established in the conversation or repository. Keep a compact working summary for multi-step tasks.
- Inspect one representative neighboring endpoint to learn conventions; inspect more only when patterns conflict.
- Prefer focused diffs and patches over rewriting complete files. Preserve unrelated code and comments.
- Run the narrowest relevant test, formatter, static-analysis target, or query-plan check first. Broaden verification only when risk warrants it or the user requests it.
- Keep commentary and final responses concise. Do not narrate routine searches, restate the request, paste large code blocks already written to files, or explain obvious framework syntax.
- Spend additional context only for correctness, security, backward compatibility, production migrations, concurrency, or unresolved failures.

## Protect environment secrets

- Never open, scan, search, print, copy, summarize, modify, or otherwise inspect `.env` or secret-bearing variants such as `.env.local`, `.env.production`, and backup copies.
- Never use broad commands that may emit environment-file contents. Add explicit exclusions when searching the repository.
- Use `.env.example`, configuration files, deployment manifests without embedded secrets, and documented environment-variable names to understand configuration.
- Refer only to variable names, never secret values. Redact credentials, tokens, connection strings, private keys, and personal data found unexpectedly in any output.
- If completing a task requires an environment value, ask the user to configure or verify it themselves without pasting the value into chat.

## Keep repository changes local

- Never push code, commits, branches, tags, or any other changes to a remote repository.
- Never create, update, merge, or close a pull request; publish a release; or trigger a remote deployment workflow.
- Keep implementation changes in the local working tree. Preserve unrelated user changes and avoid destructive Git operations.
- Inspect Git status and diffs when useful. Create a local commit only when the user explicitly requests it, but still never push it.
- If the user asks to publish changes, stop at a verified local handoff and tell the user what they need to push themselves.

## Secure every API change

- Apply least privilege to authentication, abilities or scopes, roles, policies, and tenant boundaries. Check object-level authorization on every user-controlled resource identifier to prevent IDOR or BOLA.
- Validate type, format, length, range, enum membership, nesting depth, and allowed fields. Reject unknown or forbidden fields where practical; never pass unfiltered request data into models.
- Use parameterized Eloquent or query-builder operations. Treat raw SQL, dynamic columns, sorting, filtering, file paths, URLs, and shell arguments as untrusted input requiring strict allowlists.
- Prevent mass assignment and sensitive field mutation. Define allowed writable attributes explicitly and protect ownership, role, balance, status, and audit fields.
- Return only necessary fields through controlled resources. Do not expose secrets, tokens, password hashes, internal errors, stack traces, private identifiers, or another tenant's data.
- Apply route-specific rate limits to login, password reset, verification, search, export, upload, webhook, and expensive endpoints. Avoid account-enumeration differences in messages or timing where applicable.
- Match browser defenses to the authentication model: retain CSRF protection for cookie or session authentication, configure CORS with explicit trusted origins, and use secure cookie settings.
- Verify webhook signatures against the raw body, enforce timestamp or replay protection, compare signatures safely, and make handlers idempotent.
- Validate uploads by size, detected content type, extension, and authorization; generate server-side filenames and store untrusted files outside executable or public paths unless controlled delivery is required.
- Prevent SSRF by allowlisting destinations and blocking private, loopback, link-local, metadata, and unsafe redirect targets for user-influenced outbound requests.
- Log security-relevant events without credentials, tokens, medical information, or unnecessary personal data. Preserve auditability for sensitive state changes.
- Add negative security tests for unauthenticated access, forbidden ownership or tenant access, privilege escalation, over-posting, malformed input, rate limits, duplicate or replay requests, and sensitive-field leakage as applicable.
- Report confirmed findings separately from defense-in-depth suggestions. State impact, evidence, affected endpoint, and the smallest safe remediation; do not overstate speculative vulnerabilities.

## Preserve contracts and write reliability

- Use HTTP methods and status codes consistently with the repository's public contract. Keep validation and error responses predictable, machine-readable, and free of internal details.
- Treat response field removal, type changes, renamed enum values, pagination changes, and altered error semantics as breaking changes. Require explicit approval and a versioning or deprecation plan.
- Allowlist filters, includes, fields, and sort keys. Set bounded pagination limits and deterministic ordering so clients cannot request unbounded or unstable results.
- Make client-retried write endpoints idempotent where duplicate execution would be harmful. Scope idempotency keys correctly and persist outcomes when required.
- Enforce critical uniqueness and invariants in the database, not only application checks. Convert expected constraint conflicts into stable API responses.
- Protect concurrent updates with atomic conditional writes, row locks, version columns, or another repository-compatible strategy. Do not use a read-then-write sequence when a race can violate correctness.
- Update existing OpenAPI, API documentation, request examples, or contract tests when a public request or response changes; do not create a new documentation system unless asked.
- Add correlation IDs and narrowly scoped metrics when observability is needed, while following the secret and sensitive-data rules above.

## Implement changes

- Preserve the repository's established architecture and naming. Do not introduce a new pattern solely for preference.
- Keep controllers thin when the repository already uses actions, services, commands, or domain classes.
- Use Form Requests or the repository's equivalent for validation. Distinguish malformed input, unauthorized access, forbidden operations, missing resources, conflicts, and validation failures.
- Enforce authorization server-side with policies, gates, middleware, or the repository's established mechanism. Never rely on hidden UI controls.
- Return stable JSON shapes through API Resources or the existing response convention. Preserve backward compatibility unless the user approves a breaking change.
- Avoid mass-assignment, over-posting, unsafe raw SQL, leaked secrets, internal exception details, and unintended model serialization.
- Use database transactions for multi-write invariants. Keep external network calls outside open transactions unless atomicity explicitly requires another design.
- Make retried jobs and webhook handlers idempotent. Define retry, timeout, failure, and duplicate-processing behavior when queues are involved.
- Use safe migration patterns for populated or high-traffic tables. Flag table rewrites, long locks, destructive changes, irreversible transformations, and required deployment ordering.

## Review data access and performance

- Detect N+1 queries, unbounded result sets, unnecessary columns, repeated counts, non-sargable filters, and expensive in-memory processing.
- Use eager loading, constrained relations, selective columns, chunking, cursor or simple pagination, and aggregate queries where appropriate.
- Recommend an index only when it matches a real query's filters, joins, ordering, and selectivity. Account for the detected database engine.
- Preserve correctness before optimizing. Use query plans, timings, logs, or reproducible measurements when available rather than claiming performance gains from intuition.
- Treat caching as an explicit consistency decision. Define cache key, scope, TTL, invalidation, and tenant or user isolation.

## Test and verify

- Add or update focused feature tests for public API behavior and unit tests only where isolated domain logic benefits.
- Cover success, validation failure, unauthenticated, forbidden, not found, conflict or duplicate, ownership or tenant isolation, pagination or filtering, and important boundary cases as applicable.
- Use factories and existing test helpers. Avoid brittle assertions against unrelated fields.
- Run the smallest relevant test set first, then broader tests and formatting or static analysis available in the repository.
- Do not claim a command passed unless it was run. Report exact failures and distinguish failures caused by the change from pre-existing or environmental failures.

## Diagnose incidents

1. Reproduce the smallest failing request or test and record the endpoint, sanitized input shape, status code, exception class, message, first relevant application frame, request or correlation ID, and queue job ID when applicable.
2. Trace backward from the first relevant application frame through the affected route, validation, authorization, business logic, query, serialization, and asynchronous boundary. Read only relevant log ranges and never inspect `.env`.
3. Separate symptom, root cause, contributing conditions, blast radius, and supporting evidence. Form one testable hypothesis at a time and verify it before changing code.
4. Prefer Laravel's centralized exception handling for unexpected failures. Do not add blanket `try/catch` blocks to every function or catch `Throwable` merely to log and continue.
5. Catch only exceptions the current layer can recover from, translate into a stable domain or HTTP error, compensate for, or enrich with genuinely useful context. Catch the narrowest expected exception type.
6. When catching, preserve the original exception as the previous exception or rethrow it after contextual logging. Never silently swallow errors, return a false success, expose stack traces, or log the same exception at multiple layers.
7. Use structured, sanitized context such as operation, safe record IDs, user or tenant ID where policy permits, correlation ID, attempt number, and dependency name. Never log tokens, credentials, request bodies containing sensitive data, or unnecessary medical or personal information.
8. For external services, distinguish timeout, connection, authentication, rate-limit, validation, and server failures. Define retryability, timeouts, backoff, idempotency, and user-safe failure responses.
9. For queues, inspect attempts, timeout, failed-job state, unique or idempotency keys, serialization, and transaction timing. Let retryable failures fail so the queue can retry them; use `failed()` or the repository's equivalent for terminal handling.
10. For database errors, identify the exact operation and constraint without exposing SQL bindings. Check transaction boundaries, deadlocks, duplicate keys, null or length violations, lock timeouts, and race conditions.
11. For diagnosis-only requests, explain the cause and recommended fix without modifying code. For requested fixes, make the smallest safe change and add a regression test that fails before the fix and passes afterward.

## Deliver the result

- Lead with what changed or what caused the problem.
- List only material endpoint, contract, schema, queue, configuration, or deployment implications.
- Summarize verification and remaining risks in a compact handoff.
- Include example requests or responses only when they clarify the contract.
- Never perform production deployment, destructive data repair, credential changes, or irreversible migrations without explicit authorization.
