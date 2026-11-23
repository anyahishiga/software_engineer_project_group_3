"""Test SQL THẬT: chạy các câu SQL trong repositories.py trên MySQL.

Cách chạy (PowerShell, tại thư mục gốc dự án), sau khi MySQL đã chạy và nạp sql/restaurant_db_mysql.sql:
    $env:RUN_DB_TESTS = "1"
    $env:DB_HOST = "127.0.0.1"; $env:DB_PORT = "3307"      # 3307 nếu dùng docker-compose của dự án
    pytest tests/test_sql_integration.py -v
Không đặt RUN_DB_TESTS=1 thì các test này tự bị bỏ qua (SKIPPED).
Mỗi test tự dọn dữ liệu nó tạo ra (user 'pytest_*', đơn có tên 'PYTEST').
"""
import os
from datetime import date, timedelta
from decimal import Decimal

import pytest

pytestmark = pytest.mark.skipif(os.getenv("RUN_DB_TESTS") != "1",
                                reason="Đặt RUN_DB_TESTS=1 và bật MySQL để chạy test SQL")


@pytest.fixture
def repo():
    from backend import repositories
    from backend.db import execute
    yield repositories
    # dọn dữ liệu test dù test pass hay fail
    execute("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name = 'PYTEST')")
    execute("DELETE FROM orders WHERE customer_name = 'PYTEST'")
    execute("DELETE FROM users WHERE username LIKE 'pytest\\_%'")


def _order_info(**over):
    info = {"name": "PYTEST", "email": "t@example.com", "phone": "0901234567", "address": "1 Test St",
            "mode": "pickup", "payment": "cash", "time": "12:00",
            "date": (date.today() + timedelta(days=1)).isoformat()}
    info.update(over)
    return info


def _first_line(repo, qty=2):
    item = next(m for m in repo.MenuRepository.list_all() if m["available"])
    return item, {"item_id": item["id"], "size": item["sizes"][0]["label"], "qty": qty, "note": ""}


# ---------- Menu ----------
def test_menu_has_seed_data(repo):
    menu = repo.MenuRepository.list_all()
    assert menu and all(m["sizes"] for m in menu)
    assert repo.MenuRepository.categories()


# ---------- Users ----------
def test_add_user_then_login(repo):
    repo.UserRepository.add("pytest_u1", "abcd1234")
    assert repo.UserRepository.login("pytest_u1", "abcd1234")["user"]["role"] == "Staff"
    assert "error" in repo.UserRepository.login("pytest_u1", "wrong")


def test_add_duplicate_user_rejected(repo):
    repo.UserRepository.add("pytest_u2", "abcd1234")
    with pytest.raises(repo.RepositoryError):
        repo.UserRepository.add("PYTEST_U2", "abcd1234")      # trùng, không phân biệt hoa thường


def test_locked_user_cannot_login(repo):
    repo.UserRepository.add("pytest_u3", "abcd1234")
    uid = next(u["user_id"] for u in repo.UserRepository.list_all() if u["username"] == "pytest_u3")
    repo.UserRepository.update(uid, status="Locked")
    assert "locked" in repo.UserRepository.login("pytest_u3", "abcd1234")["error"]
    assert repo.UserRepository.is_session_valid("pytest_u3", "Staff") is False


# ---------- Orders ----------
def test_create_order_computes_tax_and_saves_lines(repo):
    item, line = _first_line(repo, qty=2)
    result = repo.OrderRepository.create(_order_info(), [line])
    expected_sub = Decimal(str(item["sizes"][0]["price"])) * 2
    assert Decimal(str(result["subtotal"])) == expected_sub
    assert Decimal(str(result["tax"])) == (expected_sub * Decimal("0.10")).quantize(Decimal("0.01"))
    saved = repo.OrderRepository.find(result["id"], "0901 234 567")     # tra cứu theo mã + SĐT
    assert saved["status"] == "Pending" and saved["lines"][0]["qty"] == 2


def test_find_order_wrong_phone_returns_none(repo):
    _, line = _first_line(repo)
    oid = repo.OrderRepository.create(_order_info(), [line])["id"]
    assert repo.OrderRepository.find(oid, "0999999999") is None


def test_order_status_flow_and_cash_paid(repo):
    _, line = _first_line(repo)
    oid = repo.OrderRepository.create(_order_info(mode="pickup", payment="cash"), [line])["id"]
    for status in ("Confirmed", "Cooking", "Ready", "Completed"):
        repo.OrderRepository.set_status(oid, status)
    done = repo.OrderRepository.find(oid, "0901234567")
    assert done["status"] == "Completed" and done["paid"] is True    # đơn tiền mặt tự đánh dấu đã thanh toán


def test_invalid_status_jump_rejected(repo):
    _, line = _first_line(repo)
    oid = repo.OrderRepository.create(_order_info(), [line])["id"]
    with pytest.raises(repo.RepositoryError):
        repo.OrderRepository.set_status(oid, "Completed")            # Pending → Completed là không hợp lệ


def test_reject_requires_reason(repo):
    _, line = _first_line(repo)
    oid = repo.OrderRepository.create(_order_info(), [line])["id"]
    with pytest.raises(repo.RepositoryError):
        repo.OrderRepository.set_status(oid, "Rejected", "")
    repo.OrderRepository.set_status(oid, "Rejected", "Out of stock")
    assert repo.OrderRepository.find(oid, "0901234567")["reject_reason"] == "Out of stock"


def test_create_order_unknown_item_rolls_back(repo):
    before = repo.OrderRepository.next_id()
    with pytest.raises(repo.RepositoryError):
        repo.OrderRepository.create(_order_info(), [{"item_id": 999999, "size": "", "qty": 1}])
    assert repo.OrderRepository.next_id() == before                  # transaction rollback, không lưu đơn nào


# ---------- Thống kê (view) ----------
def test_daily_stats_view(repo):
    stats = repo.StatsRepository.daily(date.today())
    assert set(stats) == {"count", "revenue", "expected", "dishes"}
