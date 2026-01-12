import os
import time
from datetime import datetime, timedelta, date as date_cls
import pytz
from sqlalchemy.orm import Session
from db import SessionLocal
from models import LocationUsage
import requests


def top_locations(session: Session, since_days: int = 30, limit: int = 10):
    cutoff = datetime.utcnow() - timedelta(days=since_days)
    rows = session.execute(
        """
        SELECT tz, lat_round, lon_round, COUNT(*) as c
        FROM location_usage
        WHERE hit_at >= :cut
        GROUP BY 1,2,3
        ORDER BY c DESC
        LIMIT :lim
        """,
        {"cut": cutoff, "lim": limit},
    ).fetchall()
    return rows


def refresh_for_today(tz: str, lat_round: float, lon_round: float):
    base = os.getenv("API_URL", "http://api:8000")
    today = datetime.now(pytz.timezone(tz)).date().isoformat()
    for basis in ("moon_sign","sun_sign"):
        try:
            requests.get(f"{base}/api/horoscope/{today}", params={
                "basis": basis,
                "lat": lat_round,
                "lon": lon_round,
                "tz": tz,
            }, timeout=30)
        except Exception:
            pass


def refresh_lagna_hourly(tz: str, lat_round: float, lon_round: float):
    base = os.getenv("API_URL", "http://api:8000")
    try:
        requests.get(f"{base}/api/horoscope/today", params={
            "basis": "lagna",
            "lat": lat_round,
            "lon": lon_round,
            "tz": tz,
        }, timeout=30)
    except Exception:
        pass


def main():
    while True:
        try:
            with SessionLocal() as session:
                locs = top_locations(session)
                now_utc = datetime.utcnow()
                for tz, lat_r, lon_r, _ in locs:
                    # Daily refresh near midnight in local tz
                    local_now = now_utc.replace(tzinfo=pytz.UTC).astimezone(pytz.timezone(tz))
                    if local_now.hour == 0 and local_now.minute < 15:
                        refresh_for_today(tz, float(lat_r), float(lon_r))
                    # Hourly lagna refresh
                    if local_now.minute < 5:
                        refresh_lagna_hourly(tz, float(lat_r), float(lon_r))
        except Exception:
            pass
        time.sleep(60)


if __name__ == "__main__":
    main()
