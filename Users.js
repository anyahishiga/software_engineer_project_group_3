"use strict";

// Tài khoản mẫu, nạp vào localStorage; tài khoản mới không ghi lại file.
// Mật khẩu mẫu chưa được băm.

const SEED_USERS = [
  { user_id: 1, username: "admin",  password: "admin123", role: "Admin", status: "Active" },
  { user_id: 2, username: "staff1", password: "staff123", role: "Staff", status: "Active" },
  { user_id: 3, username: "staff2", password: "staff123", role: "Staff", status: "Locked" }, // Dùng thử chặn đăng nhập.
];
