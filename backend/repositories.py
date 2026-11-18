"""Lớp truy cập dữ liệu (Repository) — thay cho backend/server.js và function/Storage.js.

Mỗi class phụ trách một nhóm dữ liệu. Lỗi nghiệp vụ được ném ra bằng RepositoryError
với thông báo giống ứng dụng cũ, giao diện chỉ cần hiển thị str(lỗi).
"""
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import bcrypt

from .db import query, execute, transaction

TAX_RATE = Decimal("0.10")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{3,}$")
EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")
PHONE_PATTERN = re.compile(r"^[0-9+\s().-]{8,15}$")
REQUIRED_MSG = "Please fill in the required fields"


class RepositoryError(Exception):
    """Lỗi nghiệp vụ (dữ liệu sai, thao tác không hợp lệ). str(e) là thông báo cho người dùng."""


def _digits(text):
    return re.sub(r"\D", "", str(text))


def next_steps(status, mode):
    """Các bước nhân viên được bấm tiếp theo: [(trạng thái mới, chữ trên nút), ...]."""
    flow = {
        "Pending": [("Confirmed", "Confirm"), ("Rejected", "Reject")],
        "Confirmed": [("Cooking", "Start cooking")],
        "Cooking": [("Ready", "Mark ready")],
        "Ready": [("Delivering", "Out for delivery")] if mode == "delivery" else [("Completed", "Picked up")],
        "Delivering": [("Completed", "Delivered")],
    }
    return flow.get(status, [])


def validate_schedule(day, time_str):
    """Kiểm tra lịch nhận hàng. Trả về chuỗi lỗi, hoặc "" nếu hợp lệ."""
    is_today = day == date.today()
    if time_str == "ASAP":
        return "" if is_today else "ASAP only applies to today — please choose a specific time."
    try:
        h, m = (int(x) for x in time_str.split(":"))
    except ValueError:
        return "Invalid time."
    if not (10 * 60 <= h * 60 + m <= 21 * 60 + 30):
        return "Please choose a time between 10:00 and 21:30."
    if not is_today:
        return ""
    now = datetime.now()
    return "That time has already passed — please choose another." if h * 60 + m <= now.hour * 60 + now.minute else ""


def parse_size_lines(text):
    """Đọc ô 'Sizes & prices': mỗi dòng 'Tên | Giá' → [{'label':..., 'price': Decimal}, ...]."""
    sizes = []
    for row in (r for r in text.split("\n") if r.strip()):
        label, _, price = (x.strip() for x in row.partition("|"))
        try:
            value = Decimal(price)
        except InvalidOperation:
            value = None
        if not label or not price or value is None or not value.is_finite() or value < 0:
            raise RepositoryError(f'Invalid size line: "{row}"')
        sizes.append({"label": label, "price": value})
    if not sizes:
        raise RepositoryError("At least one size with a price is required.")
    return sizes


# --------------------------------------------------------------------------
# Tài khoản
# --------------------------------------------------------------------------
class UserRepository:
    @staticmethod
    def login(username, password):
        """Trả về {'user': {...}} hoặc {'error': '...'}."""
        u = query("SELECT * FROM users WHERE LOWER(username) = LOWER(%s)", (str(username).strip(),), one=True)
        try:
            ok = bool(u) and bcrypt.checkpw(str(password).encode(), u["password_hash"].encode())
        except ValueError:
            ok = False
        if not ok:
            return {"error": "Incorrect username or password."}
        if u["status"] != "Active":
            return {"error": "This account is locked. Please contact an administrator."}
        return {"user": {k: u[k] for k in ("user_id", "username", "role", "status")}}

    @staticmethod
    def list_all():
        return query("SELECT user_id, username, role, status FROM users ORDER BY user_id")

    @staticmethod
    def is_session_valid(username, role):
        """Tài khoản còn hoạt động và đúng vai trò (dùng khi Admin khoá tài khoản đang đăng nhập)."""
        u = query("SELECT role, status FROM users WHERE username = %s", (username,), one=True)
        return bool(u) and u["status"] == "Active" and u["role"] == role

    @staticmethod
    def add(username, password):
        """Tạo tài khoản Staff mới."""
        username = username.strip()
        if not USERNAME_PATTERN.match(username):
            raise RepositoryError("Username: at least 3 characters, no spaces or accents.")
        if len(password) < 4:
            raise RepositoryError("Password must be at least 4 characters.")
        if query("SELECT 1 FROM users WHERE LOWER(username) = LOWER(%s)", (username,), one=True):
            raise RepositoryError("That username already exists.")
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        execute("INSERT INTO users (username, password_hash, role) VALUES (%s, %s, 'Staff')", (username, hashed))

    @staticmethod
    def update(user_id, password=None, status=None):
        """Đổi mật khẩu (bỏ trống = giữ nguyên) và/hoặc khoá / mở khoá."""
        if password:
            if len(password) < 4:
                raise RepositoryError("Password must be at least 4 characters.")
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (hashed, user_id))
        if status:
            if status not in ("Active", "Locked"):
                raise RepositoryError("Invalid status.")
            execute("UPDATE users SET status = %s WHERE user_id = %s", (status, user_id))


