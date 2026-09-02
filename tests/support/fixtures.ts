import { test as base, type Page } from '@playwright/test';

import {
  createUserBuilder,
  planCodes,
  type UserBuilder,
  type UserTestData,
} from '@releaseguard/test-data';

import { AuthApiClient } from './api/auth-api-client';
import { loginResponseSchema } from './api/auth-contracts';
import { PlansApiClient } from './api/plans-api-client';
import {
  planListResponseSchema,
  subscriptionResponseSchema,
  type PlanResponse,
  type SubscriptionResponse,
} from './api/subscription-contracts';
import { SubscriptionsApiClient } from './api/subscriptions-api-client';
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

type AuthenticatedBrowser = AuthenticatedUser & {
  page: Page;
};

type TestFixtures = {
  authenticatedPage: AuthenticatedBrowser;
  authenticatedUser: AuthenticatedUser;
  authenticatedSubscriptionsApi: SubscriptionsApiClient;
  availablePlans: Record<
    (typeof planCodes)[keyof typeof planCodes],
    PlanResponse
  >;
  authApi: AuthApiClient;
  plansApi: PlansApiClient;
  subscribedUser: AuthenticatedUser & { subscription: SubscriptionResponse };
  subscribedPage: AuthenticatedBrowser & {
    subscription: SubscriptionResponse;
  };
  subscriptionsApi: SubscriptionsApiClient;
};

type WorkerFixtures = {
  database: TestDatabase;
  userBuilder: UserBuilder;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApiClient(request));
  },

  plansApi: async ({ request }, use) => {
    await use(new PlansApiClient(request));
  },

  subscriptionsApi: async ({ request }, use) => {
    await use(new SubscriptionsApiClient(request));
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

  authenticatedPage: async ({ authenticatedUser, page }, use) => {
    await page.goto('/');
    await page.evaluate(
      ({ accessToken, key }) => sessionStorage.setItem(key, accessToken),
      {
        accessToken: authenticatedUser.accessToken,
        key: 'releaseguard.accessToken',
      },
    );
    await page.reload();
    await page.getByRole('button', { name: 'Sign out' }).waitFor();

    await use({ ...authenticatedUser, page });
  },

  authenticatedSubscriptionsApi: async (
    { authenticatedUser, request },
    use,
  ) => {
    await use(
      new SubscriptionsApiClient(request, authenticatedUser.accessToken),
    );
  },

  availablePlans: async ({ plansApi }, use) => {
    const response = await plansApi.list();

    if (response.status() !== 200) {
      throw new Error(`Plan setup failed with status ${response.status()}`);
    }

    const listed = planListResponseSchema.parse(await response.json()).data;
    const byCode = new Map(listed.map((plan) => [plan.code, plan]));

    for (const code of Object.values(planCodes)) {
      if (!byCode.has(code)) {
        throw new Error(`Reference plan ${code} is unavailable`);
      }
    }

    const starter = byCode.get(planCodes.starter);
    const professional = byCode.get(planCodes.professional);
    const business = byCode.get(planCodes.business);

    if (!starter || !professional || !business) {
      throw new Error('Required reference plans are unavailable');
    }

    await use({ starter, professional, business });
  },

  subscribedUser: async (
    { authenticatedSubscriptionsApi, authenticatedUser, availablePlans },
    use,
  ) => {
    const response = await authenticatedSubscriptionsApi.create({
      planId: availablePlans.starter.id,
    });

    if (response.status() !== 201) {
      throw new Error(
        `Subscribed user setup failed with status ${response.status()}`,
      );
    }

    const subscription = subscriptionResponseSchema.parse(
      await response.json(),
    ).data;
    await use({ ...authenticatedUser, subscription });
  },

  subscribedPage: async ({ page, subscribedUser }, use) => {
    await page.goto('/');
    await page.evaluate(
      ({ accessToken, key }) => sessionStorage.setItem(key, accessToken),
      {
        accessToken: subscribedUser.accessToken,
        key: 'releaseguard.accessToken',
      },
    );
    await page.reload();
    await page.getByRole('button', { name: 'Sign out' }).waitFor();

    await use({ ...subscribedUser, page });
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
