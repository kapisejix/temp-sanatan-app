"""
Audio-Text Synchronization Service for Sanatan Saathi.

Parses LRC lyrics format (industry standard for synced lyrics) and
normalised JSON sync maps into a unified verse-timeline structure.

LRC format:
    [00:01.50]Verse text 1
    [00:05.20]Verse text 2

Output (sync_map):
    [
      { "verse_num": 1, "start_ms": 1500, "end_ms": 5200, "text": "..." },
      { "verse_num": 2, "start_ms": 5200, "end_ms": 9000, "text": "..." },
      ...
    ]
"""
import json
import re
from typing import List, Dict, Any, Optional

LRC_TIMESTAMP_RE = re.compile(r'^\[(\d+):(\d+(?:\.\d+)?)\](.*)$')


def parse_lrc(content: str) -> List[Dict[str, Any]]:
    """Parse LRC text into a list of timed verses.

    Each line of the LRC body becomes a verse. The end_ms of verse N is
    the start_ms of verse N+1; the last verse's end_ms is left as None
    (caller can backfill from audio duration if known).
    """
    verses = []
    if not content:
        return verses
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        m = LRC_TIMESTAMP_RE.match(line)
        if not m:
            # Skip metadata lines like [ar:Artist] or [ti:Title]
            continue
        minutes = int(m.group(1))
        seconds = float(m.group(2))
        text = m.group(3).strip()
        start_ms = int((minutes * 60 + seconds) * 1000)
        verses.append({"start_ms": start_ms, "text": text})
    # Sort by start_ms
    verses.sort(key=lambda v: v["start_ms"])
    # Assign verse numbers + end_ms (start of next)
    out = []
    for i, v in enumerate(verses):
        end_ms = verses[i + 1]["start_ms"] if i + 1 < len(verses) else None
        out.append({
            "verse_num": i + 1,
            "start_ms": v["start_ms"],
            "end_ms": end_ms,
            "text": v["text"],
        })
    return out


def parse_json_sync(content: str) -> List[Dict[str, Any]]:
    """Parse JSON sync map. Accepts either a list or {sync_map: [...]} object.

    Each entry must have start_ms (or start) and may have verse_num / text / end_ms.
    """
    data = json.loads(content) if isinstance(content, str) else content
    if isinstance(data, dict) and "sync_map" in data:
        data = data["sync_map"]
    if not isinstance(data, list):
        raise ValueError("JSON sync map must be a list or {sync_map: [...]}")
    out = []
    for i, item in enumerate(data):
        start_ms = item.get("start_ms", item.get("start"))
        if start_ms is None:
            raise ValueError(f"Entry {i} missing start_ms")
        out.append({
            "verse_num": int(item.get("verse_num", i + 1)),
            "start_ms": int(start_ms),
            "end_ms": int(item["end_ms"]) if item.get("end_ms") is not None else None,
            "text": item.get("text", ""),
        })
    out.sort(key=lambda v: v["start_ms"])
    # Backfill end_ms from next start_ms where missing
    for i in range(len(out)):
        if out[i]["end_ms"] is None and i + 1 < len(out):
            out[i]["end_ms"] = out[i + 1]["start_ms"]
    return out


def parse_sync_file(filename: str, content_bytes: bytes) -> List[Dict[str, Any]]:
    """Detect format from filename extension and parse."""
    text = content_bytes.decode("utf-8", errors="replace")
    name = (filename or "").lower()
    if name.endswith(".json"):
        return parse_json_sync(text)
    # Default to LRC for .lrc, .txt, or anything else
    return parse_lrc(text)
