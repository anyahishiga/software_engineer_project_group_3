"use strict";
class MenuItem {
  // available: false = món đã ngừng bán (ẩn với khách nhưng vẫn giữ để đơn cũ tham chiếu)
  constructor({ id, name, desc, img = "", category, sizes, available = true }) { Object.assign(this, { id, name, desc, img, category, sizes, available }); }
  get priceLabel() {
    const p = this.sizes.map(s => s.price);   // giá chưa gồm thuế (thuế tính ở giỏ hàng)
    const min = Math.min(...p), max = Math.max(...p);
    return min === max ? money(min) : `${money(min)} – ${money(max)}`;
  }
  get hasSizes() { return this.sizes.length > 1; }
}
class CartItem {
  constructor(item, sizeIndex = 0, qty = 1, note = "") {
    Object.assign(this, { item, sizeIndex, qty, note });
    this.uid = CartItem.seq = (CartItem.seq || 0) + 1;
  }
  get size() { return this.item.sizes[this.sizeIndex]; }
  get unitPrice() { return this.size.price; }
  get total() { return this.unitPrice * this.qty; }
}
class Cart {
  static TAX_RATE = 0.1;
  #items = []; #listeners = [];
  subscribe(fn) { this.#listeners.push(fn); }
  #emit() { this.#listeners.forEach(fn => fn(this)); }
  get items() { return [...this.#items]; }
  get count() { return this.#items.length; }
  get subtotal() { return this.#items.reduce((s, i) => s + i.total, 0); }
  get taxes() { return this.subtotal * Cart.TAX_RATE; }
  get total() { return this.subtotal + this.taxes; }
  find(uid) { return this.#items.find(i => i.uid === uid); }
  add(cartItem) { this.#items.push(cartItem); this.#emit(); }
  update(uid, { sizeIndex, qty, note }) {
    const it = this.find(uid);
    if (it) Object.assign(it, { sizeIndex, qty, note });
    this.#emit();
  }
  remove(uid) { this.#items = this.#items.filter(i => i.uid !== uid); this.#emit(); }
  clear() { this.#items = []; this.#emit(); }
}
class PickupSchedule {
  constructor() { this.mode = "pickup"; this.date = new Date(); this.time = "ASAP"; }
  get dateLabel() { return fmtDate(this.date); }
  // Kiểm tra lịch nhận hàng: trả về chuỗi lỗi, hoặc "" nếu hợp lệ
  static validate(date, time) {
    const isToday = isoDate(date) === isoDate(new Date());
    if (time === "ASAP") return isToday ? "" : "ASAP only applies to today — please choose a specific time.";
    if (!isToday) return "";
    const [h, m] = time.split(":").map(Number), now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes() ? "That time has already passed — please choose another." : "";
  }
  static dateOptions(days = 7) {
    const base = new Date();
    return Array.from({ length: days }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d; });
  }
  static timeOptions() {
    const out = ["ASAP"];
    for (let h = 10; h < 22; h++) ["00", "30"].forEach(m => out.push(`${pad(h)}:${m}`));
    return out;
  }
}
/* Trạng thái đơn hàng (một bộ duy nhất dùng cho Staff Dashboard, Customer Dashboard và thống kê) */
const ORDER_STATUS = {
  Pending:    { label: "Pending",    cls: "st-pending" },
  Confirmed:  { label: "Confirmed",  cls: "st-confirmed" },
  Cooking:    { label: "Cooking",    cls: "st-cooking" },
  Ready:      { label: "Ready",      cls: "st-ready" },
  Delivering: { label: "Delivering", cls: "st-delivering" },
  Completed:  { label: "Completed",  cls: "st-done" },
  Rejected:   { label: "Rejected",   cls: "st-rejected" },
};
// Các bước nhân viên được bấm tiếp theo ở mỗi trạng thái: [[trạng thái mới, chữ trên nút], ...]
const ORDER_FLOW = {
  Pending:    () => [["Confirmed", "Confirm"], ["Rejected", "Reject"]],
  Confirmed:  () => [["Cooking", "Start cooking"]],
  Cooking:    () => [["Ready", "Mark ready"]],
  Ready:      o => (o.mode === "delivery" ? [["Delivering", "Out for delivery"]] : [["Completed", "Picked up"]]),
  Delivering: () => [["Completed", "Delivered"]],
};

class Order {
  // lines: bản chụp các món đã đặt (không đổi dù giỏ hàng bị xoá hay sửa sau đó)
  //  payment: id phương thức khách chọn ("bank" | "cash"); contact: { phone, email, address }
  //  Ngoài các trường cũ, đơn còn lưu: date/time (để sắp xếp ưu tiên), status, paid, createdAt
  constructor(id, lines, total, schedule, customer, payment, contact = {}) {
    Object.assign(this, {
      id, lines, total, customer, payment, mode: schedule.mode, when: `${schedule.dateLabel} ${schedule.time}`,
      date: isoDate(schedule.date), time: schedule.time,
      phone: contact.phone || "", email: contact.email || "", address: contact.address || "",
      status: "Pending", paid: false, createdAt: new Date().toISOString(),
    });
  }
  // Dựng lại một đơn từ object đọc ra từ localStorage (JSON không giữ lại getter/phương thức)
  static fromJSON(obj) { return Object.assign(Object.create(Order.prototype), obj); }
  static lineFrom(c) {
    return { itemId: c.item.id, sizeLabel: c.size.label, name: c.item.name, img: c.item.img, size: c.item.hasSizes ? c.size.label : "", qty: c.qty, unitPrice: c.unitPrice, note: c.note, total: c.total };
  }
  get items() { return this.lines.length; }
  get subtotal() { return this.lines.reduce((s, l) => s + l.total, 0); }
  get taxes() { return this.total - this.subtotal; }
  get isAsap() { return this.time === "ASAP"; }
  // Thời điểm cần xong: đơn ASAP tính từ lúc tạo, đơn hẹn giờ tính theo giờ hẹn → dùng để sắp xếp ưu tiên
  get dueAt() { return this.isAsap ? new Date(this.createdAt) : new Date(`${this.date}T${this.time}:00`); }
  get isActive() { return this.status !== "Completed" && this.status !== "Rejected"; }
  get nextSteps() { return (ORDER_FLOW[this.status] || (() => []))(this); }
}