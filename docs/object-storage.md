# Audio object storage

The API owns object-store credentials and receives uploads from the authenticated
frontend. It writes the audio object first, then saves an `audio_files` row whose
`storage_url` is a stable `s3://bucket/key` reference. The bucket is private;
never store an expiring signed URL in this field.

## Local development with MinIO

1. Copy `backend/.env.example` to `backend/.env` and provide the database and
   Supabase settings.
2. Leave all four `R2_*` values empty.
3. Start MinIO and create the configured bucket from the repository root:

   ```powershell
   docker compose --env-file backend/.env up -d
   ```

4. From `backend`, run the API as usual. The default endpoint is
   `http://localhost:9000`; the MinIO console is at `http://localhost:9001`.

The Compose file persists objects in the `minio_data` volume. Its default
credentials are for local development only; change them if exposing MinIO beyond
the local machine and keep the API's MinIO credentials in sync.

## Cloudflare R2

Set all of these backend environment variables to select R2:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-private-bucket
```

The API builds the S3 endpoint from the account ID. Create the R2 bucket before
deploying and grant the API credentials only the bucket permissions it needs.
If any R2 setting is supplied without the others, API initialization fails
instead of silently choosing MinIO. A connection or upload failure after R2 is
selected is reported as an error; it never falls back to local storage.

The upload endpoint returns success only after both object upload and database
metadata creation succeed. It streams request chunks through a bounded temporary
file and enforces the same 50 MB limit as direct analysis. The existing
`POST /api/v1/analyse` endpoint still accepts a multipart `file`; it also accepts
an `audio_id` form field to analyze a previously stored, user-owned object.
