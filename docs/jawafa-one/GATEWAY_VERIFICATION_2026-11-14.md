# SQL + TrustSoft verification checkpoint — 2026-11-14

Status: **GATEWAY CODE MERGED; CLIENT PROBE PREPARED; PRODUCTION LINK NOT VERIFIED**.

## Evidence

- SQL/TrustSoft backend PR #3 was merged into main on 2026-11-13: https://github.com/Guava2026/Mohammad-Ahmed-Ghannam/pull/3 ; merge SHA 9f8942916da431b33aa63a87b21484073d8c8873.
- Existing backend enforces Firebase ID token, company membership, per-company authorization, and SQL SELECT from named views. Configuration explicitly requires a non-admin SQL account; never use sa to run a permanent integration.
- Remote management device JAWAFFASVR was listed online on 2026-11-14, but subsequent command execution was blocked by the Remote Desktop Commander monthly tool usage limit. Do **not** treat service health, SQL login, or data access as reverified today.
- No HTTPS gateway deployment URL, TrustSoft vendor camera/event API mapping, production Firebase acceptance, or current SQL read-only connection was established.
- GitHub commit status for merge SHA returned no workflow runs/statuses in the connector. Absence is not evidence that checks succeeded.
- Static dashboard previously displayed integration statuses but did not send a request to the gateway. This branch adds an explicit opt-in probe.

## Work in this change

- Browser sends a freshly obtained Firebase token only to a preconfigured HTTPS public gateway origin. Rejects HTTP, credentials embedded in URL, private IPs and localhost, and non-root gateway URLs.
- User presses **Check gateway connection** for the currently selected company. Requests one row maximum from the approved SQL view and safe TrustSoft summary.
- UI never renders SQL row contents, never stores access tokens in localStorage, and never labels a simple API response as verified production LIVE.
- Gateway URL is blank by default in dashboard/one/gateway-config.js; no secret is committed.
- Run node --test dashboard/tests/one-bridge.test.mjs and the existing backend policy tests. New checks are also in .github/workflows/jawafa-readonly-gateway.yml.

## Gates for real connection

1. Restore authorized remote command access when the external usage allowance resets or an approved access channel is available. Do not circumvent the usage limit.
2. Verify SQL login has SELECT only on approved reporting views, not sa, and compare one record against the original source. Test write DENY.
3. Identify and validate the **actual** TrustSoft vendor API endpoint; Windows services named Trust Scale WS and TrustJoFotaraWS do not prove a camera/events API.
4. Deploy gateway on private HTTPS with correct TLS, secret management, rate limits, logging, and firewall rules; configure Firebase Admin workload identity and exactly one company ID.
5. Set gateway-config.js to its approved public HTTPS root URL and validate signed-in, unauthorized, and cross-company access end-to-end.
6. Do not claim production or modify original Jawafa_DB, TrustSoft, or finance records without verified evidence and permitted change control.
