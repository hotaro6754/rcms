# Security review

Internal engineering review of the platform as built on branch `ccr-b00f5748-k3unfe`. It
records the controls in place, the evidence for each, defects found and fixed during the work,
and the risks that remain. It is **not** a penetration test, a compliance assessment or a
certification. Nothing here claims HIPAA, PCI DSS, SOC 2, ISO 27001 or DPDP Act compliance.

## 1. Scope and assumptions

- In scope: authentication, authorisation, the CMS, assessments, learner data, commerce,
  support, vendors, corporate accounts, files, audit, configuration.
- The platform is a **training** product. It must never hold protected health information
  (PHI) or real claim data. Controls below *reduce* the chance of PHI being entered; they do
  not make the platform suitable for PHI.
- Card data never touches the platform: payments use Razorpay's hosted checkout. The platform
  stores provider order/payment/refund identifiers, amounts and method names only.
- Hosting, TLS termination, database backups and infrastructure hardening belong to the
  deployment and were not reviewed.

## 2. Controls

### Authentication and sessions
| Control | Implementation | Evidence |
|---|---|---|
| Verified email before sign-in | Better Auth `requireEmailVerification`; account `PENDING_VERIFICATION` → `ACTIVE` on verification | security test |
| Password policy | 10+ characters (length over complexity), hashed by Better Auth (scrypt) | config |
| Lockout | 5 consecutive failures → 15-minute lock (configurable), audited | security test |
| Rate limits | Database-backed per-endpoint limits on sign-in, sign-up, reset, verification and 2FA verify | config |
| Two-step verification | TOTP + single-use backup codes; required for staff in production (`ADMIN_MFA_REQUIRED`); staff cannot disable it while required | admin layout, auth hook |
| Session lifetime | 7 days, refreshed daily; sensitive changes need a session under 15 minutes old (`freshAge`) | config |
| Blocked accounts | Suspended, deactivated and archived accounts cannot open a session; suspension and offboarding delete sessions | security, people, vendors tests |
| Cookies | `httpOnly`, `SameSite=Lax`, `Secure` in production, prefixed | config |
| No public admin registration | Admins come from `npm run admin:bootstrap` (refuses if one exists) or `OWNER_EMAILS` on first run only; afterwards only approved role changes | security test |
| Privilege fields not client-writable | `role`, `status`, `twoFactorEnabled` ignored at sign-up and profile update | security test, browser check |

### Authorisation
| Control | Implementation | Evidence |
|---|---|---|
| Server-side, per action | `assertCan` inside every mutating service; pages use `requirePagePermission`; API routes check explicitly | cms, security, vendors, people tests |
| Least privilege by role | 12 roles, 64 permissions; e.g. content authors cannot publish, finance cannot approve vendor payments, auditors cannot write | unit tests |
| Separation of duties | Reviewer ≠ submitter; compliance ≠ academic approver; requester ≠ approver for every approval; grader ≠ learner; invoice validator ≠ payment approver ≠ payer; payout-change requester/approver cannot approve that vendor's payments | cms, learning, commerce, vendors tests |
| Object-level checks | Learners reach only their own attempts, orders, tickets and files; vendors only their own vendor; corporate managers only their own organisation | learning, commerce, vendors, people tests |
| Staff accounts protected from learner administration | Subscriber admins cannot change status or reset authentication of staff/vendor accounts | people test (found as a defect, see §3) |
| Refusals audited | `deny` audit rows with the permission and target | cms, vendors tests |

### Input, output and files
| Control | Implementation |
|---|---|
| Validation | Zod schemas at every service boundary; error sentences returned, stack traces never |
| Stored XSS | Authored content is restricted Markdown rendered by a custom renderer with no raw HTML and a link-scheme allow-list; React escaping elsewhere |
| Embeds | Video blocks accept only listed providers and are rewritten to their embed URLs |
| Uploads | Content sniffed from magic bytes; per-area allow-lists; 25 MB (5 MB images); stored outside `public/`; served through access-checked routes with `nosniff` and attachment disposition |
| CSV injection | Export cells starting with `= + - @` are neutralised |
| Open redirects | Post-sign-in `next` accepts same-site paths only |
| Security headers | CSP (`frame-ancestors 'none'`, `object-src 'none'`, allow-listed script/frame hosts), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production |

