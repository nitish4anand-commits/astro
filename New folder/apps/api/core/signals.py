"""
Signal computation layer for deterministic, explainable features.
Produces structured signals consumed by the rules engine.
"""

from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from math import fabs

from .models import ChartResponse, VedicPlanetPosition, Transit, DashaPeriod


BENEFICS = {"Jupiter", "Venus", "Mercury", "Waxing Moon"}
MALEFICS = {"Saturn", "Mars", "Rahu", "Ketu"}

EXALTATION = {
    "Sun": "Aries", "Moon": "Taurus", "Mars": "Capricorn", "Mercury": "Virgo",
    "Jupiter": "Cancer", "Venus": "Pisces", "Saturn": "Libra"
}
DEBILITATION = {
    "Sun": "Libra", "Moon": "Scorpio", "Mars": "Cancer", "Mercury": "Pisces",
    "Jupiter": "Capricorn", "Venus": "Virgo", "Saturn": "Aries"
}
MOOLTRIKONA = {
    "Sun": "Leo", "Mars": "Aries", "Mercury": "Virgo", "Jupiter": "Sagittarius",
    "Venus": "Libra", "Saturn": "Aquarius"
}


def _sign_index(sign: str) -> int:
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    return SIGNS.index(sign)


def _house_from(base_sign: str, target_sign: str) -> int:
    return ((_sign_index(target_sign) - _sign_index(base_sign)) % 12) + 1


def compute_house_overlays(vedic: Any) -> Dict[str, Dict[str, int]]:
    """Return planet houses from Lagna and from Moon."""
    lagna_sign = vedic.ascendant.rashi
    moon_sign = next(p for p in vedic.planets if p.name == "Moon").rashi
    out: Dict[str, Dict[str, int]] = {}
    for p in vedic.planets:
        out[p.name] = {
            "from_lagna": _house_from(lagna_sign, p.rashi),
            "from_moon": _house_from(moon_sign, p.rashi)
        }
    return out


def compute_dignities(vedic: Any) -> Dict[str, str]:
    dignities: Dict[str, str] = {}
    for p in vedic.planets:
        if p.rashi == EXALTATION.get(p.name):
            dignities[p.name] = "Exalted"
        elif p.rashi == DEBILITATION.get(p.name):
            dignities[p.name] = "Debilitated"
        elif p.rashi == MOOLTRIKONA.get(p.name):
            dignities[p.name] = "Mooltrikona"
        elif p.rashi == p.rashi_lord:
            dignities[p.name] = "Own"
        else:
            dignities[p.name] = "Neutral"
    return dignities


def compute_combustion(vedic: Any) -> Dict[str, bool]:
    thresholds = {"Mercury": 12.0, "Venus": 10.0, "Mars": 17.0, "Jupiter": 11.0, "Saturn": 15.0}
    sun = next(p for p in vedic.planets if p.name == "Sun")
    out: Dict[str, bool] = {}
    for p in vedic.planets:
        if p.name in thresholds:
            diff = fabs(p.longitude - sun.longitude)
            if diff > 180:
                diff = 360 - diff
            out[p.name] = diff <= thresholds[p.name]
    return out


def compute_graha_drishti(vedic: Any) -> Dict[str, List[int]]:
    """Return special aspects by Mars/Jupiter/Saturn (houses from each)."""
    lagna_sign = vedic.ascendant.rashi
    houses = compute_house_overlays(vedic)
    out: Dict[str, List[int]] = {}
    for p in vedic.planets:
        base_house = houses[p.name]["from_lagna"]
        aspects = [7]  # 7th aspect default
        if p.name == "Mars":
            aspects += [4, 8]
        elif p.name == "Jupiter":
            aspects += [5, 9]
        elif p.name == "Saturn":
            aspects += [3, 10]
        out[p.name] = [((base_house - 1 + a) % 12) + 1 for a in aspects]
    return out


def compute_functional_benefics(lagna_sign: str) -> Dict[str, str]:
    """Very simplified functional benefic/malefic mapping by Lagna."""
    # For demonstration: benefic lords of trikonas (5,9) and kendra (1,4,7,10), malefics of 6/8/12.
    # A production-grade implementation should use detailed house lordship tables per Lagna.
    return {
        "Jupiter": "benefic",
        "Venus": "benefic",
        "Mercury": "benefic",
        "Saturn": "malefic",
        "Mars": "malefic",
        "Rahu": "malefic",
        "Ketu": "malefic"
    }


