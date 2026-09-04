# v1.0.0 Release Checklist

## Release-candidate validation

- [x] Working tree reviewed; only intentional source, docs, and baselines are tracked.
- [x] Version metadata is `1.0.0`; tag remains absent.
- [x] README, specialized docs, demo guide, changelog, and release notes are current.
- [x] `npm ci`, `npm audit`, formatting, lint, typecheck, and build pass.
- [x] Standard, contract, browser, accessibility, visual, and performance-smoke suites pass.
- [x] Observability output reports failures/retries/flaky tests honestly and contains no sensitive data.
- [x] Docker images build from clean state; migrations `001`–`004` apply to an empty database; all services are healthy.
- [x] Secret/path scans contain no personal or production credential material.
- [x] GitHub Actions workflow syntax and exact required-check names are reviewed.

## Manual publication

- [ ] Commit the reviewed release-candidate diff.
- [ ] Push `chore/portfolio-polish-v1` and open a pull request to `main`.
- [ ] Require all eight pull-request gates to pass on GitHub-hosted runners.
- [ ] Merge after review, update local `main`, and confirm a clean tree.
- [ ] Create annotated tag `v1.0.0` at the reviewed merge commit.
- [ ] Push the tag and create the GitHub Release from [release notes](releases/v1.0.0.md).

Do not mark the release as published before the tag and GitHub Release exist.
