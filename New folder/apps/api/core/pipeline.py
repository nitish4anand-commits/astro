"""
5-Layer Chart Calculation Pipeline
Layer 1: Input normalization
Layer 2: Geo + Timezone resolution
Layer 3: Swiss Ephemeris calculations
Layer 4: Vedic transformations
Layer 5: Western transformations
"""

import swisseph as swe
from datetime import datetime, timezone
from typing import Tuple, Dict, List
import pytz
from timezonefinder import TimezoneFinder
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import re

from .models import (
    ChartInput, ChartResponse, Astronomy, VedicData, WesternData,
    PlanetPosition, VedicPlanetPosition, Aspect
)


class ChartPipeline:
    """Main chart calculation pipeline"""
    
    # Planet IDs for Swiss Ephemeris
    PLANETS = {
        'Sun': swe.SUN,
        'Moon': swe.MOON,
        'Mercury': swe.MERCURY,
        'Venus': swe.VENUS,
        'Mars': swe.MARS,
        'Jupiter': swe.JUPITER,
        'Saturn': swe.SATURN,
        'Rahu': swe.MEAN_NODE,  # North Node
        'Ketu': swe.MEAN_NODE,  # South Node (180° from Rahu)
    }
    
    # Zodiac signs
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    
    # Nakshatras (27 lunar mansions)
    NAKSHATRAS = [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
        "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
        "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
        "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
    ]
    
    # Nakshatra lords
    NAKSHATRA_LORDS = [
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter",
        "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon",
        "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu",
        "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
    ]
    
    # Rashi (sign) lords
    RASHI_LORDS = {
        "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
        "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
        "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
        "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
    }
    
    def __init__(self):
        """Initialize Swiss Ephemeris"""
        swe.set_ephe_path('/app/ephe')  # Docker path
        self.tf = TimezoneFinder()
        # Nominatim with short timeout and default domain
        self.geolocator = Nominatim(user_agent="astro_kundli", timeout=5)
    
    def calculate(self, input_data: ChartInput) -> ChartResponse:
        """Execute full 5-layer pipeline"""
        
        # Layer 1: Input normalization
        normalized = self._normalize_input(input_data)
        
        # Layer 2: Geo + Timezone resolution
        utc_dt, lat, lon, tz_name = self._resolve_location(normalized)
        
        # Layer 3: Swiss Ephemeris calculations
        astronomy = self._calculate_astronomy(utc_dt, lat, lon)
        
        # Layer 4: Vedic transformations
        vedic = self._calculate_vedic(astronomy, lat, lon)
        
        # Layer 5: Western transformations
        western = self._calculate_western(astronomy)
        
        return ChartResponse(
            input_echo=input_data,
            astronomy=astronomy,
            vedic=vedic,
            western=western
        )
    
    def _normalize_input(self, input_data: ChartInput) -> ChartInput:
        """Layer 1: Normalize and validate input"""
        if input_data.unknown_time:
            # Set time to noon if unknown
            dt = input_data.local_datetime.replace(hour=12, minute=0, second=0)
            input_data.local_datetime = dt
        return input_data
    
    def _resolve_location(self, input_data: ChartInput) -> Tuple[datetime, float, float, str]:
        """Layer 2: Resolve timezone and coordinates"""
        
        # Get coordinates if not provided
        if input_data.lat is None or input_data.lon is None:
            # Basic place sanity: reject suspicious inputs
            place = input_data.place.strip()
            if re.search(r"https?://|<|>|\n|\r", place):
                raise ValueError("Invalid place format")
            try:
                location = self.geolocator.geocode(place)
            except GeocoderTimedOut:
                raise ValueError("Geocoding timed out. Please try again.")
            except GeocoderServiceError as e:
                raise ValueError(f"Geocoding service error: {e}")
            if not location:
                raise ValueError(f"Could not find location: {place}")
            lat, lon = location.latitude, location.longitude
        else:
            lat, lon = input_data.lat, input_data.lon
        
        # Get timezone
        if input_data.timezone:
            tz_name = input_data.timezone
        else:
            tz_name = self.tf.timezone_at(lat=lat, lng=lon)
            if not tz_name:
                tz_name = "UTC"
        
        # Convert to UTC
        local_tz = pytz.timezone(tz_name)
        
        # Handle both naive and aware datetimes
        if input_data.local_datetime.tzinfo is not None:
            # Already timezone-aware, convert directly to UTC
            utc_dt = input_data.local_datetime.astimezone(pytz.UTC)
        else:
            # Naive datetime, localize first then convert
            local_dt = local_tz.localize(input_data.local_datetime)
            utc_dt = local_dt.astimezone(pytz.UTC)
        
        return utc_dt, lat, lon, tz_name
    
    def _calculate_astronomy(self, utc_dt: datetime, lat: float, lon: float) -> Astronomy:
        """Layer 3: Raw Swiss Ephemeris calculations"""
        
        # Calculate Julian Day
        jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                       utc_dt.hour + utc_dt.minute/60.0 + utc_dt.second/3600.0)
        
        # Calculate planets
        planets = []
        for planet_name, planet_id in self.PLANETS.items():
            if planet_name == 'Ketu':
                # Ketu is 180° from Rahu
                rahu_data = swe.calc_ut(jd, swe.MEAN_NODE)[0]
                lon_deg = (rahu_data[0] + 180) % 360
                planet_data = [lon_deg, rahu_data[1], rahu_data[2], rahu_data[3]]
            else:
                planet_data, ret_flag = swe.calc_ut(jd, planet_id)
            
            longitude = planet_data[0]
            sign_num = int(longitude / 30)
            degree_in_sign = longitude % 30
            
            planet_pos = PlanetPosition(
                name=planet_name,
                longitude=longitude,
                latitude=planet_data[1],
                speed=planet_data[3],
                retrograde=planet_data[3] < 0,
                sign=self.SIGNS[sign_num],
                degree=int(degree_in_sign),
                minute=int((degree_in_sign % 1) * 60),
                second=int(((degree_in_sign % 1) * 60 % 1) * 60)
            )
            planets.append(planet_pos)
        
        # Calculate houses and ascendant
        houses, ascmc = swe.houses(jd, lat, lon, b'P')  # Placidus
        ascendant = ascmc[0]
        mc = ascmc[1]
        
        return Astronomy(
            utc_datetime=utc_dt,
            julian_day=jd,
            planets=planets,
            ascendant=ascendant,
            mc=mc,
            house_cusps=list(houses)
        )
    
    def _calculate_vedic(self, astronomy: Astronomy, lat: float, lon: float) -> VedicData:
        """Layer 4: Vedic (sidereal) transformations"""
        
        # Calculate Lahiri Ayanamsa
        ayanamsa = swe.get_ayanamsa_ut(astronomy.julian_day)
        
        # Convert planets to sidereal
        vedic_planets = []
        for planet in astronomy.planets:
            sidereal_lon = (planet.longitude - ayanamsa) % 360
            sign_num = int(sidereal_lon / 30)
            degree_in_sign = sidereal_lon % 30
            
            # Calculate nakshatra
            nakshatra_num = int(sidereal_lon / 13.333333)
            nakshatra_pada = int((sidereal_lon % 13.333333) / 3.333333) + 1
            
            vedic_planet = VedicPlanetPosition(
                name=planet.name,
                longitude=sidereal_lon,
                latitude=planet.latitude,
                speed=planet.speed,
                retrograde=planet.retrograde,
                sign=self.SIGNS[sign_num],
                degree=int(degree_in_sign),
                minute=int((degree_in_sign % 1) * 60),
                second=int(((degree_in_sign % 1) * 60 % 1) * 60),
                rashi=self.SIGNS[sign_num],
                rashi_lord=self.RASHI_LORDS[self.SIGNS[sign_num]],
                nakshatra=self.NAKSHATRAS[nakshatra_num % 27],
                nakshatra_lord=self.NAKSHATRA_LORDS[nakshatra_num % 27],
                pada=nakshatra_pada
            )
            vedic_planets.append(vedic_planet)
        
        # Ascendant
        asc_sidereal = (astronomy.ascendant - ayanamsa) % 360
        asc_sign_num = int(asc_sidereal / 30)
        asc_nakshatra_num = int(asc_sidereal / 13.333333)
        asc_pada = int((asc_sidereal % 13.333333) / 3.333333) + 1
        
        ascendant = VedicPlanetPosition(
            name="Ascendant",
            longitude=asc_sidereal,
            latitude=0,
            speed=0,
            retrograde=False,
            sign=self.SIGNS[asc_sign_num],
            degree=int(asc_sidereal % 30),
            minute=int((asc_sidereal % 30 % 1) * 60),
            second=0,
            rashi=self.SIGNS[asc_sign_num],
            rashi_lord=self.RASHI_LORDS[self.SIGNS[asc_sign_num]],
            nakshatra=self.NAKSHATRAS[asc_nakshatra_num % 27],
            nakshatra_lord=self.NAKSHATRA_LORDS[asc_nakshatra_num % 27],
            pada=asc_pada
        )
        
        # Generate D1 chart
        d1_chart = self._generate_d1_chart(vedic_planets, ascendant)
        # Generate D9 (Navamsa) chart
        d9_chart = self._generate_d9_chart(vedic_planets, ascendant)
        # Generate D10 (Dashamsa) chart (simplified mapping)
        d10_chart = self._generate_d10_chart(vedic_planets, ascendant)
        north_chart = self._convert_to_north_chart(d1_chart)
        south_chart = d1_chart  # South chart is same as house layout
        
        # Find Moon
        moon = next(p for p in vedic_planets if p.name == "Moon")
        
        return VedicData(
            ayanamsa=ayanamsa,
            planets=vedic_planets,
            ascendant=ascendant,
            moon_longitude=moon.longitude,
            lagna_rashi=ascendant.rashi,
            lagna_lord=ascendant.rashi_lord,
            d1_chart=d1_chart,
            d9_chart=d9_chart,
            d10_chart=d10_chart,
            north_chart=north_chart,
            south_chart=south_chart
        )
    
    def _calculate_western(self, astronomy: Astronomy) -> WesternData:
        """Layer 5: Western (tropical) transformations"""
        
        # Calculate aspects
        aspects = self._calculate_aspects(astronomy.planets)
        
        # Calculate dignities
        dignities = self._calculate_dignities(astronomy.planets)
        
        # Create MC as PlanetPosition
        mc_sign_num = int(astronomy.mc / 30)
        mc_pos = PlanetPosition(
            name="MC",
            longitude=astronomy.mc,
            latitude=0,
            speed=0,
            retrograde=False,
            sign=self.SIGNS[mc_sign_num],
            degree=int(astronomy.mc % 30),
            minute=int((astronomy.mc % 30 % 1) * 60),
            second=0
        )
        
        # Create Ascendant as PlanetPosition
        asc_sign_num = int(astronomy.ascendant / 30)
        asc_pos = PlanetPosition(
            name="Ascendant",
            longitude=astronomy.ascendant,
            latitude=0,
            speed=0,
            retrograde=False,
            sign=self.SIGNS[asc_sign_num],
            degree=int(astronomy.ascendant % 30),
            minute=int((astronomy.ascendant % 30 % 1) * 60),
            second=0
        )
        
        return WesternData(
            planets=astronomy.planets,
            ascendant=asc_pos,
            mc=mc_pos,
            aspects=aspects,
            dignities=dignities
        )
    
    def _generate_d1_chart(self, planets: List[VedicPlanetPosition], 
                          ascendant: VedicPlanetPosition) -> Dict[int, List[str]]:
        """Generate D1 (Rashi) chart data"""
        chart = {i: [] for i in range(1, 13)}
        
        # Lagna is house 1
        lagna_sign_num = self.SIGNS.index(ascendant.rashi) + 1
        
        # Place planets in houses
        for planet in planets:
            planet_sign_num = self.SIGNS.index(planet.rashi) + 1
            house = ((planet_sign_num - lagna_sign_num) % 12) + 1
            chart[house].append(planet.name)
        
        return chart

    def _generate_d9_chart(self, planets: List[VedicPlanetPosition],
                            ascendant: VedicPlanetPosition) -> Dict[int, List[str]]:
        """Generate D9 (Navamsa) chart data.
        Navamsa divides each sign into nine parts of 3°20'. Starting Navamsa sign depends on modality:
        - Movable (Aries, Cancer, Libra, Capricorn): starts from same sign
        - Fixed (Taurus, Leo, Scorpio, Aquarius): starts from the 9th sign from it
        - Dual (Gemini, Virgo, Sagittarius, Pisces): starts from the 5th sign from it
        """
        chart = {i: [] for i in range(1, 13)}

        def sign_index(rashi: str) -> int:
            return self.SIGNS.index(rashi)

        def navamsa_sign_idx(sign_idx: int, degree_in_sign: float) -> int:
            # Modality sets
            movable = [0, 3, 6, 9]      # Aries, Cancer, Libra, Capricorn
            fixed = [1, 4, 7, 10]       # Taurus, Leo, Scorpio, Aquarius
            dual = [2, 5, 8, 11]        # Gemini, Virgo, Sagittarius, Pisces
            if sign_idx in movable:
                start = sign_idx
            elif sign_idx in fixed:
                start = (sign_idx + 8) % 12  # 9th sign from it
            else:  # dual
                start = (sign_idx + 4) % 12  # 5th sign from it
            pada = int(degree_in_sign / (30.0 / 9.0))  # 3°20' segments
            return (start + pada) % 12

        # Navamsa Ascendant sign
        asc_sign_idx = sign_index(ascendant.rashi)
        asc_deg = (ascendant.longitude % 30.0)
        nav_lagna_sign_idx = navamsa_sign_idx(asc_sign_idx, asc_deg)

        # Place planets in D9 houses
        for p in planets:
            p_sign_idx = sign_index(p.rashi)
            p_deg = (p.longitude % 30.0)
            p_nav_sign_idx = navamsa_sign_idx(p_sign_idx, p_deg)
            # House relative to Navamsa Lagna sign
            house = ((p_nav_sign_idx - nav_lagna_sign_idx) % 12) + 1
            chart[house].append(p.name)

        return chart

    def _generate_d10_chart(self, planets: List[VedicPlanetPosition],
                             ascendant: VedicPlanetPosition) -> Dict[int, List[str]]:
        """Generate D10 (Dashamsa) chart data (simplified).
        Each sign is divided into ten parts of 3°. For odd signs, counting starts from the same sign;
        for even signs, counting starts from the 9th sign from it. This provides a practical approximation.
        """
        chart = {i: [] for i in range(1, 13)}

        def sign_index(rashi: str) -> int:
            return self.SIGNS.index(rashi)

        def dashamsa_sign_idx(sign_idx: int, degree_in_sign: float) -> int:
            # odd signs indices: 0,2,4,6,8,10; even: 1,3,5,7,9,11
            is_odd = sign_idx % 2 == 0
            start = sign_idx if is_odd else (sign_idx + 8) % 12  # 9th sign for even
            pada = int(degree_in_sign / (30.0 / 10.0))
            return (start + pada) % 12

        asc_sign_idx = sign_index(ascendant.rashi)
        asc_deg = (ascendant.longitude % 30.0)
        d10_lagna_sign_idx = dashamsa_sign_idx(asc_sign_idx, asc_deg)

        for p in planets:
            p_sign_idx = sign_index(p.rashi)
            p_deg = (p.longitude % 30.0)
            p_d10_sign_idx = dashamsa_sign_idx(p_sign_idx, p_deg)
            house = ((p_d10_sign_idx - d10_lagna_sign_idx) % 12) + 1
            chart[house].append(p.name)

        return chart
    
    def _convert_to_north_chart(self, d1_chart: Dict[int, List[str]]) -> Dict[int, List[str]]:
        """Convert house system to North Indian diamond layout"""
        # North chart has different visual mapping
        # This is a simplified version; full implementation would handle the diamond layout
        return d1_chart
    
    def _calculate_aspects(self, planets: List[PlanetPosition]) -> List[Aspect]:
        """Calculate major aspects between planets"""
        aspects = []
        aspect_orbs = {
            'conjunction': (0, 8),
            'opposition': (180, 8),
            'trine': (120, 8),
            'square': (90, 8),
            'sextile': (60, 6)
        }
        
        for i, p1 in enumerate(planets):
            for p2 in planets[i+1:]:
                angle = abs(p1.longitude - p2.longitude)
                if angle > 180:
                    angle = 360 - angle
                
                for aspect_name, (exact_angle, orb) in aspect_orbs.items():
                    diff = abs(angle - exact_angle)
                    if diff <= orb:
                        aspects.append(Aspect(
                            planet1=p1.name,
                            planet2=p2.name,
                            aspect_type=aspect_name,
                            angle=angle,
                            orb=diff,
                            applying=p1.speed > p2.speed
                        ))
        
        return aspects
    
    def _calculate_dignities(self, planets: List[PlanetPosition]) -> Dict[str, str]:
        """Calculate planetary dignities"""
        dignities = {}
        
        # Simplified dignity rules
        exaltation = {
            'Sun': 'Aries', 'Moon': 'Taurus', 'Mercury': 'Virgo',
            'Venus': 'Pisces', 'Mars': 'Capricorn', 'Jupiter': 'Cancer',
            'Saturn': 'Libra'
        }
        
        for planet in planets:
            if planet.name in exaltation:
                if planet.sign == exaltation[planet.name]:
                    dignities[planet.name] = 'Exalted'
                else:
                    dignities[planet.name] = 'Neutral'
        
        return dignities