def compute_yogas(vedic: Any) -> Dict[str, bool]:
    houses = compute_house_overlays(vedic)
    planets = {p.name: p for p in vedic.planets}
    out: Dict[str, bool] = {}
    # Gajakesari: Moon and Jupiter in Kendra (1,4,7,10)
    moon_h = houses["Moon"]["from_lagna"]
    jup_h = houses["Jupiter"]["from_lagna"]
    out["Gajakesari"] = (moon_h in {1,4,7,10}) and (jup_h in {1,4,7,10})
    # Budha-Aditya: Sun+Mercury close (same sign)
    out["BudhaAditya"] = planets["Sun"].rashi == planets["Mercury"].rashi
    # Chandra-Mangal: Moon+Mars conjunction (same sign)
    out["ChandraMangal"] = planets["Moon"].rashi == planets["Mars"].rashi
    # Raja yoga (simplified): 5/9 lords interacting with 10th
    out["RajaYoga"] = (houses["Jupiter"]["from_lagna"] in {5,9}) and (houses["Sun"]["from_lagna"] == 10)
    # Dhana yoga (simplified): 2/11 houses active by benefics
    out["DhanaYoga"] = (houses["Jupiter"]["from_lagna"] in {2,11}) or (houses["Venus"]["from_lagna"] in {2,11})
    # Vipareeta Raja: 6/8/12 lords in 6/8/12 (proxy using Saturn/Mars nodes)
    out["VipareetaRaja"] = (houses["Saturn"]["from_lagna"] in {6,8,12}) and (houses["Mars"]["from_lagna"] in {6,8,12})
    return out


def compute_strengths(vedic: Any) -> Dict[str, float]:
    dignities = compute_dignities(vedic)
    combustion = compute_combustion(vedic)
    houses = compute_house_overlays(vedic)
    scores: Dict[str, float] = {}
    for p in vedic.planets:
        s = 0.5
        s += {"Exalted": 0.3, "Mooltrikona": 0.2, "Own": 0.15, "Debilitated": -0.3}.get(dignities[p.name], 0)
        h = houses[p.name]["from_lagna"]
        if h in {1,4,5,7,9,10,11}:
            s += 0.1
        if p.retrograde:
            s -= 0.05
        if combustion.get(p.name, False):
            s -= 0.1
        scores[p.name] = max(0.0, min(1.0, s))
    return scores


def dasha_context(dashas: List[DashaPeriod], vedic: Any) -> Dict[str, Any]:
    maha = next((d for d in dashas if d.level == "Maha" and d.current), None)
    antar = next((d for d in dashas if d.level == "Antar" and d.current), None)
    ctx: Dict[str, Any] = {"maha": None, "antar": None}
    houses = compute_house_overlays(vedic)
    dignities = compute_dignities(vedic)
    if maha:
        lord = maha.planet.split('/')[0]
        p = next((pl for pl in vedic.planets if pl.name == lord), None)
        if p:
            ctx["maha"] = {
                "lord": lord,
                "placement": {
                    "sign": p.rashi,
                    "degree": p.degree,
                    "nakshatra": p.nakshatra,
                    "pada": p.pada,
                    "house_from_lagna": houses[lord]["from_lagna"],
                    "house_from_moon": houses[lord]["from_moon"],
                },
                "dignity": dignities[lord],
                "start": maha.start_date.isoformat(),
                "end": maha.end_date.isoformat()
            }
    if antar:
        lord = antar.planet.split('/')[1]
        p = next((pl for pl in vedic.planets if pl.name == lord), None)
        if p:
            ctx["antar"] = {
                "lord": lord,
                "placement": {
                    "sign": p.rashi,
                    "degree": p.degree,
                    "nakshatra": p.nakshatra,
                    "pada": p.pada,
                    "house_from_lagna": houses[lord]["from_lagna"],
                    "house_from_moon": houses[lord]["from_moon"],
                },
                "dignity": dignities[lord],
                "start": antar.start_date.isoformat(),
                "end": antar.end_date.isoformat()
            }
    return ctx


def compute_transit_signals(chart: ChartResponse, transits: List[Transit]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"houses": {}, "aspects": {}, "by_planet": {}}
    for t in transits:
        out["houses"][t.planet] = {
            "from_moon": t.from_natal_moon,
            "from_lagna": t.from_natal_lagna,
            "sign": t.current_sign
        }
        out["by_planet"][t.planet] = {
            "aspects_natal": t.aspects_natal
        }
    return out


def compute_signals(chart: ChartResponse, dashas: List[DashaPeriod], transits: List[Transit]) -> Dict[str, Any]:
    vedic = chart.vedic
    sig: Dict[str, Any] = {
        "natal": {
            "houses": compute_house_overlays(vedic),
            "dignity": compute_dignities(vedic),
            "combust": compute_combustion(vedic),
            "graha_drishti": compute_graha_drishti(vedic),
            "yogas": compute_yogas(vedic),
            "strength": compute_strengths(vedic),
            "d9": vedic.d9_chart or {},
            "d10": vedic.d10_chart or {}
        },
        "dasha": dasha_context(dashas, vedic) if dashas else {},
        "transit": compute_transit_signals(chart, transits) if transits else {}
    }
    return sig
