"""
Dasha Insights Generator
Produces personalized Mahadasha/Antardasha themes using chart context
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import ChartResponse, DashaPeriod

# Base Mahadasha themes
MAHA_THEMES: Dict[str, List[str]] = {
    "Ketu": [
        "Simplification, detachment, spiritual inquiry",
        "Research and behind-the-scenes work prosper",
        "Reduce distractions; strengthen inner routines",
    ],
    "Venus": [
        "Harmony, relationships, aesthetics, and comforts",
        "Finance and creative collaborations are favored",
        "Build win–win partnerships",
    ],
    "Sun": [
        "Leadership, visibility, authority, and responsibility",
        "Recognition through performance and integrity",
        "Own decisions; lead fairly",
    ],
    "Moon": [
        "Home, emotions, nourishment, and wellbeing",
        "Caregiving and supportive roles prosper",
        "Stabilize habits and rest",
    ],
    "Mars": [
        "Action, courage, engineering, and competition",
        "High energy for decisive progress",
        "Channel effort; avoid conflict",
    ],
    "Rahu": [
        "Ambition, innovation, global networks, technology",
        "Unconventional paths and bold strategies",
        "Keep ethics and checks while scaling",
    ],
    "Jupiter": [
        "Growth, learning, advisory, mentorship",
        "Expansion through wisdom and prudence",
        "Share knowledge; stay realistic",
    ],
    "Saturn": [
        "Structure, discipline, accountability, foundations",
        "Gradual progress and long-term building",
        "Pace sustainably; respect constraints",
    ],
    "Mercury": [
        "Communication, analysis, commerce, and teaching",
        "Detail-oriented improvements and documentation",
        "Clarify agreements; iterate",
    ],
}

# House themes (from Moon/Lagna context simplified to general house meanings)
HOUSE_THEMES: Dict[int, str] = {
    1: "Self, vitality, and personal direction",
    2: "Finance, speech, and values",
    3: "Skills, communication, and initiatives",
    4: "Home, foundations, and emotional base",
    5: "Creativity, learning, and expression",
    6: "Service, routines, and health",
    7: "Partnerships and contracts",
    8: "Transformation, research, and shared resources",
    9: "Higher learning, travel, and guiding principles",
    10: "Career, status, and responsibility",
    11: "Gains, networks, and goals",
    12: "Rest, retreats, and expense management",
}

ANTAR_MODIFIERS: Dict[str, str] = {
    "Ketu": "Simplify and focus on essentials",
    "Venus": "Emphasize harmony and alliances",
    "Sun": "Step up leadership and visibility",
    "Moon": "Mind emotions; nurture support",
    "Mars": "Act decisively; channel energy",
    "Rahu": "Innovate carefully; validate assumptions",
    "Jupiter": "Learn, mentor, expand wisely",
    "Saturn": "Structure and persist with discipline",
    "Mercury": "Communicate clearly; refine details",
}


def _find_house_of_planet(chart: ChartResponse, planet_name: str) -> Optional[int]:
    """Find the house index containing the planet in D1 chart."""
    try:
        for house, planets in chart.vedic.d1_chart.items():
            if any(p.lower() == planet_name.lower() for p in planets):
                return int(house)
    except Exception:
        pass
    return None


def _find_nakshatra(chart: ChartResponse, planet_name: str) -> Optional[str]:
    """Get nakshatra of a given planet from vedic planets list."""
    try:
        vp = next((p for p in chart.vedic.planets if p.name.lower() == planet_name.lower()), None)
        if vp:
            return f"{vp.nakshatra} (Pada {vp.pada})"
    except Exception:
        pass
    return None


def generate_insights(chart: ChartResponse, dashas: List[DashaPeriod]) -> Dict[str, Any]:
    """Generate personalized Mahadasha/Antardasha insights."""
    current_maha = next((d for d in dashas if d.level == "Maha" and d.current), None)
    current_antar = next((d for d in dashas if d.level == "Antar" and d.current), None)

    # Fallback: use the first future/current Mahadasha if none flagged current
    if current_maha is None:
        current_maha = next((d for d in dashas if d.level == "Maha"), None)

    insights: Dict[str, Any] = {"calculated_at": datetime.utcnow().isoformat()}

    # Mahadasha insights
    if current_maha:
        maha_lord = current_maha.planet.split("/")[0]
        house = _find_house_of_planet(chart, maha_lord)
        nak = _find_nakshatra(chart, maha_lord)
        themes = MAHA_THEMES.get(maha_lord, [])
        house_line = HOUSE_THEMES.get(house) if house else None
        if house_line:
            themes = themes + [f"House {house}: {house_line}"]
        insights["mahadasha"] = {
            "planet": maha_lord,
            "period": {
                "start": current_maha.start_date.isoformat(),
                "end": current_maha.end_date.isoformat(),
            },
            "nakshatra": nak,
            "house": house,
            "themes": themes,
            "notes": [
                "Interpretations are supportive guidelines; outcomes vary by full chart.",
            ],
        }

    # Antardasha insights
    if current_antar and current_maha:
        antar_lord = current_antar.planet.split("/")[1] if "/" in current_antar.planet else current_antar.planet
        house = _find_house_of_planet(chart, antar_lord)
        nak = _find_nakshatra(chart, antar_lord)
        modifier = ANTAR_MODIFIERS.get(antar_lord)
        themes: List[str] = []
        if modifier:
            themes.append(modifier)
        house_line = HOUSE_THEMES.get(house) if house else None
        if house_line:
            themes.append(f"House {house}: {house_line}")
        insights["antardasha"] = {
            "planet": antar_lord,
            "period": {
                "start": current_antar.start_date.isoformat(),
                "end": current_antar.end_date.isoformat(),
            },
            "nakshatra": nak,
            "house": house,
            "themes": themes,
        }

    return {"insights": insights}
