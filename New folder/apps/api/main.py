"""
FastAPI Backend for Astro Kundli
Vedic + Western Astrology Calculations
"""

from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uvicorn

from core.pipeline import ChartPipeline
from core.models import ChartInput, ChartResponse
from core.dasha import VimshottariDasha
from core.transits import TransitCalculator
from core.predictions import PredictionEngine
from core.dasha_insights import generate_insights
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from db import Base, engine, get_db
from models import LocationCache, HoroscopeCache, LocationUsage
import requests
import json
from timezonefinder import TimezoneFinder
import pytz
import swisseph as swe
import math
import yaml
from datetime import date as date_cls, timedelta
import os

app = FastAPI(
    title="Astro Kundli API",
    description="Open-source Vedic + Western Astrology API",
    version="1.0.0",
    license_info={
        "name": "AGPL-3.0",
        "url": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    },
)

# Configure Swiss Ephemeris path for local/dev and containers
try:
    ephe_path = os.getenv("EPHE_PATH")
    if not ephe_path:
        here = os.path.dirname(__file__)
        candidate = os.path.abspath(os.path.join(here, "..", "..", "ephe_data"))
        ephe_path = candidate if os.path.isdir(candidate) else None
    if ephe_path:
        swe.set_ephe_path(ephe_path)
except Exception:
    pass

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://web:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted hosts to prevent Host header attacks
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "web"],
)

# Basic security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response

# Initialize engines
chart_pipeline = ChartPipeline()
dasha_engine = VimshottariDasha()
transit_calculator = TransitCalculator()
prediction_engine = PredictionEngine()

# Create tables if not exist
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    # Skip table creation errors in dev environments without proper DB
    pass


@app.get("/")
async def root():
    return {
        "name": "Astro Kundli API",
        "version": "1.0.0",
        "license": "AGPL-3.0",
        "swiss_ephemeris": "Included (AGPL compliant)",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Debug endpoint to inspect which app is running and routes registered
@app.get("/debug/info")
async def debug_info():
    try:
        routes = []
        for r in app.routes:
            try:
                routes.append(getattr(r, "path", str(r)))
            except Exception:
                pass
        return {
            "module_file": __file__,
            "route_count": len(routes),
            "routes": routes[:200],
        }
    except Exception as e:
        return {"error": str(e)}


# -------- GEO ENDPOINTS ---------

class GeoQuery(BaseModel):
    query: str


class ReverseQuery(BaseModel):
    lat: float
    lon: float


@app.post("/api/geo/search")
async def geo_search(payload: GeoQuery, db: Session = Depends(get_db)):
    q = payload.query.strip()
    if not q:
        return []
    # check cache
    try:
        cached = (
            db.query(LocationCache)
            .filter(LocationCache.query == q, LocationCache.provider == "nominatim")
            .order_by(LocationCache.created_at.desc())
            .first()
        )
        if cached:
            return cached.result_json
    except Exception:
        cached = None
    # Nominatim
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": q, "format": "json", "addressdetails": 1, "limit": 5}
    headers = {"User-Agent": "AstroKundli/1.0 (AGPL)"}
    r = requests.get(url, params=params, headers=headers, timeout=10)
    r.raise_for_status()
    items = r.json()
    tf = TimezoneFinder()
    results = []
    for it in items:
        lat = float(it.get("lat"))
        lon = float(it.get("lon"))
        tz = tf.timezone_at(lng=lon, lat=lat) or "UTC"
        results.append({
            "name": it.get("display_name"),
            "lat": lat,
            "lon": lon,
            "tz": tz,
        })
    try:
        db.add(LocationCache(query=q, provider="nominatim", result_json=results))
        db.commit()
    except Exception:
        pass
    return results


@app.post("/api/geo/reverse")
async def geo_reverse(payload: ReverseQuery, db: Session = Depends(get_db)):
    lat = float(payload.lat)
    lon = float(payload.lon)
    tf = TimezoneFinder()
    tz = tf.timezone_at(lng=lon, lat=lat) or "UTC"
    # cache key
    q = f"reverse:{round(lat,3)},{round(lon,3)}"
    try:
        cached = (
            db.query(LocationCache)
            .filter(LocationCache.query == q, LocationCache.provider == "nominatim")
            .order_by(LocationCache.created_at.desc())
            .first()
        )
        if cached:
            return {**cached.result_json, "tz": tz}
    except Exception:
        cached = None
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lon, "format": "json", "zoom": 10}
    headers = {"User-Agent": "AstroKundli/1.0 (AGPL)"}
    r = requests.get(url, params=params, headers=headers, timeout=10)
    r.raise_for_status()
    j = r.json()
    name = j.get("display_name") or j.get("name") or f"{lat:.3f}, {lon:.3f}"
    result = {"name": name, "lat": lat, "lon": lon, "tz": tz}
    try:
        db.add(LocationCache(query=q, provider="nominatim", result_json=result))
        db.commit()
    except Exception:
        pass
    return result


