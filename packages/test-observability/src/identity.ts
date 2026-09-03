import { createHash } from 'node:crypto';

export interface StableTestIdentity {
  file: string;
  project: string;
  fullTitle: string;
  repeatEachIndex?: number;
}

export function stableTestId(identity: StableTestIdentity): string {
  const normalized = [
    identity.file.replaceAll('\\', '/'),
    identity.project,
    identity.fullTitle,
    String(identity.repeatEachIndex ?? 0),
  ].join('\0');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function browserForProject(project: string): string | null {
  if (project === 'ui-firefox-smoke') return 'firefox';
  if (project === 'ui-webkit-smoke') return 'webkit';
  if (['ui-chromium', 'accessibility', 'visual'].includes(project))
    return 'chromium';
  return null;
}
