# UI Testing

ReleaseGuard's browser suite validates the real React application against the real Fastify API and PostgreSQL database. It does not mock network responses, use fixed accounts, or prepare business state through direct database writes.

Subscription journeys also cross the real payment-service HTTP boundary. The provider's deterministic default is `approved`; focused resilience scenarios additionally prove human-readable decline and outage behavior. Retry, timeout, and idempotency semantics stay in the cheaper provider and integration layers.

## Philosophy

Browser tests are reserved for journeys where navigation, accessible interaction, browser storage, and frontend/API integration matter together. Detailed validation, concurrency, and persistence rules remain at the faster API and integration layers.

## Coverage model

- Chromium runs the complete UI suite: authentication, routing, plans, subscription lifecycle, session restoration, and error behavior.
- Firefox and WebKit run four stable `@smoke` journeys: home/API availability, login, plan display, and subscription creation.
- One `@critical` test drives registration, login, Starter subscription, Professional plan change, and cancellation entirely through the browser. It also checks for uncaught browser errors and server responses at or above HTTP 500.

Cross-browser smoke is explicit rather than part of the default `npm test`, keeping normal feedback fast while preserving meaningful engine coverage.

`@smoke` represents the minimum customer path: application availability, login, visible plans, and subscription creation/current state. `@regression` adds registration failures, invalid login, protected routes, session refresh, logout, plan changes, cancellation confirmation/abort, and re-subscription.

Five `@resilience` scenarios validate stable UI outcomes for unavailable health, a failed plans request, an invalidated session, a declined payment, and a provider outage. The payment scenarios add a test-only request header while keeping the browser, API, payment client, and provider real. `page.route()` is limited to rendering health/plans network-error states; it does not replace happy-path or service integration coverage. Every failure must leave a readable, actionable state rather than an indefinite spinner or raw technical detail.

## Test architecture

API-first fixtures create only test preconditions. `authenticatedPage` and `subscribedPage` create unique users through public endpoints, place the returned token in the current tab's `sessionStorage`, reload, and wait for `/me` restoration. The critical lifecycle intentionally avoids this shortcut.

Page Objects under `tests/support/ui` expose reusable actions and semantic locators for login, registration, plans, and subscriptions. Assertions remain in the specs. Locators prefer roles, accessible names, labels, and visible domain text; there are no CSS/XPath implementation selectors or arbitrary sleeps.

The separate axe suite builds on the same semantic selectors and API-first fixtures. Its dialog scan also checks keyboard focus and return behavior; automated scans complement rather than replace manual accessibility review.

Every Playwright test receives its own browser context and test-scoped mutable data. The worker-scoped builder combines a run ID, worker index, and counter, so parallel execution does not share users, tokens, or subscriptions. Plans are the only shared data because they are immutable reference rows.

## Anti-patterns intentionally avoided

- UI login as setup for every authenticated scenario.
- Shared test accounts or mutable browser state.
- `waitForTimeout`, CSS/XPath implementation selectors, and test IDs on every element.
- Assertions hidden throughout large Page Objects.
- Full regression duplicated across three browser engines.
- API mocking or direct database writes in UI setup.

## Commands

```powershell
npm run test:ui
npm run test:ui:smoke
npm run test:ui:regression
npm run test:ui:critical
npm run test:ui:cross-browser
npm run test:resilience
npm run test:headed
npm run test:ui:debug
```

Install the relevant browsers before the first local run:

```powershell
npx playwright install chromium firefox webkit
```

Playwright starts direct, non-watch API and Vite processes. Set `API_BASE_URL` only when API-first setup should target a different API origin. Set `VITE_API_URL` at web build/start time when the browser application should use another origin.

## Diagnostics and production routing

Screenshots are captured only on failure, video is retained on failure, and traces are captured on the first retry. CI uploads these diagnostics per job. The production Nginx configuration falls back unknown application routes to `index.html`, so direct navigation and refresh on `/subscription`, `/plans`, `/login`, and `/register` resolve through React Router.