# -------- HOROSCOPE ENGINE ---------

RASHIS = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]
NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
    "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshta",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

def sidereal(longitude: float) -> float:
    # Lahiri ayanamsa
    ayan = swe.get_ayanamsa_ut(swe.julday(2000,1,1,0.0))  # not precise; simplified
    return (longitude - ayan) % 360.0

def nakshatra_of(moon_long_sid: float) -> str:
    idx = int((moon_long_sid % 360.0) / (360.0/27))
    return NAKSHATRAS[idx]

def tithi(sun_long: float, moon_long: float) -> int:
    diff = (moon_long - sun_long) % 360.0
    return int(diff / 12.0) + 1

def yoga(sun_long: float, moon_long: float) -> int:
    s = (sun_long + moon_long) % 360.0
    return int(s / (360.0/27)) + 1

def karana(tithi_num: int) -> int:
    return ((tithi_num - 1) * 2) % 60 + 1

def compute_sunrise_utc(lat: float, lon: float, dt: date_cls) -> datetime:
    # Using swe for sunrise (approximate). Fall back to 06:00 UTC if Swiss Ephemeris is unavailable.
    try:
        jd0 = swe.julday(dt.year, dt.month, dt.day, 0.0)
        rs = swe.rise_trans(jd0, body=swe.SUN, lon=lon, lat=lat, rsmi=swe.CALC_RISE)
        jd_rise = rs[1] if isinstance(rs, tuple) else jd0 + 0.25
        # Convert JD to UTC datetime
        z = int(jd_rise + 0.5)
        f = jd_rise + 0.5 - z
        A = int((z - 1867216.25)/36524.25)
        a = z + 1 + A - int(A/4)
        b = a + 1524
        c = int((b - 122.1)/365.25)
        d = int(365.25 * c)
        e = int((b - d)/30.6001)
        day = b - d - int(30.6001*e) + f
        month = e - 1 if e < 14 else e - 13
        year = c - 4716 if month > 2 else c - 4715
        day_floor = int(day)
        frac = day - day_floor
        hour = int(frac * 24)
        minute = int((frac*24 - hour) * 60)
        second = int((((frac*24 - hour) * 60) - minute) * 60)
        return datetime(year, month, day_floor, hour, minute, second)
    except Exception:
        # Safe fallback to avoid 500s during sunrise computation
        return datetime(dt.year, dt.month, dt.day, 6, 0, 0)

def round_coord(x: float, step: float = 0.05) -> float:
    return round(round(x/step)*step, 2)

def planet_longitudes_utc(dt: datetime) -> dict:
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute/60 + dt.second/3600)
    bodies = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mars": swe.MARS,
        "Mercury": swe.MERCURY,
        "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS,
        "Saturn": swe.SATURN,
        "Rahu": swe.MEAN_NODE,
        "Ketu": swe.MEAN_NODE,  # opposite of Rahu
    }
    out = {}
    for name, code in bodies.items():
        lon = swe.calc_ut(jd, code)[0][0]
        if name == "Ketu":
            lon = (lon + 180.0) % 360.0
        out[name] = lon
    return out

