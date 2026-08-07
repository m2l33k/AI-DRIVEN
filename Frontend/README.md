# Frontend — CloudOps 5GC Console

Angular 22 (standalone) console for the 5G Core management platform.
Huawei-console inspired design. **UI only — no backend integration yet.**

## Structure

```
src/app/
├── shared/
│   ├── charts/      line / bar / donut  (dependency-free SVG chart components)
│   ├── ui/          stat-card, page-header
│   └── layout/      role-shell  (config-driven sidebar + topbar, reused by every role)
├── auth/            login, reset-password           (shared entry point)
├── errors/          not-found (404), server-error (500)
└── roles/           one folder per Keycloak realm role
    ├── admin/               PLATFORM_ADMIN   → layout · dashboard · users · roles · platform-config
    ├── network-operator/    NETWORK_OPERATOR → layout · dashboard · network-functions · core-config
    ├── security-analyst/    SECURITY_ANALYST → layout · dashboard · security-alerts · roaming-events · detection-rules
    └── auditor/             AUDITOR          → layout · dashboard · audit-logs
```

Every role has its own `layout/` (thin wrapper over `shared/layout/role-shell`)
and `dashboard/`, plus feature pages matching that role's permissions in
`keycloak/platform-realm.json`. All routes are lazy-loaded.

## Routes

| Path | Page |
|------|------|
| `/login`, `/reset-password` | Auth |
| `/admin/**` | Platform Admin console |
| `/operator/**` | Network Operator console |
| `/security/**` | Security Analyst console |
| `/audit/**` | Auditor console |
| `/error/500` | 500 page · any unknown path → 404 |

The login page has a demo role picker that routes to the matching console
(replace with real Keycloak auth during integration).

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
