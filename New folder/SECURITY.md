# Security Guide: Malicious Code & Prompt Injection Protection

This project includes a web frontend (Next.js) and a FastAPI backend. Use the following practices to mitigate malicious code and prompt injection risks.

## Core Principles
- Treat all user input and LLM output as untrusted data.
- Enforce strict allow-lists for network calls, tools, and commands.
- Avoid executing arbitrary code from prompts or user content.
- Isolate untrusted processes (containers, low privileges, no shared secrets).

## Frontend (Next.js)
- CSP: Set a restrictive Content-Security-Policy to block inline scripts and unexpected origins. See `apps/web/next.config.js` headers.
- Escape/sanitize: Sanitize any HTML you render from user content with DOMPurify; default to text, not HTML.
- No dangerous eval: Avoid `eval`, `Function`, or dynamic script injection.
- Cookies: Use `HttpOnly`, `Secure`, `SameSite=Strict`; prefer bearer tokens for APIs.
- CSRF: Use CSRF tokens or double-submit cookie for mutating requests in browser sessions.

## Backend (FastAPI)
- Validation: Use Pydantic schemas with strict types; reject malformed inputs early.
- Timeouts: Apply timeouts and retries for external calls (e.g., geocoding) to prevent resource exhaustion.
- SSRF/Allow-list: Restrict outbound requests to known hosts (e.g., Nominatim); do not proxy arbitrary URLs.
- Security headers: See `apps/api/main.py` middleware for baseline headers and TrustedHost.
- Rate limiting: Add per-IP and per-user rate limits on sensitive endpoints.

## Prompt Injection Defenses (LLM)
- Context isolation: Never mix user-provided text directly into system/developer instructions.
- Instruction filtering: Strip or ignore content containing phrases like "ignore previous instructions" or tool invocation patterns from user documents.
- Tool gating: Only allow LLM to call specific tools/functions with strict argument schemas; validate before execution.
- Output handling: Treat model outputs as suggestions; require a review step before executing any code or commands.
- Data minimization: Pass only the minimal fields needed into prompts; avoid secrets.
- Policy checks: Run outputs through a safety/policy filter before use (e.g., allow-list keywords, deny-list dangerous ops).

## Operational Hardening
- Logging: Log inputs, outputs, and tool calls for forensics; do not log secrets.
- Monitoring: Alert on unusual spikes, long prompts, or repeated denied actions.
- Secrets: Store in a proper secret manager; rotate regularly; never expose to prompts.
- Containers: Run API/web with non-root users; apply seccomp/AppArmor; limit filesystem/network permissions.

## Quick Tasks
- Frontend: Add DOMPurify to sanitize any HTML rendering.
- Backend: Add request timeouts and host allow-list for geocoding.
- LLM: Implement a tool router that enforces schema validation and allow-listed actions.

## References
- OWASP Top 10 and ASVS
- OWASP Cheat Sheets: XSS, SSRF, CSRF
- Model prompt injection guidance from platform providers
