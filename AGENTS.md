# Agent Guidelines for RewardsHub

## Scope
These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Workflow
- Prefer targeted edits and keep changes focused on the requested task.
- Update or add tests only when behavior changes; mention skipped tests in the final summary.
- Add or update E2E tests for any new user-facing features.
- Use existing tooling: `backend` uses Python 3.11+ and `frontend` uses Node 18+ with Yarn.

## Helpful Commands
- Backend tests: `cd backend && pytest backend/tests`
- Frontend tests: `cd frontend && yarn test --watchAll=false`

## Repo Notes
- Backend entrypoint: `backend/main.py`
- Frontend source: `frontend/src`
- Shared docs live in `docs/`
