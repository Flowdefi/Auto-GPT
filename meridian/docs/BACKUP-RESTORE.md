# Backup and restore

The desk stores `data/meridian.json` and `data/meridian.db`. Both are required. Do this on a private host. Do not copy either file into git.

## Backup

Stop writes, or accept that a file copy taken while the server is running can tear a page.

```bash
cd meridian
node scripts/backup-db.mjs /var/backups/meridian
```

The script copies the JSON file and uses SQLite's backup API for `meridian.db`. Keep at least 14 copies. The self-host branch also has `scripts/backup-db.sh`, which keeps 14 vacuum copies.

## Restore

1. Stop the server and the job worker.
2. Move the current `data/` directory aside.
3. Copy the chosen JSON backup to `data/meridian.json` and the db backup to `data/meridian.db`.
4. Start the server. Open `/api/health` and confirm `ok` is true.
5. Sign in and open one known synthetic account. Do not use a real portfolio for the test.

If the JSON and the SQLite file are from different times, CRM mail and collections accounts can disagree. Restore both from the same stamp.
