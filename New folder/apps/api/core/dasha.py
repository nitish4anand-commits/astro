"""
Vimshottari Dasha Calculator
120-year cycle based on Moon's nakshatra at birth
"""

from datetime import datetime, timedelta
from typing import List, Dict
from .models import DashaPeriod


class VimshottariDasha:
    """Calculate Vimshottari Dasha periods"""
    
    # Dasha periods in years for each planet
    DASHA_YEARS = {
        'Ketu': 7,
        'Venus': 20,
        'Sun': 6,
        'Moon': 10,
        'Mars': 7,
        'Rahu': 18,
        'Jupiter': 16,
        'Saturn': 19,
        'Mercury': 17
    }
    
    # Nakshatra to Mahadasha lord mapping
    NAKSHATRA_LORDS = [
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter",
        "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon",
        "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu",
        "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
    ]
    
    def calculate(self, moon_longitude: float, birth_date: datetime = None) -> List[DashaPeriod]:
        """
        Calculate Vimshottari Dasha periods
        
        Args:
            moon_longitude: Moon's sidereal longitude at birth
            birth_date: Birth datetime (optional, uses current date if not provided)
        
        Returns:
            List of DashaPeriod objects for Maha and Antar dashas
        """
        if birth_date is None:
            birth_date = datetime.now()
        
        # Determine birth nakshatra
        nakshatra_num = int(moon_longitude / 13.333333) % 27
        birth_nakshatra_lord = self.NAKSHATRA_LORDS[nakshatra_num]
        
        # Calculate balance of birth nakshatra dasha
        nakshatra_progress = (moon_longitude % 13.333333) / 13.333333
        birth_lord_years = self.DASHA_YEARS[birth_nakshatra_lord]
        balance_years = birth_lord_years * (1 - nakshatra_progress)
        
        # Generate Mahadashas
        mahadashas = self._generate_mahadashas(birth_nakshatra_lord, balance_years, birth_date)
        
        # Include all Mahadashas; generate Antardashas for current + limited next ones
        all_periods = []
        current_date = datetime.now()

        for i, maha in enumerate(mahadashas):
            # Add Mahadasha and mark current
            maha.current = maha.start_date <= current_date <= maha.end_date
            all_periods.append(maha)
            # Generate Antardashas for the current Mahadasha and the next two
            if maha.current or i < 2:
                antardashas = self._generate_antardashas(maha)
                for antar in antardashas:
                    antar.current = antar.start_date <= current_date <= antar.end_date
                    all_periods.append(antar)
        
        return all_periods

    @staticmethod
    def sequence_from(start_lord: str) -> List[str]:
        """Return the 9-lord Vimshottari sequence starting from the given lord.

        Valid lords: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury
        """
        order = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
        if start_lord not in order:
            raise ValueError(f"Invalid start_lord: {start_lord}")
        start_idx = order.index(start_lord)
        return [order[(start_idx + i) % len(order)] for i in range(len(order))]
    
    def _generate_mahadashas(self, start_lord: str, balance_years: float, 
                            birth_date: datetime) -> List[DashaPeriod]:
        """Generate sequence of Mahadashas"""
        lords = list(self.DASHA_YEARS.keys())
        start_index = lords.index(start_lord)
        
        mahadashas = []
        current_date = birth_date
        
        # First dasha (balance period)
        end_date = current_date + timedelta(days=balance_years * 365.25)
        mahadashas.append(DashaPeriod(
            planet=start_lord,
            level="Maha",
            start_date=current_date,
            end_date=end_date,
            duration_years=balance_years
        ))
        current_date = end_date
        
        # Remaining dashas (120-year cycle)
        for i in range(1, 9):  # 9 total dashas
            lord_index = (start_index + i) % 9
            lord = lords[lord_index]
            years = self.DASHA_YEARS[lord]
            end_date = current_date + timedelta(days=years * 365.25)
            
            mahadashas.append(DashaPeriod(
                planet=lord,
                level="Maha",
                start_date=current_date,
                end_date=end_date,
                duration_years=years
            ))
            current_date = end_date
        
        return mahadashas
    
    def _generate_antardashas(self, mahadasha: DashaPeriod) -> List[DashaPeriod]:
        """Generate Antardashas within a Mahadasha"""
        lords = list(self.DASHA_YEARS.keys())
        maha_lord_index = lords.index(mahadasha.planet)
        
        antardashas = []
        current_date = mahadasha.start_date
        maha_days = (mahadasha.end_date - mahadasha.start_date).days
        
        # Each antardasha proportional to planet's total dasha years
        total_dasha_years = sum(self.DASHA_YEARS.values())
        
        for i in range(9):
            antar_lord_index = (maha_lord_index + i) % 9
            antar_lord = lords[antar_lord_index]
            antar_proportion = self.DASHA_YEARS[antar_lord] / total_dasha_years
            antar_days = maha_days * antar_proportion
            end_date = current_date + timedelta(days=antar_days)
            
            antardashas.append(DashaPeriod(
                planet=f"{mahadasha.planet}/{antar_lord}",
                level="Antar",
                start_date=current_date,
                end_date=end_date,
                duration_years=antar_days / 365.25
            ))
            current_date = end_date
        
        return antardashas
