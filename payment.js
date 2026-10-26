"use strict";
/* =====================================================================
   CẤU HÌNH THANH TOÁN (Việt Nam) 
   ===================================================================== */

// 1) Thông tin tài khoản nhận tiền của quán  ➜ THAY BẰNG TÀI KHOẢN THẬT
const SHOP_BANK = {
  // Mã ngân hàng: mã BIN 6 số hoặc tên viết tắt theo NAPAS (xem danh sách tại vietqr.io)
  // Ví dụ BIN: Vietcombank 970436 · MB 970422 · Techcombank 970407 · ACB 970416
  //            BIDV 970418 · VietinBank 970415 · VPBank 970432 · TPBank 970423
  bankId: "970422",
  bankName: "MB Bank",
  accountNo: "0123456789",
  accountName: "NHA HANG HAI DON",   // viết hoa, không dấu cho giống tên trên tài khoản
  template: "compact2",          // compact2 = QR + thông tin; compact = QR + logo; qr_only = chỉ QR
  prefix: "RP"                   // tiền tố nội dung chuyển khoản → RP1001, RP1002...
};

// 2) Danh sách phương thức hiển thị ở bước Payment (đúng thứ tự khai báo).
const PAYMENT_METHODS = [
  { key: "bank", name: "Chuyển khoản ngân hàng (VietQR)", short: "Chuyển khoản",
    sub: () => "Quét mã QR bằng app ngân hàng hoặc ví điện tử có hỗ trợ VietQR", status: "Chờ chuyển khoản" },
  { key: "cod", name: "Thanh toán tiền mặt", short: "Tiền mặt",
    sub: mode => mode === "pickup" ? "Trả tiền khi nhận hàng tại quán" : "Trả tiền mặt cho shipper khi nhận hàng", status: "Chưa thanh toán" },
];
const DEFAULT_PAYMENT = "bank";
const findPayment = key => PAYMENT_METHODS.find(m => m.key === key) || PAYMENT_METHODS[0];

// 3) Mã đơn dùng làm nội dung chuyển khoản, và link ảnh VietQR (có sẵn số tiền + nội dung)
const orderCode = id => `${SHOP_BANK.prefix}${id}`;
const vietQrUrl = (amount, code) =>
  `https://img.vietqr.io/image/${SHOP_BANK.bankId}-${SHOP_BANK.accountNo}-${SHOP_BANK.template}.png` +
  `?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(SHOP_BANK.accountName)}`;
