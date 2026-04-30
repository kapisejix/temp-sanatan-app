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


def parse_json_sync(content) -> List[Dict[str, Any]]:
    """Parse flat JSON sync map. Accepts str, list, or {sync_map: [...]}.

    Each entry must have start_ms (or start) and may have verse_num / text / end_ms /
    an optional nested ``lines`` array for line-level timing.
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
        entry = {
            "verse_num": int(item.get("verse_num", item.get("verse_id", i + 1))),
            "start_ms": int(start_ms),
            "end_ms": int(item["end_ms"]) if item.get("end_ms") is not None else None,
            "text": item.get("text", ""),
        }
        # Preserve optional nested line-level timing (karaoke mode)
        if isinstance(item.get("lines"), list):
            lines_out = []
            for ln in item["lines"]:
                if not isinstance(ln, dict) or ln.get("start_ms") is None:
                    continue
                lines_out.append({
                    "text": ln.get("text", ""),
                    "start_ms": int(ln["start_ms"]),
                    "end_ms": int(ln["end_ms"]) if ln.get("end_ms") is not None else None,
                })
            entry["lines"] = lines_out
        out.append(entry)
    out.sort(key=lambda v: v["start_ms"])
    # Backfill end_ms from next start_ms where missing
    for i in range(len(out)):
        if out[i]["end_ms"] is None and i + 1 < len(out):
            out[i]["end_ms"] = out[i + 1]["start_ms"]
    return out


def parse_nested_json_sync(content) -> List[Dict[str, Any]]:
    """Parse the strict nested sync format with line-level timings.

    Expected shape:
      {
        "audio_file": "...",
        "duration_ms": 180000,
        "verses": [
          {"verse_id": 1, "start_ms": 0, "end_ms": 5000,
           "lines": [{"text": "...", "start_ms": 0, "end_ms": 2500}, ...]},
          ...
        ]
      }

    Returns a flat sync_map (verse-level) with a nested ``lines`` array per verse.
    """
    data = json.loads(content) if isinstance(content, str) else content
    if not isinstance(data, dict):
        raise ValueError("Nested sync format must be a JSON object")
    verses = data.get("verses")
    if not isinstance(verses, list) or not verses:
        raise ValueError("Missing 'verses' array")

    out = []
    for i, v in enumerate(verses):
        if not isinstance(v, dict):
            raise ValueError(f"Verse {i} is not an object")
        start_ms = v.get("start_ms")
        end_ms = v.get("end_ms")
        if start_ms is None:
            raise ValueError(f"Verse {i} missing start_ms")
        lines_raw = v.get("lines") or []
        lines_out = []
        for li, ln in enumerate(lines_raw):
            if not isinstance(ln, dict):
                continue
            ls = ln.get("start_ms")
            le = ln.get("end_ms")
            if ls is None:
                continue
            lines_out.append({
                "text": ln.get("text", ""),
                "start_ms": int(ls),
                "end_ms": int(le) if le is not None else None,
            })
        # Derive verse text by joining line texts if not provided
        verse_text = v.get("text") or " ".join(ln["text"] for ln in lines_out if ln.get("text"))
        out.append({
            "verse_num": int(v.get("verse_id", v.get("verse_num", i + 1))),
            "start_ms": int(start_ms),
            "end_ms": int(end_ms) if end_ms is not None else None,
            "text": verse_text,
            "lines": lines_out,
        })
    out.sort(key=lambda x: x["start_ms"])
    # Backfill missing end_ms
    for i in range(len(out)):
        if out[i]["end_ms"] is None and i + 1 < len(out):
            out[i]["end_ms"] = out[i + 1]["start_ms"]
    return out


def parse_sync_file(filename: str, content_bytes: bytes) -> List[Dict[str, Any]]:
    """Detect format from filename extension and parse.

    Auto-detects strict nested format (verses with lines[]) when JSON has that shape.
    Falls back to flat JSON or LRC.
    """
    text = content_bytes.decode("utf-8", errors="replace")
    name = (filename or "").lower()
    if name.endswith(".json"):
        try:
            data = json.loads(text)
        except Exception as e:
            raise ValueError(f"Invalid JSON: {e}")
        # Detect nested format: {verses:[{lines:[...]}]}
        if isinstance(data, dict) and isinstance(data.get("verses"), list) \
                and data["verses"] and isinstance(data["verses"][0], dict) \
                and "lines" in data["verses"][0]:
            return parse_nested_json_sync(data)
        return parse_json_sync(data)
    # Default to LRC for .lrc, .txt, or anything else
    return parse_lrc(text)
