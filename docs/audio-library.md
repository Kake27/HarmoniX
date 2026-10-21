# Audio library and persisted analysis

The authenticated backend is the source of truth for audio metadata and analysis
results. The library endpoint returns only audio owned by the authenticated
Supabase user, in newest-first order:

- `GET /api/v1/audio?limit=50&offset=0`
- `GET /api/v1/audio/{audio_id}`
- `GET /api/v1/audio/{audio_id}/access-url?disposition=inline`
- `GET /api/v1/audio/{audio_id}/access-url?disposition=attachment`
- `DELETE /api/v1/audio/{audio_id}`

The detail endpoint returns the latest saved analysis and does not trigger
processing. An audio file without an analysis row is reported as `PENDING`.
The access URL endpoint verifies ownership and creates a 15-minute presigned
URL for playback (`inline`) or download (`attachment`) when R2 is configured.
URL issuing is currently unavailable with MinIO. The frontend uses the private
object store directly for media transfer; signed URLs are temporary and are
not persisted in the database or browser storage.
Analysis requests for a stored audio file create a `PROCESSING` analysis record,
then persist the complete analyzer result map and a terminal `COMPLETED`,
`PARTIAL`, or `FAILED` status. The existing synchronous analyze endpoint and
response shape are retained.

Deleting an audio file requires an authenticated owner. The endpoint removes
the selected file and its recursively derived tracks owned by the same user,
including their stored objects, audio metadata, and analysis records. If object
storage cleanup fails, database records are retained and the request returns
an error so deletion can be retried. The detail page asks for confirmation
before sending the request.

## Database update

After deploying the code, apply the additive Alembic revision from the backend
directory:

```powershell
alembic upgrade head
```

The revision adds nullable `status`, `results` (JSONB), and `error_message`
columns to `audio_analysis`. Existing audio and analysis rows are preserved;
legacy analysis rows without a status are surfaced as completed when they have
saved BPM/key values, otherwise as pending. Downgrading removes the new analysis
detail fields, including persisted analyzer JSON, so do not downgrade after
relying on those results without first exporting them.

## Frontend

The protected home page fetches the user's library on mount and supports
pagination. Selecting an item opens `/audio/{audio_id}`. The detail page fetches
the record independently, so direct navigation and refresh work without
navigation state or browser-persisted metadata.
