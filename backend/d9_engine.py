"""
Navamsa (D9) Chart Engine — deterministic divisional chart computation.
For each planet, calculate D9 rashi position from D1 longitude.
"""
RASHIS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
RASHIS_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
             "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"]


def navamsa_position(longitude_deg: float) -> int:
    """
    Compute D9 (Navamsa) rashi index (0-11) for a given celestial longitude.

    Rule:
    - D9 pada inside the rashi: floor(deg_in_sign × 9 / 30)
    - Movable signs (Aries=0, Cancer=3, Libra=6, Cap=9): D9 starts at same sign (offset 0)
    - Fixed signs   (Taurus=1, Leo=4, Scorpio=7, Aqua=10): D9 starts at 9th = offset 8
    - Dual signs    (Gemini=2, Virgo=5, Sag=8, Pisces=11): D9 starts at 5th = offset 4
    """
    rashi_idx = int(longitude_deg / 30.0)
    deg_in_sign = longitude_deg - rashi_idx * 30.0
    pada = int(deg_in_sign * 9 / 30.0)

    type_idx = rashi_idx % 3  # 0=movable, 1=fixed, 2=dual
    offset = {0: 0, 1: 8, 2: 4}[type_idx]
    d9_rashi_idx = (rashi_idx + offset + pada) % 12
    return d9_rashi_idx


def build_navamsa_chart(planets, asc_longitude):
    """
    Build D9 chart: each planet's navamsa rashi + ascendant's navamsa rashi.
    """
    d9_asc = navamsa_position(asc_longitude)
    d9_planets = []
    for p in planets:
        d9_idx = navamsa_position(p["degree"])
        d9_house = ((d9_idx - d9_asc) % 12) + 1
        d9_planets.append({
            "graha": p["graha"],
            "graha_hi": p.get("graha_hi", p["graha"]),
            "rashi_idx": d9_idx,
            "rashi": RASHIS[d9_idx],
            "rashi_hi": RASHIS_HI[d9_idx],
            "house": d9_house,
            "degree_in_sign": p["degree"] - int(p["degree"] / 30.0) * 30.0,
            "is_retrograde": p.get("is_retrograde", False),
        })
    return {
        "ascendant": {"rashi_idx": d9_asc, "rashi": RASHIS[d9_asc], "rashi_hi": RASHIS_HI[d9_asc]},
        "planets": d9_planets,
    }
