"use strict";

// DỮ LIỆU MẪU — tài khoản nhân viên / quản trị (tương ứng bảng Users, mục 6.1 đặc tả).
// File này chỉ được ĐỌC một lần để nạp vào localStorage (key "rp_users", xem Storage.js).
// Tài khoản Admin tạo thêm / khóa sau này được lưu ở localStorage, KHÔNG ghi ngược vào file này.
//
// Lưu ý: mật khẩu ở đây là mật khẩu MẪU, chưa băm (chỉ để demo/học tập, xem phần "Phạm vi" của đặc tả).

const SEED_USERS = [
  { user_id: 1, username: "admin",  password: "admin123", role: "Admin", status: "Active" },
  { user_id: 2, username: "staff1", password: "staff123", role: "Staff", status: "Active" },
  { user_id: 3, username: "staff2", password: "staff123", role: "Staff", status: "Locked" }, // tài khoản đã khóa, để thử chặn đăng nhập
];
