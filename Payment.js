"use strict";

/* =====================================================================
   CẤU HÌNH THANH TOÁN (Việt Nam)
   ===================================================================== */

// 1) Thông tin tài khoản nhận tiền của quán  
const SHOP_BANK = {
  // Mã ngân hàng: mã BIN 6 số hoặc tên viết tắt theo NAPAS (xem danh sách tại vietqr.io)
  // Ví dụ BIN: Vietcombank 970436 · MB 970422 · Techcombank 970407 · ACB 970416
  //            BIDV 970418 · VietinBank 970415 · VPBank 970432 · TPBank 970423
  bankId: "970422",
  bankName: "MB Bank",
  accountNo: "0123456789",
  accountName: "NGUYEN VAN A",   // viết hoa, không dấu cho giống tên trên tài khoản
  template: "compact2",          // compact2 = QR + thông tin; compact = QR + logo; qr_only = chỉ QR
  prefix: "RP"                   // tiền tố nội dung chuyển khoản → RP1001, RP1002...
};

// 2) Phương thức thanh toán hiển thị ở Checkout (đúng thứ tự khai báo; mục ĐẦU TIÊN là mặc định)
//    - label / hint : chữ hiện cho khách (hint là hàm nhận "delivery" | "pickup")
//    - short / status : dùng cho cột Payment ở Customer Dashboard
const PAYMENT_METHODS = [
  { id: "bank", label: "Chuyển khoản ngân hàng (VietQR)",
    hint: () => "Quét mã QR bằng app ngân hàng hoặc ví điện tử có hỗ trợ VietQR",
    short: "Chuyển khoản", status: "Chờ chuyển khoản" },
  { id: "cash", label: "Thanh toán tiền mặt",
    hint: mode => mode === "pickup" ? "Trả tiền khi nhận hàng tại quán" : "Trả tiền mặt cho shipper khi nhận hàng",
    short: "Tiền mặt", status: "Chưa thanh toán" },

  
];
const findPayment = id => PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[0];

// 3) Mã đơn dùng làm nội dung chuyển khoản, và link ảnh VietQR (có sẵn số tiền + nội dung)
const orderCode = id => `${SHOP_BANK.prefix}${id}`;
const vietQrUrl = (amount, code) =>
  `https://img.vietqr.io/image/${SHOP_BANK.bankId}-${SHOP_BANK.accountNo}-${SHOP_BANK.template}.png` +
  `?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(SHOP_BANK.accountName)}`;
