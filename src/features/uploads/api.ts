import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Shape returned by the backend presign endpoints (public-read uploads bucket). */
export interface AdminImagePresign {
  url: string;
  s3Key?: string;
  key?: string;
  bucket?: string;
  expiresIn?: number;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  /** Public HTTPS URL to persist + render. */
  publicUrl?: string;
}

/** Presigned upload URL for admin-managed images (category icons, banners…). */
export const useAdminImageUpload = () =>
  useMutation({
    mutationFn: (input: { contentType: string; ext?: string; kind?: string }) =>
      api.post<AdminImagePresign>('/admin/uploads/image', input),
  });
