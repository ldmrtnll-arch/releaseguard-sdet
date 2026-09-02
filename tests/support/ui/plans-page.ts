import type { Page } from '@playwright/test';

export class PlansPage {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto('/plans');
  }

  planCard(name: string) {
    return this.page.getByRole('article').filter({
      has: this.page.getByRole('heading', { level: 2, name }),
    });
  }

  async choose(name: string) {
    await this.planCard(name)
      .getByRole('button', { name: new RegExp(`(?:Choose|Change to) ${name}`) })
      .click();
  }
}
