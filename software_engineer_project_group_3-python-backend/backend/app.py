"""Server Flask — cầu nối giữa giao diện (function/*.js) và MySQL (repositories.py).

Trình duyệt gọi các đường dẫn /api/... bằng fetch(), server gọi hàm tương ứng trong repositories.py.

Chạy trực tiếp (không dùng Docker), từ thư mục gốc dự án:
    python -m backend.app
rồi mở http://localhost:5000 (server này cũng phục vụ luôn giao diện).

Trong Docker, nginx phục vụ giao diện và chuyển tiếp /api/ sang server này (xem docker/nginx.conf).
"""
import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .repositories import (
    MenuRepository, OrderRepository, RepositoryError, StatsRepository, UserRepository,
)

ROOT = Path(__file__).resolve().parent.parent          # thư mục gốc dự án (có index.html)
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")   # khoá ký token đăng nhập; ĐỔI khi deploy thật
TOKEN_MAX_AGE = 12 * 60 * 60                           # token đăng nhập sống 12 giờ

_signer = URLSafeTimedSerializer(SECRET_KEY, salt="restaurant-login")


class JSONProvider(DefaultJSONProvider):
    """Quy đổi kiểu dữ liệu mà JSON mặc định không hiểu (datetime, Decimal)."""

    @staticmethod
    def default(o):
        if isinstance(o, datetime):
            return o.astimezone().isoformat()    # DATETIME trong MySQL là giờ địa phương → gắn múi giờ để JS đọc đúng
        if isinstance(o, date):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return DefaultJSONProvider.default(o)


app = Flask(__name__, static_folder=None)               # static_folder=None: tự khai báo route file tĩnh bên dưới
app.json = JSONProvider(app)


# --------------------------------------------------------------------------
# Hỗ trợ: lỗi, đăng nhập, phân quyền
# --------------------------------------------------------------------------
@app.errorhandler(RepositoryError)
def on_repository_error(e):
    """Lỗi nghiệp vụ → 400 kèm thông báo để giao diện hiện thẳng cho người dùng."""
    return jsonify(error=str(e)), 400


@app.errorhandler(Exception)
def on_unexpected_error(e):
    """Lỗi bất ngờ (vd. MySQL chưa sẵn sàng) → 500, chi tiết chỉ ghi log, không gửi cho trình duyệt."""
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify(error=e.description), e.code
    app.logger.exception("Unhandled error")
    return jsonify(error="Server error. Please try again."), 500


def make_token(user):
    return _signer.dumps({"username": user["username"], "role": user["role"]})


