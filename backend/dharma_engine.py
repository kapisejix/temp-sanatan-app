"""
Dharma Engine — rule-based personalized daily guidance.

Combines:
  - User Kundli (weak/strong planets, current MD/AD/PD, ascendant)
  - Panchang of the day (tithi, nakshatra, yoga, karana, flags)
  - Festival detections

Uses a JSON rule catalogue (`dharma_rules.json`) with ~70 rules
across weekday / dasha / tithi / nakshatra / yoga / festival /
Bhadra / Panchak categories. Each rule has a priority score.

Output: Top N personalized suggestion cards, de-duplicated by
`focus_planet`, sorted by priority.

Performance: pure-python, runs in <5ms for all rules on one
panchang+kundli dict. Cache the rule catalogue at import time.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------- Load rule catalogue once ----------

_RULES_PATH = Path(__file__).parent / "dharma_rules.json"
with _RULES_PATH.open() as _f:
    _CATALOGUE = json.load(_f)
PLANET_DEITY_MANTRA: Dict[str, Dict[str, Any]] = _CATALOGUE["planet_deity_mantra"]
RULES: List[Dict[str, Any]] = _CATALOGUE["rules"]


# ---------- Helpers ----------

def _get_weak_planets(graha_scores: List[Dict[str, Any]]) -> List[str]:
    """A planet is 'weak' if score >= 60 (higher = more afflicted per our scoring)."""
    return [s["graha"] for s in (graha_scores or []) if s.get("score", 0) >= 60]


def _get_strong_planets(graha_scores: List[Dict[str, Any]]) -> List[str]:
    return [s["graha"] for s in (graha_scores or []) if s.get("score", 0) <= 30]


def _tithi_in_paksha(idx30: int) -> int:
    return idx30 % 15


def _rule_matches(rule: Dict[str, Any], ctx: Dict[str, Any]) -> bool:
    """Check if every condition in the rule is satisfied by the context.

    ctx must contain:
      weekday, weak_planets[list], strong_planets[list], mahadasha, antardasha, pratyantardasha,
      tithi_index, tithi_in_paksha, nakshatra_index, yoga_index, karana_index,
      is_bhadra, is_panchak, festival_keys[list]
    """
    conds = rule.get("conditions", {})
    for key, want in conds.items():
        if key == "weekday":
            if ctx.get("weekday") != want: return False
        elif key == "weak_planet":
            if want not in (ctx.get("weak_planets") or []): return False
        elif key == "strong_planet":
            if want not in (ctx.get("strong_planets") or []): return False
        elif key == "mahadasha":
            if ctx.get("mahadasha") != want: return False
        elif key == "antardasha":
            if ctx.get("antardasha") != want: return False
        elif key == "pratyantardasha":
            if ctx.get("pratyantardasha") != want: return False
        elif key == "tithi_index":
            if ctx.get("tithi_index") != want: return False
        elif key == "tithi_in_paksha":
            if ctx.get("tithi_in_paksha") != want: return False
        elif key == "nakshatra_index":
            if ctx.get("nakshatra_index") != want: return False
        elif key == "yoga_index":
            if ctx.get("yoga_index") != want: return False
        elif key == "karana_index":
            if ctx.get("karana_index") != want: return False
        elif key == "is_bhadra":
            if bool(ctx.get("is_bhadra")) != bool(want): return False
        elif key == "is_panchak":
            if bool(ctx.get("is_panchak")) != bool(want): return False
        elif key == "focus_planet":
            # Check that the focus_planet is at least relevant to the user
            # For pure weekday rules, this is always acceptable
            pass
        elif key == "has_festival_key":
            if want not in (ctx.get("festival_keys") or []): return False
        else:
            # Unknown condition — fail safe
            return False
    return True


def _card_from_rule(rule: Dict[str, Any], panchang: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Hydrate a rule into a guidance card using the planet→deity→mantra DB."""
    focus = rule.get("focus_planet") or rule.get("conditions", {}).get("focus_planet")
    if not focus:
        return None
    deity = PLANET_DEITY_MANTRA.get(focus)
    if not deity:
        return None
    reason = rule.get("reason_hi") or ""
    tithi = panchang.get("tithi_hi", "")
    # Embed a today-context line into the card for richness
    context_line = f"{panchang.get('weekday_hi','')} · {tithi}"
    if panchang.get("nakshatra_hi"):
        context_line += f" · नक्षत्र: {panchang['nakshatra_hi']}"
    return {
        "rule_id": rule["id"],
        "priority": rule.get("priority", 0),
        "focus_planet": focus,
        "focus_planet_hi": deity["graha_hi"],
        "deity_hi": deity["deity_hi"],
        "mantra": deity["mantra"],
        "chant_count": deity.get("count", 108),
        "reason_hi": reason,
        "context_hi": context_line,
        "actions": deity.get("actions", []),
        "offering_hi": deity.get("offering"),
        "color_hi": deity.get("color"),
        "day_hi": deity.get("day_hi"),
    }


