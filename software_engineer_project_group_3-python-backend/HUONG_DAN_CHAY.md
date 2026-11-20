# Cách chạy dự án

## Cách 1: Docker 

Cần cài Docker Desktop và mở nó lên. Đứng ở thư mục gốc dự án (nơi có `index.html`), chạy:

    docker compose -f docker/docker-compose.yml up --build

Mở http://localhost:8080

Tài khoản mẫu: admin / admin123, staff1 / staff123 (staff2 bị khóa để test).

Dừng: Ctrl+C, hoặc `docker compose -f docker/docker-compose.yml down`.
Xóa luôn dữ liệu để nạp lại từ đầu: thêm `-v` vào lệnh down.
Xem log server: `docker compose -f docker/docker-compose.yml logs backend`

## Cách 2: Chạy bằng terminal (không Docker)

Cần MySQL 8 đã chạy trên máy, và đã nạp file sql/restaurant_db_mysql.sql
(ví dụ: `mysql -u root -p < sql/restaurant_db_mysql.sql`).

    python3 -m venv .venv
    source .venv/bin/activate          # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    export DB_PASSWORD='Restaurant@123'   # Windows PowerShell: $env:DB_PASSWORD='Restaurant@123'
    python -m backend.seed_users          # tạo tài khoản mẫu (chạy 1 lần)
    python -m backend.app

Mở http://localhost:5000

## Cấu trúc kết nối

Trình duyệt (function/*.js) -> /api/... -> backend/app.py (Flask) -> backend/repositories.py -> MySQL
