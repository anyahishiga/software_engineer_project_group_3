"use strict";
class MenuItem {
  constructor({ id, name, desc, emoji, category, sizes }) { Object.assign(this, { id, name, desc, emoji, category, sizes }); }
  get priceLabel() {
    const p = this.sizes.map(s => s.price * (1 + Cart.TAX_RATE));
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
  get count() { return this.#items.reduce((total, item) => total + item.qty, 0); }
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
class Order {
  constructor(id, items, total, schedule, customer, payment) {
    Object.assign(this, { id, items, total, customer, payment, mode: schedule.mode, when: `${schedule.dateLabel} ${schedule.time}` });
  }
}