def sign_from_long_sid(lon_sid: float) -> str:
    return RASHIS[int(lon_sid // 30) % 12]

def narrative_from_rules(basis: str, sign: str, facts: dict) -> tuple[str, dict, dict, dict, dict]:
    # Simplified deterministic narrative using planet placements and panchang
    moonsid = facts.get("moon_long_sid", 0.0)
    sunsid = facts.get("sun_long_sid", 0.0)
    t = facts.get("tithi")
    nak = facts.get("nakshatra")
    weekday = facts.get("weekday")
    strengths = []
    cautions = []
    remedy = "Maintain balance and observe moderation throughout the day."
    scores = {"health":3, "finance":3, "career":3, "love":3}
    # Basic signals
    if sign in ("Cancer","Leo"):
        strengths.append("Leadership and visibility favor progress today.")
        scores["career"] += 1
    if nak in ("Pushya","Rohini","Revati"):
        strengths.append("Supportive nakshatra promotes stability and nurturance.")
        scores["love"] += 1
    if t in (8, 14):
        cautions.append("Avoid overextending commitments; keep tasks realistic.")
        scores["health"] -= 1
    if weekday in ("Saturday","Tuesday"):
        cautions.append("Be patient in face of delays; steady effort wins.")
    title = f"{basis.replace('_',' ').title()} — {sign}: Steady focus and clarity"
    body = (
        f"With the Moon in {sign}, today's tone emphasizes grounded choices and patient progress. "
        f"The nakshatra {nak} shapes interactions with a steady rhythm, while tithi {t} calls for balanced action. "
        f"Make space for careful planning and follow-through. Collaborations benefit from transparent communication. "
        f"Use the day's momentum to consolidate gains rather than overreach."
    )
    highlights = strengths[:3]
    cautions = cautions[:3]
    facts_out = {
        "moon_sign": sign_from_long_sid(moonsid),
        "sun_sign": sign_from_long_sid(sunsid),
        "nakshatra": nak,
        "tithi": t,
        "weekday": weekday,
    }
    return title, body, highlights, cautions, remedy, scores, facts_out


@app.get("/api/horoscope/today")
async def horoscope_today(
    basis: str = Query(..., pattern="^(moon_sign|sun_sign|lagna)$"),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    tz: str | None = None,
    db: Session = Depends(get_db),
):
    basis = basis.lower()
    if basis not in ("moon_sign","sun_sign","lagna"):
        raise HTTPException(400, detail="Invalid basis")
    tf = TimezoneFinder()
    tzname = tz or (tf.timezone_at(lng=float(lon), lat=float(lat)) or "UTC")
    tzobj = pytz.timezone(tzname)
    today_local = datetime.now(tzobj).date()
    return await _horoscope_for_date(today_local, basis, lat, lon, tzname, db)


@app.get("/api/horoscope/{d}")
async def horoscope_date(
    d: str,
    basis: str = Query(..., pattern="^(moon_sign|sun_sign|lagna)$"),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    tz: str | None = None,
    db: Session = Depends(get_db),
):
    basis = basis.lower()
    if basis not in ("moon_sign","sun_sign","lagna"):
        raise HTTPException(400, detail="Invalid basis")
    tf = TimezoneFinder()
    tzname = tz or (tf.timezone_at(lng=float(lon), lat=float(lat)) or "UTC")
    if tz and tz not in pytz.all_timezones:
        raise HTTPException(400, detail="Invalid timezone")
    try:
        dt = datetime.strptime(d, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(400, detail="Invalid date")
    return await _horoscope_for_date(dt, basis, lat, lon, tzname, db)


async def _horoscope_for_date(day: date_cls, basis: str, lat: float, lon: float, tzname: str, db: Session):
    lat_r = round_coord(lat)
    lon_r = round_coord(lon)
    # record usage
    try:
        db.add(LocationUsage(tz=tzname, lat_round=lat_r, lon_round=lon_r))
        db.commit()
    except Exception:
        pass
    # compute sunrise local
    sunrise_utc = compute_sunrise_utc(lat, lon, day)
    tzobj = pytz.timezone(tzname)
    sunrise_local = sunrise_utc.replace(tzinfo=pytz.UTC).astimezone(tzobj)
    # Attempt cache retrieval for lagna-based requests
    if basis == "lagna":
        cached = (
            db.query(HoroscopeCache)
            .filter(
                HoroscopeCache.date == day,
                HoroscopeCache.tz == tzname,
                HoroscopeCache.lat_round == lat_r,
                HoroscopeCache.lon_round == lon_r,
                HoroscopeCache.basis == basis,
            )
            .order_by(HoroscopeCache.updated_at.desc())
            .first()
        )
        if cached:
            return {
                "date": str(day),
                "tz": tzname,
                "lagna_sign": cached.lagna_sign,
                "title": cached.title,
                "body_md": cached.body_md,
                "highlights": cached.highlights,
                "cautions": cached.cautions,
                "remedy": cached.remedy,
                "scores": cached.scores,
                "astro_facts": cached.astro_facts,
                "next_change": (sunrise_local + timedelta(hours=2)).isoformat(),
            }
    longs = planet_longitudes_utc(sunrise_utc)
    moon_sid = sidereal(longs["Moon"])
    sun_sid = sidereal(longs["Sun"])
    t = tithi(longs["Sun"], longs["Moon"])
    nak = nakshatra_of(moon_sid)
    weekday = sunrise_local.strftime("%A")
    base_facts = {
        "sunrise_local": sunrise_local.isoformat(),
        "moon_long_sid": moon_sid,
        "sun_long_sid": sun_sid,
        "tithi": t,
        "nakshatra": nak,
        "weekday": weekday,
    }
    rows = []
    if basis in ("moon_sign","sun_sign"):
        # try cache: fetch any existing rows for this key
        try:
            cached_rows = (
                db.query(HoroscopeCache)
                .filter(
                    HoroscopeCache.date == day,
                    HoroscopeCache.tz == tzname,
                    HoroscopeCache.lat_round == lat_r,
                    HoroscopeCache.lon_round == lon_r,
                    HoroscopeCache.basis == basis,
                )
                .all()
            )
        except Exception:
            cached_rows = []
        if cached_rows and len(cached_rows) >= 12:
            for rec in cached_rows:
                rows.append({
                    "date": str(day),
                    "basis": basis,
                    "sign": rec.rashi or "",
                    "title": rec.title,
                    "body_md": rec.body_md,
                    "highlights": rec.highlights,
                    "cautions": rec.cautions,
                    "remedy": rec.remedy,
                    "scores": rec.scores,
                    "astro_facts": rec.astro_facts,
                })
            # sort rows by RASHIS order
            rows.sort(key=lambda r: RASHIS.index(r["sign"]) if r["sign"] in RASHIS else 99)
            return {"date": str(day), "tz": tzname, "cards": rows}

        # compute and upsert 12 sign cards
        for s in RASHIS:
            title, body, highlights, cautions, remedy, scores, facts_out = narrative_from_rules(basis, s, base_facts)
            rows.append({
                "date": str(day),
                "basis": basis,
                "sign": s,
                "title": title,
                "body_md": body,
                "highlights": highlights,
                "cautions": cautions,
                "remedy": remedy,
                "scores": scores,
                "astro_facts": facts_out,
            })
            try:
                existing = (
                    db.query(HoroscopeCache)
                    .filter(
                        HoroscopeCache.date == day,
                        HoroscopeCache.tz == tzname,
                        HoroscopeCache.lat_round == lat_r,
                        HoroscopeCache.lon_round == lon_r,
                        HoroscopeCache.basis == basis,
                        HoroscopeCache.rashi == s,
                    )
                    .first()
                )
                if existing:
                    existing.title = title
                    existing.body_md = body
                    existing.highlights = highlights
                    existing.cautions = cautions
                    existing.remedy = remedy
                    existing.scores = scores
                    existing.astro_facts = facts_out
                else:
                    db.add(HoroscopeCache(
                        date=day,
                        tz=tzname,
                        lat_round=lat_r,
                        lon_round=lon_r,
                        basis=basis,
                        rashi=s,
                        title=title,
                        body_md=body,
                        highlights=highlights,
                        cautions=cautions,
                        remedy=remedy,
                        scores=scores,
                        astro_facts=facts_out,
                    ))
            except Exception:
                pass
        try:
            db.commit()
        except Exception:
            pass
        return {"date": str(day), "tz": tzname, "cards": rows}
    else:
        # lagna-based single result
        # estimate current ascendant sign from ChartPipeline if available
        try:
            inp = ChartInput(
                name="LagnaCompute",
                local_datetime=sunrise_local,
                place=f"{lat_r},{lon_r}",
                lat=lat,
                lon=lon,
                timezone=tzname,
            )
            chart = chart_pipeline.calculate(inp)
            lagna_sign = chart.vedic.lagna_rashi
        except Exception:
            lagna_sign = sign_from_long_sid(sidereal(longs["Sun"]))
        title, body, highlights, cautions, remedy, scores, facts_out = narrative_from_rules(basis, lagna_sign, base_facts)
        # crude next change estimate: +2h
        next_change_ts = (sunrise_local + timedelta(hours=2)).isoformat()
        # upsert cache row
        try:
            existing = (
                db.query(HoroscopeCache)
                .filter(
                    HoroscopeCache.date == day,
                    HoroscopeCache.tz == tzname,
                    HoroscopeCache.lat_round == lat_r,
                    HoroscopeCache.lon_round == lon_r,
                    HoroscopeCache.basis == basis,
                )
                .first()
            )
            if existing:
                existing.lagna_sign = lagna_sign
                existing.title = title
                existing.body_md = body
                existing.highlights = highlights
                existing.cautions = cautions
                existing.remedy = remedy
                existing.scores = scores
                existing.astro_facts = facts_out
            else:
                db.add(
                    HoroscopeCache(
                        date=day,
                        tz=tzname,
                        lat_round=lat_r,
                        lon_round=lon_r,
                        basis=basis,
                        lagna_sign=lagna_sign,
                        title=title,
                        body_md=body,
                        highlights=highlights,
                        cautions=cautions,
                        remedy=remedy,
                        scores=scores,
                        astro_facts=facts_out,
                    )
                )
            db.commit()
        except Exception:
            pass
        return {
            "date": str(day),
            "tz": tzname,
            "lagna_sign": lagna_sign,
            "title": title,
            "body_md": body,
            "highlights": highlights,
            "cautions": cautions,
            "remedy": remedy,
            "scores": scores,
            "astro_facts": facts_out,
            "next_change": next_change_ts,
        }


@app.post("/v1/chart", response_model=ChartResponse)
async def create_chart(input_data: ChartInput):
    """
    Generate complete birth chart (Vedic + Western)
    
    Pipeline:
    1. Input normalization
    2. Geo + Timezone resolution → UTC
    3. Swiss Ephemeris calculations
    4. Vedic transforms (sidereal, ayanamsa, nakshatras, vargas)
    5. Western transforms (tropical, aspects)
    """
    try:
        chart = chart_pipeline.calculate(input_data)
        return chart
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/dasha/vimshottari")
async def calculate_vimshottari_dasha(input_data: ChartInput):
    """
    Calculate Vimshottari Dasha periods (Maha + Antar + Pratyantar)
    """
    try:
        chart = chart_pipeline.calculate(input_data)
        dashas = dasha_engine.calculate(chart.vedic.moon_longitude)
        return {
            "calculation_version": "1.0.0",
            "input_echo": input_data.dict(),
            "dashas": dashas,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/transits")
async def calculate_transits(input_data: ChartInput, date: Optional[str] = None):
    """
    Calculate current transits (Gochar) for birth chart
    """
    try:
        chart = chart_pipeline.calculate(input_data)
        transit_date = datetime.fromisoformat(date) if date else datetime.utcnow()
        transits = transit_calculator.calculate(chart, transit_date)
        return {
            "calculation_version": "1.0.0",
            "input_echo": input_data.dict(),
            "transits": transits,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/predictions")
async def generate_predictions(input_data: ChartInput):
    """
    Generate predictions using Rule DSL engine
    Returns: Now, Next 90 days, Next 12 months predictions with evidence
    """
    try:
        chart = chart_pipeline.calculate(input_data)
        dashas = dasha_engine.calculate(chart.vedic.moon_longitude)
        transits = transit_calculator.calculate(chart, datetime.utcnow())
        
        result = prediction_engine.generate(chart, dashas, transits)
        # Backward-compatible shape: if engine returned only predictions dict, keep as-is.
        # If engine returned {predictions, summary}, expose both at top-level.
        if isinstance(result, dict) and "predictions" in result:
            return {
                "calculation_version": "1.0.0",
                "input_echo": input_data.dict(),
                "predictions": result["predictions"],
                "summary": result.get("summary")
            }
        else:
            return {
                "calculation_version": "1.0.0",
                "input_echo": input_data.dict(),
                "predictions": result,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/dasha/insights")
async def dasha_insights(input_data: ChartInput):
    """
    Generate personalized Mahadasha/Antardasha insights using chart context
    """
    try:
        chart = chart_pipeline.calculate(input_data)
        dashas = dasha_engine.calculate(chart.vedic.moon_longitude)
        insights = generate_insights(chart, dashas)
        return {
            "calculation_version": "1.0.0",
            "input_echo": input_data.dict(),
            **insights,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
else:
    # Ensure a minimal alias route is available even if older routers are missing
    @app.get("/api/horoscope/today2")
    async def horoscope_today2(basis: str, lat: float, lon: float, tz: str | None = None, db: Session = Depends(get_db)):
        basis = basis.lower()
        if basis not in ("moon_sign","sun_sign","lagna"):
            raise HTTPException(400, detail="Invalid basis")
        tf = TimezoneFinder()
        tzname = tz or (tf.timezone_at(lng=float(lon), lat=float(lat)) or "UTC")
        if tz and tz not in pytz.all_timezones:
            raise HTTPException(400, detail="Invalid timezone")
        tzobj = pytz.timezone(tzname)
        today_local = datetime.now(tzobj).date()
        return await _horoscope_for_date(today_local, basis, lat, lon, tzname, db)
