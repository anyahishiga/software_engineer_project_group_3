// [API] KHÔNG CÒN DÙNG: tài khoản giờ nằm trong MySQL (mật khẩu băm bcrypt), tạo bằng backend/seed_users.py và đăng nhập qua /api/login.
// Giữ file này chỉ để tham khảo; sửa ở đây sẽ KHÔNG đổi tài khoản đang chạy. Có thể xóa file này (và dòng <script> của nó trong index.html).


// dùng để bật chế độ strict mode trong JavaScript, giúp phát hiện lỗi và cải thiện hiệu suất.
"use strict";

// Tài khoản mẫu, nạp vào localStorage; tài khoản mới không ghi lại file.
// Mật khẩu mẫu chưa được băm.

const SEED_USERS = [



  { user_id: 1, username: "admin",  password: "admin123", role: "Admin", status: "Active" },
  { user_id :2, username: "staff1", password: "staff123", role: "Staff", status: "Active" },
  { user_id: 3, username: "staff2", password: "staff123", role: "Staff", status: "Locked" }, // Dùng thử để chặn đăng nhập.



];