### Payments
| Control | Implementation | Evidence |
|---|---|---|
| Never paid on redirect | One fulfilment path, after verified checkout signature + server fetch, or verified webhook | commerce test |
| Webhook authenticity | HMAC-SHA256 over the raw body, constant-time compare; bad signatures refused and audited | commerce test |
| Replay / duplicates | `WebhookEvent` unique on provider event id; fulfilment idempotent | commerce test |
| Amount tampering | Paid amount must equal the order; mismatch → reconciliation exception, no access | commerce test |
| Refund abuse | Policy checks, two-person approval, Academy Director for exceptions, provider idempotency key | commerce test |

### Privacy and data handling
| Control | Implementation |
|---|---|
| PHI screening | Authored content is refused if it contains card numbers (Luhn), SSNs, Medicare MBIs, dates of birth or long identifiers; support messages and notes are masked; warnings at every input |
| Minimum data in exports | Subscriber export omits phone and IP; large exports need approval |
| Masking | Phone numbers and sign-in IPs hidden from staff without `subscriber.view_sensitive`; sensitive views audited |
| Consent | Terms, privacy and marketing consent recorded with version and time |
| Data subject requests | Access (JSON export, audited), correction, deletion (anonymisation, certificates revoked) |
| Logs | Audit diffs redact secrets and card-like numbers; email bodies (which contain sign-in links) are printed only in local development |

### Audit
Append-only `AuditLog` enforced by a database trigger; actor, effective roles, outcome,
redacted before/after, IP and user agent where available. Viewable and filterable by Auditor,
Academy Director and Super Administrator. Evidence: cms test ("the trail cannot be edited").

## 3. Defects found and fixed during this work

| Ref | Defect | Severity | Fix |
|---|---|---|---|
| D1 | Deleting a lesson could cascade-delete learners' quiz attempts | High | Restrict FKs; delete only without learner history, otherwise archive |
| D2 | Deleting a question orphaned stored answers | Medium | Questions with attempts are archived; attempts keep their own snapshot |
| D3 | Re-issuing a revoked certificate overwrote its serial | Medium | Re-issue creates a new certificate (`replacesId`); the old serial still verifies as revoked |
| D4 | Draft lessons could be completed or attempted by id | Medium | Learners read only released snapshots |
| D5 | Uploads trusted the browser's MIME type | Medium | Magic-byte sniffing and allow-lists |
| D6 | Public forms had no rate limit | Low | Database-backed limits on contact and newsletter forms |
| D7 | No security headers | Low | Headers and CSP in `next.config.ts` |
| D8 | No `.env.example` | Low | Added, and un-ignored |
| D9 | Staff with granted roles still had the base learner role, so a Subscriber Admin could suspend or reset a staff account, and staff appeared in learner exports and dashboards | High | Learner scope now excludes accounts with staff grants; staff status changes need a Super Administrator (people test) |
| D10 | `OWNER_EMAILS` promoted any listed address at sign-up, at any time | Medium | Promotion only while no owner or Super Administrator exists (security test) |
| D11 | Without an email key, full email bodies (verification and reset links) were printed to logs in every environment | Medium | Printed only outside production |

## 4. Residual risks and recommendations

| Risk | Recommendation before launch |
|---|---|
| No independent penetration test | Commission one against a staging deployment. |
| Uploaded files are not malware-scanned | Add scanning (e.g. ClamAV or the storage provider's scanner) before files are served to others; until then, keep uploads to staff and vendors you have onboarded. |
| CSP allows `'unsafe-inline'` scripts (Next inline bootstrap) | Move to nonce-based CSP via middleware when convenient. |
| Local disk storage | Use object storage with server-side encryption and private buckets in production. |
| Payment integration untested against the provider | Run `docs/TEST_PLAN.md` §5 in Razorpay test mode; verify webhook delivery and refunds; only then enable live keys. |
| Database backups and restore not verified by the app | Configure provider backups and rehearse a restore (`docs/OPERATIONS.md`). |
| PHI screening is pattern-based | It will miss free-text PHI such as names with diagnoses. Keep the "synthetic data only" policy, train authors, and review content in the compliance stage. |
| Secrets in environment variables | Use the host's secret store; rotate `BETTER_AUTH_SECRET`, Razorpay and webhook secrets on staff departure. |
| Support chat polls | Acceptable for load expected; no data risk. |
| Accessibility not formally audited | Run an accessibility audit; not a security risk but a legal one in some markets. |

## 5. How to re-check

`npm run typecheck && npm run lint && npm test` covers the automated controls above; see
`docs/TEST_PLAN.md`. Review `lib/permissions.ts` in every pull request that touches roles.
