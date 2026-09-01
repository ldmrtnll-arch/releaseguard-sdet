import type { FastifyPluginCallback } from 'fastify';

import { AppError, UnauthorizedError } from '../errors.js';
import type { AuthService } from './auth-service.js';
import { loginSchema, registerSchema } from './schemas.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

type AuthRoutesOptions = {
  authService: AuthService;
  jwtExpiresIn: string;
};

function validationError() {
  return new AppError('VALIDATION_ERROR', 'Request payload is invalid', 400);
}

export const authRoutes: FastifyPluginCallback<AuthRoutesOptions> = (
  app,
  { authService, jwtExpiresIn },
  done,
) => {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      throw validationError();
    }

    const user = await authService.register(parsed.data);

    return reply.code(201).send({ user });
  });

  app.post('/api/v1/auth/login', async (request) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      throw validationError();
    }

    const user = await authService.authenticate(
      parsed.data.email,
      parsed.data.password,
    );
    const accessToken = app.jwt.sign(
      { sub: user.id },
      { expiresIn: jwtExpiresIn },
    );

    return { accessToken, user };
  });

  app.get('/api/v1/auth/me', async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }

    return { user: await authService.findPublicUser(request.user.sub) };
  });

  done();
};
