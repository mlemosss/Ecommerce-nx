'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '../lib/auth';

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        clearToken();
        router.replace('/login');
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/60"
      aria-label="Sair"
      title="Sair"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m6 4 4 4-4 4M9 12h11"
        />
      </svg>
    </button>
  );
}
