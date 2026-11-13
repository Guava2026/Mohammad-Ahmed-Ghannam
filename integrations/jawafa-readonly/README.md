# JAWAFA ONE — SQL / TrustSoft read-only gateway

Status: **BUILT / LOCAL_POLICY_TEST_PASSED; NOT LIVE**.

Run this backend privately behind HTTPS (not on GitHub Pages), with network restrictions, request-rate limits and secure audit logs. Run `npm install && npm test` in this directory using Node 22+.

Required server-only configuration: `JAWAFA_COMPANY_ID`, `JAWAFA_ALLOWED_ORIGIN`, Firebase Admin workload identity; SQL: `JAWAFA_SQL_SERVER`, `JAWAFA_SQL_DATABASE`, `JAWAFA_SQL_USER`, `JAWAFA_SQL_PASSWORD`, `JAWAFA_SQL_VIEW`, `JAWAFA_SQL_COLUMNS`, optional `JAWAFA_SQL_SCHEMA` and `JAWAFA_SQL_PORT`; TrustSoft: `TRUSTSOFT_STATUS_URL`, `TRUSTSOFT_API_TOKEN`.

SQL login must have only SELECT permissions on the pre-reviewed reporting view. No sa or elevated database role. Secrets stay out of GitHub and browser apps.

API: `GET /health`; `GET /v1/sql/records?companyId=<id>&limit=10`; `GET /v1/trustsoft/status?companyId=<id>`. Data routes require Firebase ID token (Bearer) and company membership/role authorisation. TrustSoft response returns only validated summary status fields; not video or credentials.

Before marking LIVE: verify one original SQL record, denial of SQL INSERT/UPDATE/DELETE, cross-company isolation, TrustSoft vendor API field mapping, TLS and network access, error handling and audit trail. No real database or vendor API connection was performed during development. Jawafa_DB and accounting originals remain unchanged.
