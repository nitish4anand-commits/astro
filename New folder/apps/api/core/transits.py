"""
Transit (Gochar) Calculator
Current planetary positions relative to natal chart
"""

import swisseph as swe
from datetime import datetime
from typing import List, Dict
from .models import Transit, ChartResponse


class TransitCalculator:
    """Calculate transits for predictions"""
    
    PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    
    def calculate(self, natal_chart: ChartResponse, transit_date: datetime) -> List[Transit]:
        """
        Calculate current transits relative to natal chart
        
        Args:
            natal_chart: Birth chart
            transit_date: Date for transit calculation
        
        Returns:
            List of Transit objects
        """
        # Calculate current planetary positions
        jd = swe.julday(transit_date.year, transit_date.month, transit_date.day,
                       transit_date.hour + transit_date.minute/60.0)
        
        # Get ayanamsa for sidereal calculations
        ayanamsa = swe.get_ayanamsa_ut(jd)
        
        # Get natal Moon and Lagna positions
        natal_moon_sign = self._get_sign_number(natal_chart.vedic.moon_longitude)
        natal_lagna_sign = self._get_sign_number(natal_chart.vedic.ascendant.longitude)
        
        transits = []
        
        planet_ids = {
            'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY,
            'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
            'Saturn': swe.SATURN, 'Rahu': swe.MEAN_NODE
        }
        
        for planet_name in self.PLANETS:
            if planet_name == 'Ketu':
                # Ketu is 180° from Rahu
                rahu_pos = swe.calc_ut(jd, swe.MEAN_NODE)[0][0]
                transit_lon = (rahu_pos + 180) % 360
            else:
                planet_data = swe.calc_ut(jd, planet_ids[planet_name])
                transit_lon = planet_data[0][0]
            
            # Convert to sidereal
            sidereal_lon = (transit_lon - ayanamsa) % 360
            current_sign_num = self._get_sign_number(sidereal_lon)
            
            # Calculate house position from Moon and Lagna
            from_moon = ((current_sign_num - natal_moon_sign) % 12) + 1
            from_lagna = ((current_sign_num - natal_lagna_sign) % 12) + 1
            
            # Determine aspected planets (simplified)
            aspected = self._get_aspected_planets(natal_chart, sidereal_lon)
            
            transits.append(Transit(
                planet=planet_name,
                from_natal_moon=from_moon,
                from_natal_lagna=from_lagna,
                current_sign=self.SIGNS[current_sign_num],
                aspects_natal=aspected
            ))
        
        return transits
    
    def _get_sign_number(self, longitude: float) -> int:
        """Get sign number (0-11) from longitude"""
        return int(longitude / 30) % 12
    
    def _get_aspected_planets(self, natal_chart: ChartResponse, transit_lon: float) -> List[str]:
        """Find which natal planets are aspected by transit"""
        aspected = []
        
        for planet in natal_chart.vedic.planets:
            diff = abs(planet.longitude - transit_lon)
            if diff > 180:
                diff = 360 - diff
            
            # Conjunction (within 10°)
            if diff <= 10:
                aspected.append(planet.name)
            # Opposition (170-190°)
            elif 170 <= diff <= 190:
                aspected.append(planet.name)
        
        return aspected
    
    def calculate_sade_sati(self, natal_chart: ChartResponse, transit_date: datetime) -> Dict[str, any]:
        """
        Calculate Sade Sati (Saturn's 7.5 year transit)
        Occurs when Saturn transits 12th, 1st, and 2nd houses from natal Moon
        """
        jd = swe.julday(transit_date.year, transit_date.month, transit_date.day, 12)
        ayanamsa = swe.get_ayanamsa_ut(jd)
        
        # Get Saturn's current position
        saturn_data = swe.calc_ut(jd, swe.SATURN)
        saturn_lon = (saturn_data[0][0] - ayanamsa) % 360
        saturn_sign = self._get_sign_number(saturn_lon)
        
        # Get natal Moon sign
        moon_sign = self._get_sign_number(natal_chart.vedic.moon_longitude)
        
        # Calculate which phase
        house_from_moon = ((saturn_sign - moon_sign) % 12) + 1
        
        if house_from_moon == 12:
            phase = "Rising (12th house)"
            in_sade_sati = True
        elif house_from_moon == 1:
            phase = "Peak (1st house)"
            in_sade_sati = True
        elif house_from_moon == 2:
            phase = "Setting (2nd house)"
            in_sade_sati = True
        else:
            phase = "Not in Sade Sati"
            in_sade_sati = False
        
        return {
            "in_sade_sati": in_sade_sati,
            "phase": phase,
            "saturn_sign": self.SIGNS[saturn_sign],
            "house_from_moon": house_from_moon
        }
