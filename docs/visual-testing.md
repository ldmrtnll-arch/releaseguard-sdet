# Visual Regression Testing

## Purpose and selected baselines

Playwright screenshot comparison protects four high-value visual regions that functional assertions do not describe:

- `home-hero.png` — hero copy, primary actions, and stable API status;
- `plans-page.png` — three-card pricing hierarchy and actions;
- `active-subscription-card.png` — active-plan summary and actions;
- `cancel-subscription-dialog.png` — modal hierarchy and destructive choice.

The scope is selective to keep review meaningful and maintenance noise low. It does not snapshot every route, state, viewport, or browser.

## Stable baseline environment

Baselines are generated and compared with Chromium from the pinned `mcr.microsoft.com/playwright:v1.62.1-noble` image at a `1440x900` viewport. Playwright itself is pinned to `1.62.1`. The application uses local system fonts and no remote font download. Screenshots disable animations, hide the caret, use CSS pixel scale, and allow only `maxDiffPixelRatio: 0.001` (0.1%).

The local wrapper starts the existing PostgreSQL Compose service and runs application servers plus Chromium inside that Linux image. CI uses the same image directly. This single baseline environment prevents permanent Windows/Linux rendering churn; Firefox and WebKit remain functional smoke targets rather than visual-baseline platforms.

## Dynamic content

Tests wait for observable page content instead of sleeping. Snapshots target components rather than oversized full pages, excluding unique names and emails. Only the subscription start date is masked, using the surrounding detail background color; plan data and all layout/action content remain visible and deterministic.

## Commands

```powershell
npm run test:visual
npm run test:visual:update
```

The update command is deliberate and must be followed by visual review and a normal comparison run. CI never updates snapshots. Set `VISUAL_DATABASE_URL` only when the local PostgreSQL host mapping differs from the default port 5433.

## CI behavior and limitations

Any pixel difference beyond the small tolerance fails the advanced-quality job. Playwright's expected, actual, and diff images remain under `test-results/`; CI uploads that directory and the HTML report on failure.

Visual regression can detect unexpected layout, typography, color, spacing, or content changes in selected regions. It does not prove business correctness, accessibility, responsive behavior at every viewport, or that an intended design change is wrong.

## Anti-patterns avoided

- No automatic baseline updates in CI.
- No three-browser or host-OS snapshot matrix.
- No remote visual service, remote fonts, arbitrary sleeps, or broad tolerance.
- No random identifiers or timestamps left visible.
- No screenshot for every page and transient state.
