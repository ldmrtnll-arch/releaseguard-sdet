import { test as base } from '@playwright/test';

import {
  createUserBuilder,
  type UserBuilder,
  type UserTestData,
} from '@releaseguard/test-data';

import { AuthApiClient } from './api/auth-api-client';
import { loginResponseSchema } from './api/auth-contracts';
import { TestDatabase } from './database';

type AuthenticatedUser = {
  accessToken: string;
  data: UserTestData;
  user: {
    email: string;
    id: string;
    name: string;
  };
};

type TestFixtures = {
  authenticatedUser: AuthenticatedUser;
  authApi: AuthApiClient;
};

type WorkerFixtures = {
  database: TestDatabase;
  userBuilder: UserBuilder;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApiClient(request));
  },

  authenticatedUser: async ({ authApi, userBuilder }, use) => {
    const data = userBuilder();
    const registerResponse = await authApi.register(data);

    if (registerResponse.status() !== 201) {
      throw new Error(
        `Authenticated user setup failed during registration with status ${registerResponse.status()}`,
      );
    }

    const loginResponse = await authApi.login(data);

    if (loginResponse.status() !== 200) {
      throw new Error(
        `Authenticated user setup failed during login with status ${loginResponse.status()}`,
      );
    }

    const login = loginResponseSchema.parse(await loginResponse.json());
    await use({
      accessToken: login.accessToken,
      data,
      user: login.user,
    });
  },

  database: [
    async ({ browserName }, use) => {
      void browserName;
      const database = new TestDatabase();
      await use(database);
      await database.close();
    },
    { scope: 'worker' },
  ],

  userBuilder: [
    async ({ browserName }, use, workerInfo) => {
      void browserName;
      await use(
        createUserBuilder({
          runId: process.env.TEST_RUN_ID,
          workerIndex: workerInfo.workerIndex,
        }),
      );
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
