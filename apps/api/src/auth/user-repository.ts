import { DatabaseError } from 'pg';

import type { Database } from '../database.js';
import { EmailAlreadyRegisteredError } from '../errors.js';
import type { StoredUser } from './user.js';

type CreateUserInput = {
  email: string;
  id: string;
  name: string;
  passwordHash: string;
};

export type UserRepository = {
  create: (input: CreateUserInput) => Promise<StoredUser>;
  findByEmail: (email: string) => Promise<StoredUser | undefined>;
  findById: (id: string) => Promise<StoredUser | undefined>;
};

const publicColumns = `
  id,
  email,
  name,
  password_hash AS "passwordHash",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export function createUserRepository(database: Database): UserRepository {
  return {
    async create(input) {
      try {
        const result = await database.query<StoredUser>(
          `INSERT INTO users (id, email, name, password_hash)
           VALUES ($1, $2, $3, $4)
           RETURNING ${publicColumns}`,
          [input.id, input.email, input.name, input.passwordHash],
        );
        const user = result.rows[0];

        if (!user) {
          throw new Error('User insert did not return a row');
        }

        return user;
      } catch (error) {
        if (error instanceof DatabaseError && error.code === '23505') {
          throw new EmailAlreadyRegisteredError();
        }

        throw error;
      }
    },

    async findByEmail(email) {
      const result = await database.query<StoredUser>(
        `SELECT ${publicColumns} FROM users WHERE email = $1`,
        [email],
      );

      return result.rows[0];
    },

    async findById(id) {
      const result = await database.query<StoredUser>(
        `SELECT ${publicColumns} FROM users WHERE id = $1`,
        [id],
      );

      return result.rows[0];
    },
  };
}
