import path from 'node:path';

const MAX_ERROR_LENGTH = 500;
const MAX_LABEL_LENGTH = 120;
// ANSI CSI sequences are control characters by definition and must be removed from CI output.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = new RegExp('\\x1B\\[[0-?]*[ -/]*[@-~]', 'g');

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

export function sanitizeErrorMessage(
  input: string | undefined,
  repositoryRoot = process.cwd(),
): string {
  if (!input) return 'No error message was provided.';

  const rootVariants = [repositoryRoot, repositoryRoot.replaceAll('\\', '/')]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  let value = input.replaceAll(ANSI_ESCAPE, ' ');

  for (const root of rootVariants) value = value.replaceAll(root, '<repo>');

  value = value
    .replaceAll(
      /[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\\/\s]+/gi,
      '<home>',
    )
    .replaceAll(/\/(?:home|Users)\/[^/\s]+/g, '<home>')
    .replaceAll(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replaceAll(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[REDACTED_JWT]',
    )
    .replaceAll(
      /\b(token|password|passwd|secret|authorization|cookie|api[-_]?key)\b\s*[:=]\s*[^\s,;]+/gi,
      '$1=[REDACTED]',
    )
    .replaceAll(
      /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi,
      '$1[REDACTED]@',
    )
    .replaceAll(/\s+/g, ' ')
    .trim();

  return truncate(value || 'No error message was provided.', MAX_ERROR_LENGTH);
}

export function sanitizeLabel(
  input: string,
  maximum = MAX_LABEL_LENGTH,
): string {
  return truncate(input.replaceAll(/[\r\n\t]+/g, ' ').trim(), maximum);
}

export function sanitizeRequestId(input: string): string | undefined {
  const value = sanitizeLabel(input, 128);
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value) ? value : undefined;
}

export function repositoryRelativePath(
  input: string | undefined,
  repositoryRoot = process.cwd(),
): string | undefined {
  if (!input) return undefined;
  const relative = path.relative(repositoryRoot, path.resolve(input));
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return undefined;
  }
  return relative.replaceAll(path.sep, '/');
}
