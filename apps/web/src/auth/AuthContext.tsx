import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { api, ApiError, type PublicUser } from '../api/client';

export const sessionTokenKey = 'releaseguard.accessToken';

type AuthStatus = 'anonymous' | 'authenticated' | 'initializing';

type AuthContextValue = {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  status: AuthStatus;
  user: PublicUser | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem(sessionTokenKey),
  );
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    accessToken ? 'initializing' : 'anonymous',
  );

  useEffect(() => {
    let active = true;

    if (!accessToken) {
      setStatus('anonymous');
      setUser(null);
      return () => {
        active = false;
      };
    }

    setStatus('initializing');
    void api
      .me(accessToken)
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (!active) return;

        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
          sessionStorage.removeItem(sessionTokenKey);
          setAccessToken(null);
        }

        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      async login(email, password) {
        const result = await api.login({ email, password });
        sessionStorage.setItem(sessionTokenKey, result.accessToken);
        setAccessToken(result.accessToken);
        setUser(result.user);
        setStatus('authenticated');
      },
      logout() {
        sessionStorage.removeItem(sessionTokenKey);
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
      },
      status,
      user,
    }),
    [accessToken, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
