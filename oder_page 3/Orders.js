"use strict";

// DỮ LIỆU MẪU — vài đơn hàng có sẵn để demo Staff Dashboard và bảng Thống kê của Admin.
// Chỉ dùng khi khởi tạo lần đầu hoặc khi bấm "Reset dữ liệu mẫu". Muốn bắt đầu với 0 đơn:
// cho hàm buildSeedOrders() trả về [] .
//
// Dùng hàm (không dùng mảng cố định) để các đơn mẫu luôn mang ngày HÔM NAY → thống kê trong ngày có số liệu.

function buildSeedOrders() {
  const now = Date.now();
  const minutesAgo = n => new Date(now - n * 60000);

  // Một dòng món: bản chụp giống Order.lineFrom() (giá chốt tại thời điểm đặt)
  const line = (menuId, sizeIndex, qty, note = "") => {
    const m = SEED_MENU.find(x => x.id === menuId), s = m.sizes[sizeIndex];
    return { name: m.name, emoji: m.emoji, size: m.sizes.length > 1 ? s.label : "", qty, unitPrice: s.price, note, total: s.price * qty };
  };

  const make = ({ id, ago, name, phone, mode, time, lines, payment, status, paid, address = "" }) => {
    const created = minutesAgo(ago);
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const schedule = { mode, date: created, dateLabel: fmtDate(created), time };
    const o = new Order(id, lines, subtotal * (1 + Cart.TAX_RATE), schedule, name, payment,
      { phone, email: `${phone}@example.com`, address });
    o.createdAt = created.toISOString(); o.status = status; o.paid = paid;
    return o;
  };

  return [
    make({ id: 1004, ago: 4,   name: "Le Van Cuong",   phone: "0903456789", mode: "delivery", time: "19:30",
           lines: [line(5, 1, 1), line(10, 0, 2, "extra butter")], payment: "cash", status: "Pending", paid: false,
           address: "12 Nguyen Hue, Quan 1, TP.HCM" }),
    make({ id: 1003, ago: 11,  name: "Pham Thi Dung",  phone: "0902345678", mode: "pickup",   time: "ASAP",
           lines: [line(1, 0, 2, "no lettuce"), line(4, 0, 1)], payment: "bank", status: "Pending", paid: false }),
    make({ id: 1002, ago: 95,  name: "Tran Thi Binh",  phone: "0912345678", mode: "delivery", time: "12:30",
           lines: [line(7, 1, 1), line(12, 0, 1)], payment: "bank", status: "Cooking", paid: true,
           address: "45 Le Loi, Quan 3, TP.HCM" }),
    make({ id: 1001, ago: 180, name: "Nguyen Van An",  phone: "0901234567", mode: "pickup",   time: "ASAP",
           lines: [line(6, 1, 1), line(3, 0, 1)], payment: "cash", status: "Completed", paid: true }),
  ];
}
