interface PresignedUploadUrl {
  url: string;
  /**
   * Headers the URL was signed with — they MUST be sent verbatim on the PUT or
   * S3 rejects the request (403, SignatureDoesNotMatch). For KYC this includes
   * `x-amz-server-side-encryption: AES256` alongside the signed `Content-Type`.
   */
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  /** Backend returns `s3Key`; older/alt shapes may use `key`. */
  s3Key?: string;
  key?: string;
}

/**
 * Uploads a file to S3 using a presigned URL. Supports both the PUT-style
 * URL (no fields) and POST-style policy URL (with fields) shapes the
 * backend may return.
 */
export const uploadToPresignedUrl = async (
  presigned: PresignedUploadUrl,
  file: File,
): Promise<string> => {
  const key = presigned.s3Key ?? presigned.key ?? '';

  if (presigned.fields) {
    // POST policy form upload
    const form = new FormData();
    for (const [k, v] of Object.entries(presigned.fields)) form.append(k, v);
    form.append('file', file);
    const res = await fetch(presigned.url, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  } else {
    // PUT URL — send exactly the headers the URL was signed with (the signed
    // Content-Type and any server-side-encryption header). Falling back to the
    // file's own content type only when the backend didn't return headers.
    const headers = presigned.headers ?? {
      'Content-Type': file.type || 'application/octet-stream',
    };
    const res = await fetch(presigned.url, { method: 'PUT', headers, body: file });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  }
  return key;
};
