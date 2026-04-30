"""
Sanatan Saathi — minimal seed script (fallback when mongorestore is unavailable).

Usage:
    # 1. Activate your backend venv (or use the docker backend container)
    cd backend && source .venv/bin/activate

    # 2. Set MONGO_URL + DB_NAME (defaults: localhost / sanatan_saathi)
    export MONGO_URL="mongodb://localhost:27017"
    export DB_NAME="sanatan_saathi"

    # 3. Run from project root (where /seeds/ lives)
    python seeds/seed.py

What this does:
    - Drops & re-imports the 6 canonical collections from /seeds/*.json
        admin_users, app_users, content_items, content_verses,
        verse_meanings, bhakti_items
    - Guarantees the minimum-viable data the app needs:
        * 1 super-admin (email below)
        * 1 mobile test user (email below)
        * 1 Aarti (Shri Ganesh Aarti) with per-language sync map
        * 1 Chalisa (Hanuman Chalisa) with verses

Default credentials (seeded password hash → "Test@12345"):
    Admin   : admin@example.com / Test@12345
    Mobile  : user@example.com  / Test@12345

After seeding, log in via the admin panel and CHANGE THE PASSWORDS.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# We use pymongo (sync) here because it ships with the backend's requirements
# and works in any plain Python script. The app itself uses motor (async).
try:
    from pymongo import MongoClient
except ImportError:
    sys.stderr.write("pymongo not installed. Run: pip install pymongo\n")
    sys.exit(1)


SEEDS_DIR = Path(__file__).resolve().parent
COLLECTIONS = [
    "admin_users",
    "app_users",
    "content_items",
    "content_verses",
    "verse_meanings",
    "bhakti_items",
]


def _load_json(name: str) -> list[dict]:
    path = SEEDS_DIR / f"{name}.json"
    if not path.exists():
        print(f"[skip] {name} — {path} not found")
        return []
    with path.open() as f:
        return json.load(f)


def _normalize_dates(doc: dict) -> dict:
    """mongoexport renders dates as `{"$date": "..."}` — pymongo can roundtrip
    those if we leave them as strings. Mongo will store them as strings (which
    is fine for our app since we only read them via fastapi → str)."""
    return doc


def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "sanatan_saathi")
    print(f"→ Connecting to {mongo_url}, db={db_name}")

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")  # fail fast if Mongo is unreachable
    db = client[db_name]

    total = 0
    for col in COLLECTIONS:
        docs = _load_json(col)
        if not docs:
            continue
        db[col].drop()
        # Strip $oid wrappers — pymongo can store the string _id directly,
        # which matches what the FastAPI backend expects.
        for d in docs:
            if isinstance(d.get("_id"), dict) and "$oid" in d["_id"]:
                d["_id"] = d["_id"]["$oid"]
        db[col].insert_many([_normalize_dates(d) for d in docs])
        n = db[col].count_documents({})
        print(f"  ✓ {col:25s} {n:5d} docs")
        total += n

    print(f"\n✅ Seed complete — {total} docs across {len(COLLECTIONS)} collections.")
    print("\nDefault test logins (password = Test@12345 for both):")
    for u in db["admin_users"].find({}, {"_id": 0, "email": 1, "role": 1}).limit(3):
        print(f"  admin   : {u.get('email')}  ({u.get('role')})")
    for u in db["app_users"].find({}, {"_id": 0, "email": 1}).limit(3):
        print(f"  mobile  : {u.get('email')}")
    print("\n⚠️  Change these passwords in production!")


if __name__ == "__main__":
    main()
