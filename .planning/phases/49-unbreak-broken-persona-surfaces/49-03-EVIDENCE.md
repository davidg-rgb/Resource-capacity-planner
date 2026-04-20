# Phase 49 Plan 03: Admin 500 Fix -- Migration Evidence

**Git commit SHA at migration time:** `10866d36262e3c745dcb51695d40aefbfc37276d`
**Timestamp:** 2026-04-20T09:05Z
**DATABASE_URL host:** `ep-raspy-sea-al5kxh7j-pooler.c-3.eu-central-1.aws.neon.tech` (dev branch -- confirmed)

## Pre-migration snapshot

### drizzle.__drizzle_migrations (5 rows -- expected per RESEARCH)

```json
[
  {
    "id": 1,
    "hash": "6221cce31084068823f6ca4af477820d16328497a60ead1e35929e29993336a9",
    "created_at": "1774518414872"
  },
  {
    "id": 2,
    "hash": "5ba054ac902f969fa9f49910cb3a2500c76abfea629aa75a87ea08b4a016fa69",
    "created_at": "1775573609283"
  },
  {
    "id": 3,
    "hash": "0ad79bd066ba3336a1af0f9a679848961513b2e870ce346f59f31ab4197e688e",
    "created_at": "1775573609411"
  },
  {
    "id": 4,
    "hash": "bd5d5976375cf65ea710aac4292cbc2003e9bb5e2a65f1e122be0d12cb5c5bf1",
    "created_at": "1775573609470"
  },
  {
    "id": 5,
    "hash": "52ef4d2091826611b387063034ea05eb6476162f58f99dfe041365be38d2694c",
    "created_at": "1775573609530"
  }
]
```

### departments columns (archived_at ABSENT -- confirms drift)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "created_at" }
]
```

### disciplines columns (archived_at ABSENT)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "abbreviation" },
  { "column_name": "created_at" }
]
```

### programs columns (archived_at ABSENT)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "description" },
  { "column_name": "created_at" },
  { "column_name": "updated_at" }
]
```

### change_log table presence (ABSENT -- confirms drift)

```json
[]
```

## Rollback branch

Neon CLI not available locally -- rollback via Neon dashboard's branch-restore feature using the `created_at` timestamp captured above (earliest migration: `1774518414872`). Manual `psql` revert of 0005-0008 is the fallback. The Neon dashboard supports point-in-time restore on the dev branch `ep-raspy-sea-al5kxh7j-pooler` to any timestamp before the migration run.
