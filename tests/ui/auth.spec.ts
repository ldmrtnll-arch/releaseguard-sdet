import { expect, test } from '../support/fixtures';
import { LoginPage } from '../support/ui/login-page';
import { RegisterPage } from '../support/ui/register-page';

test.describe('Authentication @ui', () => {
  test('registers a new account in the browser @regression', async ({
    page,
    userBuilder,
  }) => {
    const user = userBuilder();
    const register = new RegisterPage(page);

    await register.navigate();
    await register.register(user);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toHaveText(
      'Account created. Sign in to continue.',
    );
  });

  test('shows a readable duplicate email error @regression', async ({
    authApi,
    page,
    userBuilder,
  }) => {
    const user = userBuilder();
    expect((await authApi.register(user)).status()).toBe(201);

    const register = new RegisterPage(page);
    await register.navigate();
    await register.register(user);

    await expect(page.getByRole('alert')).toHaveText(
      'An account with this email already exists.',
    );
    await expect(page).toHaveURL(/\/register$/);
  });

  test('signs in with valid credentials @smoke', async ({
    authenticatedUser,
    page,
  }) => {
    const login = new LoginPage(page);
    await login.navigate();
    await login.login(
      authenticatedUser.data.email,
      authenticatedUser.data.password,
    );

    await expect(page).toHaveURL(/\/plans$/);
    await expect(
      page.getByText(`Signed in as ${authenticatedUser.data.name}`),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('rejects invalid credentials without creating a session @regression', async ({
    page,
    userBuilder,
  }) => {
    const user = userBuilder();
    const login = new LoginPage(page);
    await login.navigate();
    await login.login(user.email, user.password);

    await expect(page.getByRole('alert')).toHaveText(
      'Invalid email or password.',
    );
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  });

  test('redirects an anonymous deep link to login @regression', async ({
    page,
  }) => {
    await page.goto('/subscription');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to ReleaseGuard' }),
    ).toBeVisible();
  });

  test('signs out and clears access to protected pages @regression', async ({
    authenticatedPage,
  }) => {
    const { page } = authenticatedPage;
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.goto('/subscription');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('restores an authenticated session after refresh @regression', async ({
    authenticatedPage,
  }) => {
    const { page, user } = authenticatedPage;
    await page.goto('/subscription');
    await page.reload();

    await expect(
      page.getByRole('heading', { name: 'Subscription overview' }),
    ).toBeVisible();
    await expect(page.getByText(`Signed in as ${user.name}`)).toBeVisible();
  });
});
