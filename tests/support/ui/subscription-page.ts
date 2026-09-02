import type { Page } from '@playwright/test';

export class SubscriptionPage {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto('/subscription');
  }

  async changePlan() {
    await this.page.getByRole('link', { name: 'Change plan' }).click();
  }

  async openCancellation() {
    await this.page
      .getByRole('button', { name: 'Cancel subscription' })
      .click();
  }

  async keepSubscription() {
    await this.page.getByRole('button', { name: 'Keep subscription' }).click();
  }

  async confirmCancellation() {
    await this.page
      .getByRole('button', { name: 'Confirm cancellation' })
      .click();
  }
}
