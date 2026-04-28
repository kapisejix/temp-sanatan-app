"""
Mobile-friendly endpoints + Notification Scheduler.
Provides:
  - GET /api/mobile/panchang/today — deterministic Tithi/Nakshatra/Yoga/Karana via Swiss Ephemeris
  - APScheduler daily 06:00 IST job for reminder generation (per-user)
"""
import logging
from datetime import datetime, timezone, timedelta
import swisseph as swe
import pytz

logger = logging.getLogger(__name__)


# ===================== PANCHANG (Swiss Ephemeris) =====================

TITHI_NAMES_HI = [
    "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी",
    "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी",
    "त्रयोदशी", "चतुर्दशी", "पूर्णिमा/अमावस्या",
]
NAKSHATRA_HI = [
    "अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा",
    "पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी",
    "हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा",
    "मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा",
    "पूर्वा भाद्रपद","उत्तरा भाद्रपद","रेवती",
]
YOGA_HI = [
    "विष्कुम्भ","प्रीति","आयुष्मान्","सौभाग्य","शोभन","अतिगण्ड",
    "सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव",
    "व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान",
    "परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","ऐन्द्र","वैधृति",
]
KARANA_HI = ["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि","शकुनि","चतुष्पाद","नाग","किंस्तुघ्न"]
WEEKDAY_HI = ["सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार","रविवार"]


def _rahu_kaal(weekday: int, sunrise_hour: float, sunset_hour: float):
    """Rahu Kaal — 1/8th portion of day according to weekday."""
    portions = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}  # Mon..Sun
    portion = portions.get(weekday, 1)
    day_len = sunset_hour - sunrise_hour
    if day_len <= 0:
        day_len += 24
    seg = day_len / 8.0
    start = sunrise_hour + (portion - 1) * seg
    end = start + seg

    def fmt(h):
        hh = int(h) % 24
        mm = int((h - int(h)) * 60)
        return f"{hh:02d}:{mm:02d}"
    return f"{fmt(start)} – {fmt(end)}"


def compute_today_panchang(lat: float = 28.6139, lon: float = 77.2090, tz_name: str = "Asia/Kolkata"):
    """Compute today's Panchang for given location (default Delhi)."""
    tz = pytz.timezone(tz_name)
    now_local = datetime.now(tz)
    today = now_local.date()

    # Use noon UTC of the day for tithi reference
    noon = datetime(today.year, today.month, today.day, 12, 0, tzinfo=tz)
    noon_utc = noon.astimezone(pytz.utc)
    jd = swe.julday(noon_utc.year, noon_utc.month, noon_utc.day,
                    noon_utc.hour + noon_utc.minute / 60.0)

    # Sun & Moon longitudes
    sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
    moon_lon = swe.calc_ut(jd, swe.MOON)[0][0]

    # Tithi = (Moon - Sun) / 12  (0..29; 0..14 Shukla, 15..29 Krishna)
    diff = (moon_lon - sun_lon) % 360
    tithi_idx = int(diff / 12)
    paksha = "शुक्ल पक्ष" if tithi_idx < 15 else "कृष्ण पक्ष"
    tithi_name = TITHI_NAMES_HI[tithi_idx % 15]

    # Nakshatra (Moon's nakshatra)
    nak_idx = int(moon_lon / (360.0 / 27.0))
    nakshatra = NAKSHATRA_HI[nak_idx]

    # Yoga = (Sun + Moon) / 13°20' (= 800 minutes of arc)
    yoga_val = (sun_lon + moon_lon) % 360
    yoga_idx = int(yoga_val / (360.0 / 27.0))
    yoga = YOGA_HI[yoga_idx]

    # Karana = half-tithi (0..59); first one is Bhadra special
    karana_idx = int(diff / 6)
    if karana_idx == 0:
        karana = "किंस्तुघ्न"
    elif karana_idx >= 57:
        karana = ["शकुनि","चतुष्पाद","नाग"][karana_idx - 57]
    else:
        karana = KARANA_HI[(karana_idx - 1) % 7]

    # Sunrise / Sunset
    try:
        rsmi_flag = swe.CALC_RISE
        rs = swe.rise_trans(jd - 1, swe.SUN, lon, lat, 0, 0, 0, rsmi_flag)
        ss_flag = swe.CALC_SET
        ss = swe.rise_trans(jd - 1, swe.SUN, lon, lat, 0, 0, 0, ss_flag)
        if rs[0] == 0 and ss[0] == 0:
            sunrise_jd = rs[1][0]
            sunset_jd = ss[1][0]
            # Convert JD back to local
            yr, mo, da, frac = swe.revjul(sunrise_jd)
            sunrise_utc = datetime(yr, mo, da, tzinfo=pytz.utc) + timedelta(hours=frac)
            yr2, mo2, da2, frac2 = swe.revjul(sunset_jd)
            sunset_utc = datetime(yr2, mo2, da2, tzinfo=pytz.utc) + timedelta(hours=frac2)
            sunrise_local = sunrise_utc.astimezone(tz)
            sunset_local = sunset_utc.astimezone(tz)
            sunrise_str = sunrise_local.strftime("%H:%M")
            sunset_str = sunset_local.strftime("%H:%M")
            sunrise_h = sunrise_local.hour + sunrise_local.minute / 60.0
            sunset_h = sunset_local.hour + sunset_local.minute / 60.0
        else:
            sunrise_str, sunset_str, sunrise_h, sunset_h = "06:00", "18:30", 6.0, 18.5
    except Exception as e:
        logger.warning(f"Sunrise/sunset calc fallback: {e}")
        sunrise_str, sunset_str, sunrise_h, sunset_h = "06:00", "18:30", 6.0, 18.5

    rahu_kaal = _rahu_kaal(now_local.weekday(), sunrise_h, sunset_h)

    return {
        "date": now_local.strftime("%d %B %Y"),
        "weekday_hi": WEEKDAY_HI[now_local.weekday()],
        "tithi_hi": f"{paksha} {tithi_name}",
        "nakshatra_hi": nakshatra,
        "yoga_hi": yoga,
        "karana_hi": karana,
        "sunrise": sunrise_str,
        "sunset": sunset_str,
        "rahu_kaal": rahu_kaal,
        "lat": lat, "lon": lon,
    }


