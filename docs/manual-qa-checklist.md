# Manual QA Checklist — Role-Based Recognition Matrix

Use this checklist before each release to confirm that recognition permissions are enforced and that 403 responses are returned whenever a user violates the role matrix.

## Preconditions

- Local or staging environment is populated with representative users for each role (employee, manager, HR admin, executive).
- Reporting lines exist so that at least one employee reports to a manager, and the manager reports into an HR or executive leader.
- API client (Hoppscotch, Bruno, curl, or similar) is authenticated with valid JWTs for each persona.

## Negative Permission Scenarios (Expect HTTP 403)

- [ ] **Employee → unrelated employee**
  - Endpoint: `POST /api/v1/recognitions`
  - Payload: peer scope with a recipient who does **not** share the same manager or department.
  - Expect: `403` with message `"Peer recognition requires that you and your colleague share the same manager."`

- [ ] **Employee → global scope**
  - Endpoint: `POST /api/v1/recognitions`
  - Payload: `scope="global"` targeting any teammate.
  - Expect: `403` with message `"Only HR and executive leaders can send global recognition."`

- [ ] **Manager → non direct report**
  - Endpoint: `POST /api/v1/recognitions`
  - Payload: `scope="report"` targeting someone who does not list the manager as `manager_id`.
  - Expect: `403` with message `"Report recognition is limited to your direct reports."`

- [ ] **Manager/Employee overriding points**
  - Endpoint: `POST /api/v1/recognitions`
  - Payload includes `points_awarded` other than `10`.
  - Expect: `403` or `400` depending on scope with message `"Points exceed the allowable limit"` or `"Peer recognition requires..."` if permissions fail first. Frontend should surface `"Peers award a standard 10 points..."` helper text.

## Sanity Checks (Expect HTTP 200)

- [ ] **Employee → eligible peer**
  - Peer scope with someone sharing the same `manager_id`.
  - Expect: `200` with recognition record persisted and recipient point balance incremented by 10.

- [ ] **Manager → direct report**
  - Report scope for a subordinate with shared reporting line.
  - Expect: `200`; confirm MongoDB shows `points_balance`, `total_points_earned`, and `recognition_count` incremented.

- [ ] **HR/Executive → company-wide recognition**
  - Global scope with arbitrary recipient and optional `points_awarded` override (e.g., 250).
  - Expect: `200`; confirm response payload reflects the override and recipient balance increases by the requested amount.

Document results (pass/fail, API response excerpts, MongoDB screenshots) and attach them to the release ticket for sign-off.
