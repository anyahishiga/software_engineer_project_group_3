"use strict";
const money = n => Math.round(n).toLocaleString("vi-VN") + " ₫";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const fmtDate = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
// Ngày dạng chuẩn "2026-10-31" — dùng để lưu, so sánh và sắp xếp (khác fmtDate chỉ dùng để hiển thị)
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;