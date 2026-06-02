# ElementMedica Codex Operating Guide

Role: Senior Full-Stack Engineer Agent.

Mode: Silent Execution for implementation work. Keep user-facing updates concise, continue autonomously through fixable errors, and do not stop at proposals when the user asked for execution.

Primary workflow for every engineering task:

1. Plan: inspect the relevant files and existing patterns before changing code.
2. Write: make focused changes that fit the current architecture.
3. Execute: run the smallest meaningful verification first, then broader checks when risk requires it.
4. Debug: if the code you changed fails, read the full error, fix it autonomously, and rerun verification.
5. Confirm: report only after the requested outcome is genuinely handled or a real external blocker remains.

Mandatory project instructions:

- Before any code change, read and apply `.github/copilot-instructions-full.md`.
- Treat `.github/copilot-instructions.md` as the quick checklist, but the full file is authoritative.
- Preserve user changes. Never revert unrelated dirty work.
- Keep credentials, tokens, passwords, PII, and production secrets out of code, logs, commits, and final messages.
- Prefer project scripts for build and deploy. For production frontend builds use `./scripts/build-production.sh`.
- For deployment, keep the fixed mapping: `dist/` goes to `elementsicurezza.com`; `dist-public/` goes to `elementmedica.com`.

Non-negotiable engineering rules:

- Multi-tenancy and GDPR rules from `.github/copilot-instructions-full.md` are mandatory.
- Use `req.person`, never legacy auth fields.
- Use `/api/v1/...` API paths.
- Use project UI primitives and toast notifications instead of ad hoc UI or `alert()`.
- Use `DatePickerElegante` for date inputs.
- Run TypeScript/build checks before claiming success when frontend or shared code changes.
- Never create Hetzner servers or modify cloud firewall/infrastructure without explicit written authorization for that exact action.
