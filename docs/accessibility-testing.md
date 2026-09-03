# Accessibility Testing

## Scope

Six Chromium checks scan the rendered home, registration, login, loaded plans, active subscription, and open cancellation-dialog states. The authenticated states are created through public APIs and injected into an isolated browser context, keeping setup fast without bypassing application behavior under test.

## Tool and standards

`@axe-core/playwright` runs axe through Playwright with `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags. A small helper executes the scan and reports each rule ID, impact, help text, and affected target when violations exist. No rule, component, or page is excluded.

The dialog check additionally uses the keyboard to focus its trigger, open the native `<dialog>`, confirm initial focus, close with Escape, and verify focus returns to the trigger. Forms use native labels, required attributes, autocomplete, and descriptive password guidance.

## What automation catches

These scans can identify issues such as missing accessible names, invalid ARIA, insufficient color contrast, absent landmarks, invalid heading structure, and form-label problems in the tested DOM states.

## Limitations and manual complement

Zero automated violations does not prove legal conformance, good usability for every disability, complete screen-reader behavior, sensible reading order in every context, cognitive accessibility, or support across all assistive technologies. Keyboard exploration, screen-reader testing, zoom/reflow review, and evaluation with disabled users remain human activities that complement this gate.

## Commands and CI

```powershell
npm run test:a11y
```

The suite is part of `npm test` and the dedicated advanced-quality CI job. It runs only on Chromium; Firefox and WebKit remain functional smoke targets.

## Anti-patterns avoided

- No blanket exclusions or suppressed violations.
- No homepage-only scan or unauthenticated-only scope.
- No replacement of semantic HTML with redundant ARIA.
- No UI-driven setup for authenticated preconditions.
- No claim that an automated scan is a complete accessibility audit.