# --------------------------------------------------------------------------
# Thực đơn
# --------------------------------------------------------------------------
class MenuRepository:
    @staticmethod
    def list_all():
        """Tất cả món (kể cả món ngừng bán) kèm danh sách size."""
        items = query("""SELECT mi.id, mi.name, mi.description, mi.image_url, mi.available, c.name AS category
                         FROM menu_items mi JOIN categories c ON c.id = mi.category_id ORDER BY mi.id""")
        sizes = query("SELECT item_id, label, price FROM menu_item_sizes ORDER BY item_id, sort_order, id")
        return [{
            "id": m["id"], "name": m["name"], "desc": m["description"], "img": m["image_url"],
            "category": m["category"], "available": bool(m["available"]),
            "sizes": [{"label": s["label"], "price": float(s["price"])} for s in sizes if s["item_id"] == m["id"]],
        } for m in items]

    @staticmethod
    def categories():
        return [r["name"] for r in query("SELECT name FROM categories ORDER BY id")]

    @staticmethod
    def save(data):
        """Thêm món (không có 'id') hoặc cập nhật món (có 'id').
        data: name, category, desc, img, sizes=[{'label','price'}], available, id(tuỳ chọn)."""
        name = str(data.get("name", "")).strip()
        category = str(data.get("category", "")).strip()
        sizes = data.get("sizes") or []
        if not name or not category:
            raise RepositoryError("Please enter a name and a category.")
        if not sizes:
            raise RepositoryError("At least one size with a price is required.")
        labels = [s["label"].strip().lower() for s in sizes]
        if len(set(labels)) != len(labels):
            raise RepositoryError("Size names must be different.")
        item_id = data.get("id")
        with transaction() as cur:
            cur.execute("SELECT id FROM categories WHERE name = %s", (category,))
            row = cur.fetchone()
            if row:
                cat_id = row["id"]
            else:
                cur.execute("INSERT INTO categories (name) VALUES (%s)", (category,))
                cat_id = cur.lastrowid
            fields = (cat_id, name, data.get("desc", ""), data.get("img", ""), 1 if data.get("available", True) else 0)
            if item_id:
                cur.execute("""UPDATE menu_items SET category_id=%s, name=%s, description=%s, image_url=%s, available=%s
                               WHERE id=%s""", fields + (item_id,))
            else:
                cur.execute("""INSERT INTO menu_items (category_id, name, description, image_url, available)
                               VALUES (%s,%s,%s,%s,%s)""", fields)
                item_id = cur.lastrowid
            cur.execute("DELETE FROM menu_item_sizes WHERE item_id = %s", (item_id,))
            for i, s in enumerate(sizes):
                cur.execute("INSERT INTO menu_item_sizes (item_id, label, price, sort_order) VALUES (%s,%s,%s,%s)",
                            (item_id, s["label"].strip(), s["price"], i))
        return item_id

    @staticmethod
    def toggle_available(item_id):
        """Ẩn / hiện món (không xoá để đơn cũ vẫn tham chiếu được)."""
        execute("UPDATE menu_items SET available = 1 - available WHERE id = %s", (item_id,))