def current_user():
    """Đọc token 'Authorization: Bearer ...'. Trả {'username','role'} nếu hợp lệ và tài khoản còn Active, ngược lại None."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = _signer.loads(header[7:], max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    # Kiểm tra lại database mỗi lần: Admin khoá tài khoản là mất quyền ngay (như Store.sessionValid cũ).
    if not UserRepository.is_session_valid(data["username"], data["role"]):
        return None
    return data


def require(*roles):
    """Trả (user, None) nếu đúng vai trò, hoặc (None, response lỗi 401/403)."""
    user = current_user()
    if not user:
        return None, (jsonify(error="Please sign in again."), 401)
    if user["role"] not in roles:
        return None, (jsonify(error="You do not have permission to do this."), 403)
    return user, None


def order_to_js(o):
    """Đổi tên khoá của đơn từ kiểu Python (snake_case) sang kiểu mà Order trong Models.js đang dùng (camelCase)."""
    return {
        "id": o["id"], "total": o["total"], "customer": o["customer"], "payment": o["payment"], "mode": o["mode"],
        "when": o["when"], "date": o["date"], "time": o["time"],
        "phone": o["phone"], "email": o["email"], "address": o["address"],
        "status": o["status"], "paid": o["paid"], "rejectReason": o["reject_reason"], "createdAt": o["created_at"],
        "lines": [{"name": l["name"], "img": l["img"], "size": l["size"], "qty": l["qty"],
                   "unitPrice": l["unit_price"], "note": l["note"], "total": l["total"]} for l in o["lines"]],
    }


# --------------------------------------------------------------------------
# API công khai (khách hàng không cần đăng nhập)
# --------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.get("/api/menu")
def menu():
    return jsonify(MenuRepository.list_all())


@app.get("/api/orders/next-id")
def next_order_id():
    """Mã đơn kế tiếp, dùng làm nội dung chuyển khoản trên mã QR."""
    return jsonify(id=OrderRepository.next_id())


@app.post("/api/orders")
def create_order():
    body = request.get_json(silent=True) or {}
    result = OrderRepository.create(body.get("info") or {}, body.get("lines") or [])
    return jsonify(result), 201


@app.post("/api/orders/lookup")
def lookup_order():
    """Tra cứu đơn theo mã đơn + số điện thoại. Không thấy → order = null."""
    body = request.get_json(silent=True) or {}
    found = OrderRepository.find(body.get("code", ""), body.get("phone", ""))
    return jsonify(order=order_to_js(found) if found else None)


@app.post("/api/orders/mine")
def my_orders():
    """Các đơn khách đã đặt/tra cứu trên thiết bị này. Mỗi phần tử {id, phone}; có đúng cả hai mới trả đơn về."""
    body = request.get_json(silent=True) or {}
    found = []
    for ref in (body.get("orders") or [])[:50]:
        if not isinstance(ref, dict):
            continue
        order = OrderRepository.find(ref.get("id", ""), ref.get("phone", ""))
        if order:
            found.append(order_to_js(order))
    return jsonify(orders=found)


@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    result = UserRepository.login(body.get("username", ""), body.get("password", ""))
    if "error" in result:
        locked = "locked" in result["error"]
        return jsonify(error=result["error"]), 403 if locked else 401
    user = result["user"]
    return jsonify(user={**user, "token": make_token(user)})


# --------------------------------------------------------------------------
# API cho Nhân viên / Admin (cần token)
# --------------------------------------------------------------------------
@app.get("/api/orders")
def list_orders():
    _, err = require("Staff", "Admin")
    if err:
        return err
    return jsonify(orders=[order_to_js(o) for o in OrderRepository.list_all()])


@app.post("/api/orders/<int:order_id>/status")
def set_order_status(order_id):
    _, err = require("Staff", "Admin")
    if err:
        return err
    body = request.get_json(silent=True) or {}
    OrderRepository.set_status(order_id, body.get("status", ""), body.get("reason", ""))
    return jsonify(ok=True)


@app.post("/api/orders/<int:order_id>/paid")
def mark_order_paid(order_id):
    _, err = require("Staff", "Admin")
    if err:
        return err
    OrderRepository.mark_paid(order_id)
    return jsonify(ok=True)


# --------------------------------------------------------------------------
# API chỉ dành cho Admin
# --------------------------------------------------------------------------
@app.post("/api/menu")
def save_menu_item():
    _, err = require("Admin")
    if err:
        return err
    return jsonify(id=MenuRepository.save(request.get_json(silent=True) or {}))


@app.post("/api/menu/<int:item_id>/toggle")
def toggle_menu_item(item_id):
    _, err = require("Admin")
    if err:
        return err
    MenuRepository.toggle_available(item_id)
    return jsonify(ok=True)


@app.get("/api/users")
def list_users():
    _, err = require("Admin")
    if err:
        return err
    return jsonify(users=UserRepository.list_all())


@app.post("/api/users")
def add_user():
    _, err = require("Admin")
    if err:
        return err
    body = request.get_json(silent=True) or {}
    UserRepository.add(str(body.get("username", "")), str(body.get("password", "")))
    return jsonify(ok=True), 201


@app.patch("/api/users/<int:user_id>")
def update_user(user_id):
    _, err = require("Admin")
    if err:
        return err
    body = request.get_json(silent=True) or {}
    UserRepository.update(user_id, password=body.get("password"), status=body.get("status"))
    return jsonify(ok=True)


@app.get("/api/stats")
def stats():
    _, err = require("Admin")
    if err:
        return err
    try:
        day = date.fromisoformat(request.args["day"]) if "day" in request.args else None
    except ValueError:
        raise RepositoryError("Invalid date.")
    return jsonify(StatsRepository.daily(day))


# --------------------------------------------------------------------------
# Phục vụ giao diện khi chạy không qua nginx (python -m backend.app)
# Chỉ mở đúng 4 mục của giao diện, KHÔNG mở backend/ hay sql/.
# --------------------------------------------------------------------------
@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<any(css, function, images):folder>/<path:name>")
def static_files(folder, name):
    return send_from_directory(ROOT / folder, name)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
