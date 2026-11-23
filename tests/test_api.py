"""Test API Flask bằng test client + monkeypatch để giả repository (không cần MySQL)."""
from backend import app as app_module


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_menu_uses_repository(client, monkeypatch):
    monkeypatch.setattr(app_module.MenuRepository, "list_all", lambda: [{"id": 1, "name": "Pizza"}])
    assert client.get("/api/menu").get_json() == [{"id": 1, "name": "Pizza"}]


def test_orders_requires_login(client):
    assert client.get("/api/orders").status_code == 401


def test_orders_forbidden_for_customer_role(client, monkeypatch):
    monkeypatch.setattr(app_module.UserRepository, "is_session_valid", lambda u, r: True)
    token = app_module.make_token({"username": "bob", "role": "Customer"})
    res = client.get("/api/orders", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_login_wrong_password(client, monkeypatch):
    monkeypatch.setattr(app_module.UserRepository, "login", lambda u, p: {"error": "Wrong password"})
    res = client.post("/api/login", json={"username": "a", "password": "b"})
    assert res.status_code == 401