# ---------- Entry point ----------

def build_dharma_guidance(
    panchang: Dict[str, Any],
    kundli: Optional[Dict[str, Any]] = None,
    festivals: Optional[List[Dict[str, Any]]] = None,
    top_n: int = 5,
) -> Dict[str, Any]:
    """Generate personalized daily guidance cards.

    panchang — output of panchang_engine.compute_panchang()
    kundli   — user's kundli doc (may be None for anonymous / public guidance)
    festivals — list from festival_engine.detect_festivals() (optional)
    top_n    — max cards to return after de-dup + sort

    Returns:
      {
        cards: [ ... top_n guidance cards ... ],
        summary: { weak_planets, mahadasha, festivals, flags },
        is_personalized: bool (True if kundli was provided)
      }
    """
    weak_planets = _get_weak_planets(kundli.get("graha_scores", []) if kundli else [])
    strong_planets = _get_strong_planets(kundli.get("graha_scores", []) if kundli else [])
    current_dasha = (kundli or {}).get("current_dasha") or {}
    md_planet = (current_dasha.get("mahadasha") or {}).get("planet")
    ad_planet = (current_dasha.get("antardasha") or {}).get("planet")
    pd_planet = (current_dasha.get("pratyantardasha") or {}).get("planet")

    # Convert panchang weekday to Python Mon=0 if needed
    weekday_hi = panchang.get("weekday_hi", "")
    hi_to_py = {"सोमवार":0,"मंगलवार":1,"बुधवार":2,"गुरुवार":3,"शुक्रवार":4,"शनिवार":5,"रविवार":6}
    weekday_py = hi_to_py.get(weekday_hi, 0)

    festival_keys = [f["key"] for f in (festivals or [])]

    ctx = {
        "weekday": weekday_py,
        "weak_planets": weak_planets,
        "strong_planets": strong_planets,
        "mahadasha": md_planet,
        "antardasha": ad_planet,
        "pratyantardasha": pd_planet,
        "tithi_index": panchang.get("tithi_index", 0),
        "tithi_in_paksha": _tithi_in_paksha(panchang.get("tithi_index", 0)),
        "nakshatra_index": panchang.get("nakshatra_index", 0),
        "yoga_index": panchang.get("yoga_index", 0),
        "karana_index": panchang.get("karana_index", 0),
        "is_bhadra": panchang.get("is_bhadra", False),
        "is_panchak": panchang.get("is_panchak", False),
        "festival_keys": festival_keys,
    }

    # Run rules
    matches = []
    for rule in RULES:
        if _rule_matches(rule, ctx):
            matches.append(rule)

    # Anonymous users (no kundli) still get weekday / tithi / festival guidance
    # but rules that require weak_planet / mahadasha / antardasha won't fire.

    # Hydrate and de-dup by focus_planet (keep highest priority card)
    cards_by_planet: Dict[str, Dict[str, Any]] = {}
    for rule in matches:
        card = _card_from_rule(rule, panchang)
        if not card: continue
        key = card["focus_planet"]
        cur = cards_by_planet.get(key)
        if cur is None or card["priority"] > cur["priority"]:
            cards_by_planet[key] = card
        elif card["priority"] == cur["priority"]:
            # Merge reasons for same priority
            if card["reason_hi"] not in cur["reason_hi"]:
                cur["reason_hi"] = cur["reason_hi"] + " · " + card["reason_hi"]

    cards = list(cards_by_planet.values())
    cards.sort(key=lambda c: c["priority"], reverse=True)
    cards = cards[:top_n]

    return {
        "cards": cards,
        "summary": {
            "weak_planets": weak_planets,
            "strong_planets": strong_planets,
            "mahadasha": md_planet,
            "antardasha": ad_planet,
            "pratyantardasha": pd_planet,
            "festivals": [f["name_hi"] for f in (festivals or [])],
            "flags": {
                "is_bhadra": panchang.get("is_bhadra", False),
                "is_panchak": panchang.get("is_panchak", False),
            },
        },
        "is_personalized": bool(kundli),
        "rules_matched": len(matches),
        "rules_total": len(RULES),
    }