# --------------------------------------------------------------------------
# Đơn hàng
# --------------------------------------------------------------------------
class OrderRepository:
    @staticmethod
    def next_id():
        return int(query("SELECT IFNULL(MAX(id), 1000) + 1 AS id FROM orders", one=True)["id"])

    @staticmethod
    def create(info, lines):
        """Tạo đơn.
        info : name, email, phone, address, mode ('pickup'|'delivery'), date (date hoặc 'YYYY-MM-DD'),
               time ('ASAP' hoặc 'HH:MM'), payment ('bank'|'cash')
        lines: [{'item_id', 'size' ('' nếu món chỉ có 1 size), 'qty', 'note'}]
        Giá và tên món luôn lấy từ database, không tin dữ liệu từ giao diện."""
        if not lines:
            raise RepositoryError("Your cart is empty")
        name, email = str(info.get("name", "")).strip(), str(info.get("email", "")).strip()
        phone, address = str(info.get("phone", "")).strip(), str(info.get("address", "")).strip()
        mode, payment, time_str = info.get("mode"), info.get("payment"), str(info.get("time", ""))
        if (not name or not address or not EMAIL_PATTERN.match(email) or not PHONE_PATTERN.match(phone)
                or mode not in ("pickup", "delivery") or payment not in ("bank", "cash")):
            raise RepositoryError(REQUIRED_MSG)
        day = info.get("date")
        day = date.fromisoformat(day) if isinstance(day, str) else day
        error = validate_schedule(day, time_str)
        if error:
            raise RepositoryError(error)

        with transaction() as cur:
            prepared, subtotal = [], Decimal(0)
            for l in lines:
                qty, size = int(l.get("qty", 0)), str(l.get("size", ""))
                if qty <= 0:
                    raise RepositoryError("Quantity must be at least 1.")
                cur.execute("""SELECT mi.id, mi.name, mi.image_url, mi.available, s.price
                               FROM menu_items mi JOIN menu_item_sizes s ON s.item_id = mi.id
                               WHERE mi.id = %s AND (%s = '' OR s.label = %s)
                               ORDER BY s.sort_order, s.id LIMIT 1""", (l.get("item_id"), size, size))
                row = cur.fetchone()
                if not row:
                    raise RepositoryError("Item not found")
                if not row["available"]:
                    raise RepositoryError(f'"{row["name"]}" is no longer available — please remove it from your cart')
                price = Decimal(row["price"])
                subtotal += price * qty
                prepared.append((row["id"], row["name"], row["image_url"], size, qty, price, str(l.get("note", "")).strip()))
            tax = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
            total = subtotal + tax

            cur.execute("SELECT IFNULL(MAX(id), 1000) + 1 AS id FROM orders FOR UPDATE")
            order_id = int(cur.fetchone()["id"])
            cur.execute("""INSERT INTO orders (id, customer_name, email, phone, address, mode, sched_date, sched_time,
                               subtotal, tax, total, payment)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (order_id, name, email, phone, address, mode, day, time_str, subtotal, tax, total, payment))
            for p in prepared:
                cur.execute("""INSERT INTO order_items (order_id, item_id, item_name, image_url, size_label, qty, unit_price, note)
                               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", (order_id,) + p)
        return {"id": order_id, "subtotal": float(subtotal), "tax": float(tax), "total": float(total)}

    @staticmethod
    def _load(where="", params=()):
        rows = query(f"""SELECT id, customer_name, email, phone, address, mode, sched_date, sched_time, total,
                                payment, paid, status, reject_reason, created_at
                         FROM orders {where} ORDER BY created_at DESC, id DESC""", params)
        if not rows:
            return []
        marks = ",".join(["%s"] * len(rows))
        items = query(f"""SELECT order_id, item_id, item_name, image_url, size_label, qty, unit_price, line_total, note
                          FROM order_items WHERE order_id IN ({marks}) ORDER BY id""", tuple(r["id"] for r in rows))
        by_order = {}
        for i in items:
            by_order.setdefault(i["order_id"], []).append({
                "item_id": i["item_id"], "name": i["item_name"], "img": i["image_url"], "size": i["size_label"],
                "qty": i["qty"], "unit_price": float(i["unit_price"]), "note": i["note"], "total": float(i["line_total"])})
        return [{
            "id": r["id"], "lines": by_order.get(r["id"], []), "total": float(r["total"]),
            "customer": r["customer_name"], "payment": r["payment"], "mode": r["mode"],
            "when": f'{r["sched_date"].strftime("%d.%m.%Y")} {r["sched_time"]}',
            "date": r["sched_date"].isoformat(), "time": r["sched_time"],
            "phone": r["phone"], "email": r["email"], "address": r["address"],
            "status": r["status"], "paid": bool(r["paid"]), "reject_reason": r["reject_reason"] or "",
            "created_at": r["created_at"],
            "is_active": r["status"] not in ("Completed", "Rejected"),
            "next_steps": next_steps(r["status"], r["mode"]),
        } for r in rows]

    @staticmethod
    def list_all():
        return OrderRepository._load()

    @staticmethod
    def find(code, phone):
        """Tra cứu theo mã đơn ('1001' hoặc 'RP1001') và số điện thoại. Không thấy → None."""
        digits, phone_digits = _digits(code), _digits(phone)
        if not digits or not phone_digits:
            return None
        found = OrderRepository._load("WHERE id = %s", (int(digits),))
        return found[0] if found and _digits(found[0]["phone"]) == phone_digits else None

    @staticmethod
    def set_status(order_id, status, reason=""):
        """Đổi trạng thái nếu bước tiếp theo hợp lệ; ném RepositoryError nếu không."""
        reason = (reason or "").strip()
        if status == "Rejected" and len(reason) < 3:
            raise RepositoryError("Please enter a reason.")
        with transaction() as cur:
            cur.execute("SELECT status, mode FROM orders WHERE id = %s FOR UPDATE", (order_id,))
            row = cur.fetchone()
            if not row:
                raise RepositoryError("Order not found")
            if status not in [s for s, _ in next_steps(row["status"], row["mode"])]:
                raise RepositoryError(f"Order #{order_id} was just updated elsewhere — the list has been refreshed")
            cur.execute("""UPDATE orders SET status = %s,
                               reject_reason = CASE WHEN %s = 'Rejected' THEN %s ELSE reject_reason END,
                               paid = CASE WHEN %s = 'Completed' AND payment = 'cash' THEN 1 ELSE paid END
                           WHERE id = %s""", (status, status, reason or None, status, order_id))

    @staticmethod
    def mark_paid(order_id):
        if not query("SELECT 1 FROM orders WHERE id = %s", (order_id,), one=True):
            raise RepositoryError("Order not found")
        execute("UPDATE orders SET paid = 1 WHERE id = %s", (order_id,))


# --------------------------------------------------------------------------
# Thống kê (dùng 2 view trong database)
# --------------------------------------------------------------------------
class StatsRepository:
    @staticmethod
    def daily(day=None):
        """Thống kê một ngày (mặc định hôm nay), không tính đơn bị từ chối."""
        day = day or date.today()
        r = query("SELECT num_orders, revenue, expected FROM v_daily_revenue WHERE `day` = %s", (day,), one=True)
        dishes = query("""SELECT item_name AS name, size_label AS size, qty_sold AS qty
                          FROM v_daily_dish_stats WHERE `day` = %s ORDER BY qty_sold DESC""", (day,))
        return {
            "count": int(r["num_orders"]) if r else 0,
            "revenue": float(r["revenue"]) if r else 0.0,    # chỉ đơn đã thu tiền
            "expected": float(r["expected"]) if r else 0.0,  # gồm cả đơn chưa thu
            "dishes": [{"name": d["name"], "size": d["size"], "qty": int(d["qty"])} for d in dishes],
        }