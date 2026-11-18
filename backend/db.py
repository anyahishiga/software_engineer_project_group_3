import os
from contextlib import contextmanager
from mysql.connector import pooling

_pool = pooling.MySQLConnectionPool(
    pool_name="restaurant", pool_size=5,
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "restaurant_db"),
    user=os.getenv("DB_USER", "restaurant_app"),
    password=os.getenv("DB_PASSWORD", ""),
    charset="utf8mb4",
)

def query(sql, params=(), one=False):
    conn = _pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)           # luôn dùng %s, không nối chuỗi
        rows = cur.fetchall()
        return (rows[0] if rows else None) if one else rows
    finally:
        conn.close()

def execute(sql, params=()):
    conn = _pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

@contextmanager
def transaction():
    """Dùng cho thao tác ghi nhiều bảng, ví dụ tạo đơn."""
    conn = _pool.get_connection()
    try:
        conn.start_transaction()
        cur = conn.cursor(dictionary=True)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()