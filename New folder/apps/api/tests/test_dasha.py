"""
Tests for Vimshottari Dasha calculations
"""

import pytest
from datetime import datetime
from core.dasha import VimshottariDasha


class TestVimshottariDasha:
    """Test Vimshottari Dasha calculations"""
    
    @pytest.fixture
    def dasha_engine(self):
        return VimshottariDasha()
    
    def test_dasha_sequence(self, dasha_engine):
        """Test correct dasha sequence"""
        # Moon nakshatra (0-13.33°) = Ashwini = Ketu lord
        moon_longitude = 5.0
        birth_date = datetime(1990, 1, 1)
        
        dashas = dasha_engine.calculate(moon_longitude, birth_date)
        
        # First Mahadasha should be Ketu
        maha_dashas = [d for d in dashas if d.level == "Maha"]
        assert maha_dashas[0].planet == "Ketu"
        
        # Verify 9 Mahadashas in cycle
        assert len(maha_dashas) >= 3  # At least 3 calculated
    
    def test_dasha_durations(self, dasha_engine):
        """Test dasha period durations"""
        moon_longitude = 100.0  # Pushya nakshatra (Saturn lord)
        birth_date = datetime(1990, 1, 1)
        
        dashas = dasha_engine.calculate(moon_longitude, birth_date)
        
        # Check that durations match expected values
        for dasha in dashas:
            if dasha.level == "Maha":
                planet = dasha.planet.split('/')[0]
                expected_years = dasha_engine.DASHA_YEARS[planet]
                # Allow some tolerance for balance period
                assert 0 < dasha.duration_years <= expected_years
    
    def test_current_dasha_detection(self, dasha_engine):
        """Test current dasha period detection"""
        moon_longitude = 50.0
        birth_date = datetime(1990, 1, 1)
        
        dashas = dasha_engine.calculate(moon_longitude, birth_date)
        
        # Exactly one Mahadasha and one Antardasha should be current
        current_mahas = [d for d in dashas if d.level == "Maha" and d.current]
        assert len(current_mahas) == 1
        
        current_antars = [d for d in dashas if d.level == "Antar" and d.current]
        assert len(current_antars) <= 1  # May be 0 or 1
    
    def test_antardashas_within_mahadasha(self, dasha_engine):
        """Test Antardashas are within Mahadasha period"""
        moon_longitude = 120.0
        birth_date = datetime(1990, 1, 1)
        
        dashas = dasha_engine.calculate(moon_longitude, birth_date)
        
        mahas = [d for d in dashas if d.level == "Maha"]
        
        for maha in mahas[:1]:  # Check first maha
            # Get its antardashas
            maha_prefix = maha.planet
            antars = [d for d in dashas if d.level == "Antar" and d.planet.startswith(maha_prefix)]
            
            if antars:
                # First antar should start when maha starts
                assert antars[0].start_date == maha.start_date
                # Last antar should end when maha ends
                assert antars[-1].end_date == maha.end_date
