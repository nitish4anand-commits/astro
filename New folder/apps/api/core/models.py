"""
Core data models for astrology calculations
Pydantic models for API validation and shared types
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


class ChartSystem(str, Enum):
    VEDIC = "vedic"
    WESTERN = "western"


class ChartInput(BaseModel):
    """Input data for chart calculation"""
    name: str = Field(..., min_length=1, max_length=200)
    local_datetime: datetime = Field(..., description="Birth date and time in local timezone")
    place: str = Field(..., description="Birth place name")
    lat: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
    lon: Optional[float] = Field(None, ge=-180, le=180, description="Longitude")
    timezone: Optional[str] = Field(None, description="IANA timezone (e.g., Asia/Kolkata)")
    unknown_time: bool = Field(False, description="If true, uses noon as default time")

    @validator("local_datetime")
    def validate_datetime(cls, v):
        # Make comparison timezone-aware
        now = datetime.now(timezone.utc)
        v_aware = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if v_aware > now:
            raise ValueError("Birth date cannot be in the future")
        if v.year < 1800:
            raise ValueError("Birth date cannot be in the future")
        if v.year < 1800:
            raise ValueError("Birth year must be after 1800")
        return v


class PlanetPosition(BaseModel):
    """Position of a celestial body"""
    name: str
    longitude: float = Field(..., ge=0, lt=360)
    latitude: float
    speed: float
    retrograde: bool
    sign: str
    degree: float
    minute: float
    second: float
    house: Optional[int] = None


class VedicPlanetPosition(PlanetPosition):
    """Vedic-specific planet data"""
    nakshatra: str
    nakshatra_lord: str
    pada: int = Field(..., ge=1, le=4)
    rashi: str
    rashi_lord: str


class Astronomy(BaseModel):
    """Raw astronomical calculations from Swiss Ephemeris"""
    utc_datetime: datetime
    julian_day: float
    planets: List[PlanetPosition]
    ascendant: float
    mc: float
    house_cusps: List[float] = Field(..., min_items=12, max_items=12)
    calculation_timestamp: datetime = Field(default_factory=datetime.utcnow)


class VedicData(BaseModel):
    """Vedic astrology calculations"""
    ayanamsa: float
    ayanamsa_name: str = "Lahiri"
    planets: List[VedicPlanetPosition]
    ascendant: VedicPlanetPosition
    moon_longitude: float
    lagna_rashi: str
    lagna_lord: str
    
    # Divisional charts
    d1_chart: Dict[int, List[str]]  # House -> [Planets]
    d9_chart: Optional[Dict[int, List[str]]] = None
    d10_chart: Optional[Dict[int, List[str]]] = None
    
    # Chart representations
    north_chart: Dict[int, List[str]]  # Diamond layout
    south_chart: Dict[int, List[str]]  # Square layout


class Aspect(BaseModel):
    """Western astrological aspect"""
    planet1: str
    planet2: str
    aspect_type: str  # conjunction, opposition, trine, square, sextile
    angle: float
    orb: float
    applying: bool


class WesternData(BaseModel):
    """Western astrology calculations"""
    planets: List[PlanetPosition]
    ascendant: PlanetPosition
    mc: PlanetPosition
    aspects: List[Aspect]
    house_system: str = "Placidus"
    
    # Dignities
    dignities: Dict[str, str]  # Planet -> dignity (exalted, detriment, etc.)


class DashaPeriod(BaseModel):
    """Vimshottari Dasha period"""
    planet: str
    level: str  # Maha, Antar, Pratyantar
    start_date: datetime
    end_date: datetime
    duration_years: float
    current: bool = False


class Transit(BaseModel):
    """Current planetary transit"""
    planet: str
    from_natal_moon: int  # House position from Moon
    from_natal_lagna: int  # House position from Lagna
    current_sign: str
    aspects_natal: List[str]  # Planets being aspected


class PredictionEvidence(BaseModel):
    """Evidence for why a prediction was generated"""
    rule_id: str
    triggered_conditions: List[str]
    triggers: List[str] = []  # Rich WHY lines with exact computed values
    weight: float
    confidence: float


class Prediction(BaseModel):
    """Single prediction with explainability"""
    id: str
    domain: str  # career, wealth, relationships, health
    system: str  # vedic, western
    tone: str  # positive, neutral, cautionary
    headline: str
    description: str
    what_this_means: List[str] = []  # 3–6 bullets, deterministic
    timeframe: str  # now, next_90_days, next_12_months
    do_suggestions: List[str]
    dont_suggestions: List[str]
    evidence: List[PredictionEvidence]
    confidence_score: float = Field(..., ge=0, le=1)


class ChartResponse(BaseModel):
    """Complete chart calculation response"""
    calculation_version: str = "1.0.0"
    input_echo: ChartInput
    
    # Core data
    astronomy: Astronomy
    vedic: VedicData
    western: WesternData
    
    # Additional calculations
    dashas: Optional[List[DashaPeriod]] = None
    transits: Optional[List[Transit]] = None
    predictions: Optional[List[Prediction]] = None
    
    # Metadata
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    chart_id: Optional[str] = None
