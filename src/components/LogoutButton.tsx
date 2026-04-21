// src/components/LogoutButton.tsx
'use client';

import { signOut } from 'next-auth/react';
import { BiLogOut } from 'react-icons/bi';

export default function LogoutButton({ redirectUrl }: { redirectUrl: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: redirectUrl })}
      className="flex w-full items-center justify-center rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 hover:text-red-700"
    >
      <BiLogOut className="mr-2 text-xl" />
      Sign Out
    </button>
  );
}