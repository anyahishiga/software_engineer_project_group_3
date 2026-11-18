"""Tạo tài khoản mẫu (mật khẩu băm bcrypt).

Chạy từ thư mục gốc dự án, SAU KHI đã nạp sql/restaurant_db_mysql.sql:
    .\\.venv\\Scripts\\python.exe backend\\seed_users.py
"""
import os

import bcrypt
import mysql.connector

SEED_USERS = [
    ("admin",  "admin123", "Admin", "Active"),
    ("staff1", "staff123", "Staff", "Active"),
    ("staff2", "staff123", "Staff", "Locked"),   # dùng để test chặn đăng nhập
]

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "restaurant_db"),
    user=os.getenv("DB_USER", "restaurant_app"),
    password=os.getenv("DB_PASSWORD", "Restaurant@123"),
    charset="utf8mb4",
)
cur = conn.cursor()
for username, password, role, status in SEED_USERS:
    cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
    if cur.fetchone():
        continue   # đã có thì bỏ qua, chạy lại nhiều lần vẫn an toàn
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT INTO users (username, password_hash, role, status) VALUES (%s, %s, %s, %s)",
        (username, hashed, role, status),
    )
conn.commit()
conn.close()
print("Seeded users:", ", ".join(u[0] for u in SEED_USERS))

