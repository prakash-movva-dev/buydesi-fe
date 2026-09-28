import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { SafeUser } from '@/types/api';

// ----------------------------------------------------------------------

/** The bits of your own record you can edit without proving anything. */
export const useUpdateMe = () =>
  useMutation({
    mutationFn: (patch: { name?: string; preferredLanguage?: string }) =>
      api.put<SafeUser>('/users/me', patch),
  });

export interface ContactChangeInput {
  channel: 'email' | 'mobile';
  email?: string;
  mobile?: string;
}

/**
 * Step one of changing your own email or mobile.
 *
 * The code goes to the address you are moving *to*, so a typo cannot leave you
 * locked out of an account that now points somewhere you cannot read.
 */
export const useRequestContactChange = () =>
  useMutation({
    mutationFn: (input: ContactChangeInput) =>
      api.post<{ sentAt: string; expiresAt: string; cooldownSeconds: number }>(
        '/users/me/contact/request-code',
        input,
      ),
  });

/** Step two: the code, which is what actually moves the account. */
export const useConfirmContactChange = () =>
  useMutation({
    mutationFn: (input: ContactChangeInput & { code: string }) =>
      api.put<SafeUser>('/users/me/contact', input),
  });
