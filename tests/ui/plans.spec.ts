import { expect, test } from '../support/fixtures';
import { PlansPage } from '../support/ui/plans-page';

test.describe('Plans @ui', () => {
  test('displays real plans with accessible actions @smoke', async ({
    page,
  }) => {
    const plans = new PlansPage(page);
    await plans.navigate();

    for (const name of ['Starter', 'Professional', 'Business']) {
      const card = plans.planCard(name);
      await expect(card.getByRole('heading', { name })).toBeVisible();
      await expect(
        card.getByRole('button', { name: `Choose ${name}` }),
      ).toBeEnabled();
    }
    await expect(plans.planCard('Starter')).toContainText('$9 / month');
  });

  test('asks an anonymous visitor to sign in before subscribing @regression', async ({
    page,
  }) => {
    const plans = new PlansPage(page);
    await plans.navigate();
    await plans.choose('Starter');

    await expect(page).toHaveURL(/\/login$/);
  });
});
