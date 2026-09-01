export type StoredUser = {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  passwordHash: string;
  updatedAt: Date;
};

export type PublicUser = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  updatedAt: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    id: user.id,
    name: user.name,
    updatedAt: user.updatedAt.toISOString(),
  };
}
