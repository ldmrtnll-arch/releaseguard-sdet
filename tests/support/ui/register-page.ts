import type { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto('/register');
  }

  async register(input: { email: string; name: string; password: string }) {
    await this.page.getByLabel('Name').fill(input.name);
    await this.page.getByLabel('Email').fill(input.email);
    await this.page.getByLabel('Password').fill(input.password);
    await this.page.getByRole('button', { name: 'Create account' }).click();
  }
}
