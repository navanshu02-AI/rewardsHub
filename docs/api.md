# RewardsHub API Documentation

## Overview
The RewardsHub backend publishes an OpenAPI specification and a Swagger UI to
explore all API endpoints. The Swagger UI is the source of truth for request and
response payloads.

## Swagger UI
- **Swagger UI:** `/api/v1/docs`
- **OpenAPI JSON:** `/api/v1/openapi.json`
- **ReDoc:** `/api/v1/redoc`

When running locally, prepend the backend host (for example,
`http://localhost:8000/api/v1/docs`).

## Authentication
Most endpoints require a Bearer token obtained from the login endpoint.

1. Register or log in:
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
2. Copy the `access_token` from the response and authorize in Swagger UI using
   the **Authorize** button with `Bearer <token>`.

## Organization Header
Requests support an `X-Org-Id` header to scope data to a specific organization.
If omitted, the API defaults to the configured database name for development
setups.

In the web UI, the login form includes an optional **Organization ID** input.
When provided, the value is stored in `localStorage` and sent as the `X-Org-Id`
header for login, registration, and password reset requests.

## API Groups
Swagger organizes endpoints into the following tags:
- authentication
- users
- rewards
- recommendations
- preferences
- recognitions
- points
- admin-redemptions
- admin-analytics
- admin-audit-logs
- orgs

Refer to Swagger UI for detailed schemas, examples, and response codes.
