import pytest

from core.dasha import VimshottariDasha


def test_sequence_from_ketu():
    seq = VimshottariDasha.sequence_from('Ketu')
    assert seq == ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']


def test_sequence_from_venus():
    seq = VimshottariDasha.sequence_from('Venus')
    assert seq == ['Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu']


def test_sequence_invalid():
    with pytest.raises(ValueError):
        VimshottariDasha.sequence_from('Pluto')
