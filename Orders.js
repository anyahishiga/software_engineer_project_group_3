"use strict";

// DỮ LIỆU MẪU — vài đơn hàng để demo Staff Dashboard và Thống kê của Admin (xem Storage.js).
// Muốn bắt đầu với 0 đơn: cho buildSeedOrders() trả về [].
// Dùng hàm (không dùng mảng cố định) để các đơn mẫu luôn mang ngày HÔM NAY → thống kê trong ngày có số liệu.

function buildSeedOrders() {
  const now = Date.now();
  const minutesAgo = n => new Date(now - n * 60000);

  // Một dòng món: bản chụp giống Order.lineFrom() (giá chốt tại thời điểm đặt)
  const line = (menuId, qty, note = "") => {
    const m = SEED_MENU.find(x => x.id === menuId), s = m.sizes[0];
    return { name: m.name, img: m.img, size: "", qty, unitPrice: s.price, note, total: s.price * qty };
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

  // Muốn có lại đơn mẫu: thêm make({...}) vào mảng này (xem ví dụ bên dưới)
  return [];
}
