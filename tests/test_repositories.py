from datetime import date, timedelta

import pytest

from backend.repositories import (RepositoryError, next_steps,
                                  parse_size_lines, validate_schedule)


# --- test hàm thuần: đơn giản nhất ---
def test_next_steps_pending():
    assert next_steps("Pending", "pickup") == [("Confirmed", "Confirm"), ("Rejected", "Reject")]


# --- parametrize: 1 hàm test, nhiều bộ dữ liệu ---
@pytest.mark.parametrize("mode, expected", [
    ("delivery", "Delivering"),
    ("pickup", "Completed"),
])
def test_next_steps_ready_depends_on_mode(mode, expected):
    assert next_steps("Ready", mode)[0][0] == expected


def test_next_steps_unknown_status_is_empty():
    assert next_steps("Whatever", "pickup") == []


def test_validate_schedule_asap_only_today():
    tomorrow = date.today() + timedelta(days=1)
    assert "ASAP only applies" in validate_schedule(tomorrow, "ASAP")
    assert validate_schedule(date.today(), "ASAP") == ""


@pytest.mark.parametrize("t", ["09:59", "21:31"])
def test_validate_schedule_outside_opening_hours(t):
    day = date.today() + timedelta(days=1)
    assert "between 10:00 and 21:30" in validate_schedule(day, t)


# --- kiểm tra ngoại lệ ---
def test_parse_size_lines_ok():
    sizes = parse_size_lines("Small | 5.5\nLarge | 8")
    assert [s["label"] for s in sizes] == ["Small", "Large"]


@pytest.mark.parametrize("text", ["", "Small", "Small | abc", "Small | -1", "| 5"])
def test_parse_size_lines_invalid(text):
    with pytest.raises(RepositoryError):
        parse_size_lines(text)
