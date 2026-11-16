# Audio object storage

The API owns object-store credentials and receives uploads from the authenticated
frontend. It writes the audio object first, then saves an `audio_files` row whose
`storage_url` is a stable `s3://bucket/key` reference. The bucket is private;
never store an expiring signed URL in this field.

## Cloudflare R2

Cloudflare R2 is the only supported object store. Set all of these backend
environment variables; the R2 bucket must already exist:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-private-bucket
```

The API builds the S3 endpoint from the account ID and fails during startup if
any R2 setting is missing. Grant the API credentials only the bucket permissions
it needs. Connection and upload failures are reported as errors; the API never
falls back to local storage.

The authenticated `GET /api/v1/audio/{audio_id}/access-url` endpoint returns a
15-minute presigned GET URL for `inline` playback or `attachment` download. It
checks that the requested audio belongs to the current user before creating the
URL. Keep the bucket private.

The upload endpoint returns success only after both object upload and database
metadata creation succeed. It streams request chunks through a bounded temporary
file and enforces the same 50 MB limit as direct analysis. After storing the
object, the API reads duration, sample rate, and channel count from the original
audio and includes any values it can determine in the `audio_files` row. It uses
SoundFile first and audioread as a fallback; fields unavailable from both remain
`NULL`. The existing
`POST /api/v1/analyse` endpoint still accepts a multipart `file`; it also accepts
an `audio_id` form field to analyze a previously stored, user-owned object.
