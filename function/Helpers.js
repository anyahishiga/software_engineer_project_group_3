// các hàm tiện ích dùng chung cho các phần khác (Models, Views, Store, App, Modals).


"use strict";





// hàm định dạng tiền tệ Việt Nam (đơn vị: đồng) với dấu phân cách hàng nghìn và ký hiệu ₫
const money = n => Math.round(n).toLocaleString("en-US") + " ₫";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");


// Các hàm định dạng ngày tháng
const fmtDate = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;


// Ngày chuẩn để lưu và so sánh.
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;



// Ngày hiển thị trên trang Staff/Admin.
const longDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "2-digit", day: "2-digit", year: "numeric" });




// Ảnh món thu nhỏ hoặc ô giữ chỗ.
const thumbHtml = img => img ? `<img class="thumb" src="${esc(img)}" alt="" loading="lazy">` : `<div class="thumb ph"></div>`;
