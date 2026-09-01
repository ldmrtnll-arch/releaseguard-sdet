import { randomUUID } from 'node:crypto';

import { compare, hash } from 'bcryptjs';

import { InvalidCredentialsError, UnauthorizedError } from '../errors.js';
import type { PublicUser } from './user.js';
import { normalizeEmail, toPublicUser } from './user.js';
import type { UserRepository } from './user-repository.js';

const passwordWorkFactor = 12;

type RegisterInput = {
  email: string;
  name: string;
  password: string;
};

export type AuthService = {
  authenticate: (email: string, password: string) => Promise<PublicUser>;
  findPublicUser: (id: string) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
};

export async function createAuthService(
  users: UserRepository,
): Promise<AuthService> {
  // An unknown email still performs a real password comparison so login timing
  // does not trivially reveal whether the account exists.
  const dummyPasswordHash = await hash(randomUUID(), passwordWorkFactor);

  return {
    async register(input) {
      const user = await users.create({
        email: normalizeEmail(input.email),
        id: randomUUID(),
        name: input.name.trim(),
        passwordHash: await hash(input.password, passwordWorkFactor),
      });

      return toPublicUser(user);
    },

    async authenticate(email, password) {
      const user = await users.findByEmail(normalizeEmail(email));
      const passwordMatches = await compare(
        password,
        user?.passwordHash ?? dummyPasswordHash,
      );

      if (!user || !passwordMatches) {
        throw new InvalidCredentialsError();
      }

      return toPublicUser(user);
    },

    async findPublicUser(id) {
      const user = await users.findById(id);

      if (!user) {
        throw new UnauthorizedError();
      }

      return toPublicUser(user);
    },
  };
}
