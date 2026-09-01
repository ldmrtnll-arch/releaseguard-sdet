export type UserTestData = {
  email: string;
  name: string;
  password: string;
};

export type UserBuilder = (overrides?: Partial<UserTestData>) => UserTestData;

type UserBuilderContext = {
  runId?: string;
  workerIndex?: number;
};

const validDefaultPassword = 'TestPass123!';

function identifier(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return sanitized.slice(0, 40) || 'local';
}

export function createUserBuilder({
  runId = process.env.TEST_RUN_ID ?? `local-${process.pid}`,
  workerIndex = 0,
}: UserBuilderContext = {}): UserBuilder {
  let counter = 0;
  const safeRunId = identifier(runId);

  return (overrides = {}) => {
    counter += 1;
    const suffix = `${safeRunId}.${workerIndex}.${counter}`;

    return {
      email: `test.user.${suffix}@releaseguard.test`,
      name: `Test User ${workerIndex}-${counter}`,
      password: validDefaultPassword,
      ...overrides,
    };
  };
}

export const buildUser = createUserBuilder();