# ===================== APSCHEDULER (Daily Notifications) =====================

_scheduler = None


def start_notification_scheduler(app, db):
    """Boot APScheduler with a daily 06:00 IST job that creates notifications for all users."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        logger.warning("APScheduler not installed; daily reminders disabled")
        return None

    _scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    async def job_daily_reminders():
        """Generate today's notification record for every user that has a Kundli."""
        from kundli_engine import GRAHA_MANTRA_MAP, GRAHA_NAMES_HI
        try:
            today_dt = datetime.now(timezone.utc)
            today_str = today_dt.strftime("%Y-%m-%d")
            weekday = today_dt.weekday()
            day_to_graha = {0:"Moon",1:"Mars",2:"Mercury",3:"Jupiter",4:"Venus",5:"Saturn",6:"Sun"}
            day_graha = day_to_graha[weekday]
            day_info = GRAHA_MANTRA_MAP.get(day_graha, {})

            # Build day-based notification (universal)
            day_notif = {
                "type": "day_based",
                "graha": day_graha,
                "graha_hi": GRAHA_NAMES_HI.get(day_graha, day_graha),
                "title_hi": f"आज {day_info.get('day_hi','')} है — {GRAHA_NAMES_HI.get(day_graha,'')} का दिन",
                "title_en": f"Today is {day_info.get('day','')} — {day_graha}'s day",
                "mantra": day_info.get("mantra", ""),
                "mantra_en": day_info.get("mantra_en", ""),
                "count": day_info.get("count", 108),
                "remedy_hi": day_info.get("remedy_hi", ""),
                "devta_hi": day_info.get("devta_hi", ""),
                "date": today_str,
            }

            # For every user with a kundli, build personalised notif
            kundlis = await db.kundli_data.find({}).to_list(1000)
            count = 0
            for k in kundlis:
                items = [day_notif]
                if k.get("top_recommendations"):
                    rec = k["top_recommendations"][0]
                    r = rec["recommendation"]
                    items.append({
                        "type": "personalised",
                        "graha": rec["graha"], "graha_hi": rec["graha_hi"],
                        "title_hi": f"आपकी कुंडली के अनुसार {rec['graha_hi']} शान्ति आवश्यक",
                        "title_en": f"Per your Kundli: {rec['graha']} shanti is recommended",
                        "mantra": r.get("mantra",""), "mantra_en": r.get("mantra_en",""),
                        "count": r.get("count",108),
                        "remedy_hi": r.get("remedy_hi",""),
                        "devta_hi": r.get("devta_hi",""),
                        "score": rec.get("score",0),
                        "date": today_str,
                    })
                # Sade Sati alert if active
                doshas = k.get("doshas") or {}
                ss = doshas.get("sade_sati") or {}
                if ss.get("present") and ss.get("phase") in ("PRE_PHASE", "PEAK_PHASE", "POST_PHASE"):
                    items.append({
                        "type": "sade_sati_alert",
                        "title_hi": f"साढ़े साती {ss.get('phase_hi','चल रहा')} सक्रिय",
                        "title_en": f"Sade Sati {ss.get('phase','')} active",
                        "explanation_hi": ss.get("explanation_hi", ""),
                        "severity": ss.get("severity", "MEDIUM"),
                        "date": today_str,
                    })
                await db.notifications.update_one(
                    {"user_id": k["user_id"], "date": today_str},
                    {"$set": {
                        "user_id": k["user_id"], "date": today_str,
                        "items": items,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                    upsert=True,
                )
                count += 1
            logger.info(f"Daily reminder scheduler: created {count} notifications for {today_str}")
        except Exception as e:
            logger.error(f"Daily reminder job failed: {e}")

    # Cron: 06:00 IST every day
    _scheduler.add_job(job_daily_reminders, CronTrigger(hour=6, minute=0), id="daily_reminders", replace_existing=True)
    # Also run a transit-detection job at 07:00 IST to detect Dasha changes (uses cached current_dasha vs new compute)
    _scheduler.start()
    logger.info("Notification scheduler started (06:00 IST daily)")
    return _scheduler
