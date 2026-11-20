# Harmonix

## Run with Docker Compose

Docker Compose builds and runs the React frontend and FastAPI backend. Audio
objects are stored in Cloudflare R2; Supabase and R2 remain external services.

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `DATABASE_URL` to values
   from your Supabase project. URL-encode special characters in the database
   password. The Supabase database must already have the current schema/migrations.
3. Set all four `R2_*` values and configure R2 bucket CORS for the browser origin.
   The backend requires R2 configuration at startup; it does not fall back to
   local object storage.
4. Start the stack:

   ```sh
   docker compose up --build
   ```

Open <http://localhost:5173>. The API is also available at
<http://localhost:8000> and its health endpoint is
<http://localhost:8000/api/v1/health>.

The Supabase URL and publishable key are public frontend configuration, not
secrets. Keep database passwords and R2 secret keys private; do not commit `.env`.
`docker compose down` stops and removes the app containers; it does not delete
database records or objects stored in R2.

## Run backend tests

Install the backend dependencies, then run the test suite from the `backend`
directory:

```sh
python -m unittest discover -s tests -v
```

The standard suite uses mocked Supabase and R2 boundaries and does not require
production credentials or a live database.

## Run frontend checks

Install the frontend dependencies, then run its unit tests and production
type-check/build from the `frontend` directory:

```sh
npm ci
npm test
npm run build
```

Frontend tests mock Supabase, API requests, and browser media playback, so they
do not require live services or audio assets.