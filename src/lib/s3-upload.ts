interface PresignedUploadUrl {
  url: string;
  fields?: Record<string, string>;
  key: string;
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
  if (presigned.fields) {
    // POST policy form upload
    const form = new FormData();
    for (const [k, v] of Object.entries(presigned.fields)) form.append(k, v);
    form.append('file', file);
    const res = await fetch(presigned.url, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  } else {
    // PUT URL — content-type matters
    const res = await fetch(presigned.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  }
  return presigned.key;
};
