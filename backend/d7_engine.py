"""
Saptamsa (D7) Chart Engine — divisional chart for progeny / children matters.

Rule (Parashara):
  - Each rashi is divided into 7 parts of (30/7) ≈ 4.2857° each.
  - For ODD signs (Aries, Gemini, Leo, Libra, Sag, Aquarius — i.e. rashi_idx % 2 == 0):
      D7 starts from the same sign.
  - For EVEN signs (Taurus, Cancer, Virgo, Scorpio, Cap, Pisces — rashi_idx % 2 == 1):
      D7 starts from the 7th sign (offset 6).
"""
RASHIS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
RASHIS_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
             "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"]


def saptamsa_position(longitude_deg: float) -> int:
    rashi_idx = int(longitude_deg / 30.0)
    deg_in_sign = longitude_deg - rashi_idx * 30.0
    pada = int(deg_in_sign * 7 / 30.0)  # 0..6
    # Odd signs (0-indexed even) start from same sign; even signs start from 7th
    offset = 0 if rashi_idx % 2 == 0 else 6
    return (rashi_idx + offset + pada) % 12


def build_saptamsa_chart(planets, asc_longitude):
    d7_asc = saptamsa_position(asc_longitude)
    d7_planets = []
    for p in planets:
        d7_idx = saptamsa_position(p["degree"])
        d7_house = ((d7_idx - d7_asc) % 12) + 1
        d7_planets.append({
            "graha": p["graha"],
            "graha_hi": p.get("graha_hi", p["graha"]),
            "rashi_idx": d7_idx,
            "rashi": RASHIS[d7_idx],
            "rashi_hi": RASHIS_HI[d7_idx],
            "house": d7_house,
            "degree_in_sign": p["degree"] - int(p["degree"] / 30.0) * 30.0,
            "is_retrograde": p.get("is_retrograde", False),
        })
    return {
        "ascendant": {"rashi_idx": d7_asc, "rashi": RASHIS[d7_asc], "rashi_hi": RASHIS_HI[d7_asc]},
        "planets": d7_planets,
    }
