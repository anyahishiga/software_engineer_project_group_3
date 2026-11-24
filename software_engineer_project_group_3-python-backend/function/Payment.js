"use strict";

// 1) Thông tin tài khoản nhận tiền của quán  
const SHOP_BANK = {
  bankId: "970422",
  bankName: "MB Bank",
  accountNo: "0123456789",
  accountName: "GROUP3", 
  template: "compact2",          // compact2 = QR + thông tin; compact = QR + logo; qr_only = chỉ QR
  prefix: "RP"                   // tiền tố nội dung chuyển khoản → RP1001, RP1002...
};

// 2) Phương thức thanh toán hiển thị ở Checkout 
//    - label / hint : chữ hiện cho khách (hint là hàm nhận "delivery" | "pickup")
//    - short / status : dùng cho cột Payment ở Customer Dashboard
const PAYMENT_METHODS = [
  { id: "bank", label: "Bank transfer (VietQR)",
    hint: () => "Scan the QR code with a banking or e-wallet app that supports VietQR",
    short: "Bank transfer", status: "Unpaid" },
  { id: "cash", label: "Cash payment",
    hint: mode => mode === "pickup" ? "Pay at the restaurant when you collect your order" : "Pay the courier in cash on delivery",
    short: "Cash", status: "Unpaid" },
];
const findPayment = id => PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[0];

// 3) Mã đơn dùng làm nội dung chuyển khoản, và link ảnh VietQR (có sẵn số tiền + nội dung)
const orderCode = id => `${SHOP_BANK.prefix}${id}`;
const vietQrUrl = (amount, code) =>
  `https://img.vietqr.io/image/${SHOP_BANK.bankId}-${SHOP_BANK.accountNo}-${SHOP_BANK.template}.png` +
  `?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(SHOP_BANK.accountName)}`;

// 4) Trạng thái thanh toán hiển thị cho khách và nhân viên (đơn đã được nhân viên xác nhận thu tiền → "Đã thanh toán")
const paymentStatusLabel = order => (order.paid ? "Paid" : findPayment(order.payment).status);
