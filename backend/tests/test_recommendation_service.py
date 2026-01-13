import pytest

from app.services.recommendation_service import normalize_region


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("india", "IN"),
        ("usa", "US"),
        ("europe", "EU"),
        ("IN", "IN"),
        ("us", "US"),
        ("eu", "EU"),
        ("Apac", "APAC"),
    ],
)
def test_normalize_region(value, expected):
    assert normalize_region(value) == expected
