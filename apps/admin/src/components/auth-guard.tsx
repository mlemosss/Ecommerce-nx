'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '../lib/api';
import { clearToken, getToken } from '../lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [checked, setChecked] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    api
      .get('/auth/me')
      .then(() => setChecked(true))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        } else {
          setChecked(true);
        }
      });
  }, [isLoginPage, router]);

  if (!checked) {
    return <div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>;
  }

  return <>{children}</>;
}
