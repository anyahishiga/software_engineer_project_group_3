"use strict";
class Modal {
  constructor(root) { this.root = root; this.el = null; }
  title() { return ""; } subtitle() { return ""; } body() { return ""; }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">OK</button>`; }
  onOpen() {} onConfirm() { this.close(); }
  open() {
    this.el = document.createElement("div"); this.el.className = "overlay";
    this.el.innerHTML = `<div class="modal"><button class="x" data-act="cancel" aria-label="Close">×</button>
      <h3>${this.title()}</h3><p class="sub">${this.subtitle()}</p>${this.body()}<div class="foot">${this.footer()}</div></div>`;
    this.el.addEventListener("click", e => {
      if (e.target === this.el) return this.close();
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") this.close(); else if (act === "ok") this.onConfirm();
    });
    this.root.appendChild(this.el); this.onOpen();
  }
  close() { this.el?.remove(); this.el = null; }
}
class OrderItemsModal extends Modal {
  constructor(root, order) { super(root); this.order = order; }
  title() { return `Order #${this.order.id}`; }
  subtitle() { return `${esc(this.order.customer)} · ${esc(this.order.mode)} · ${esc(this.order.when)}`; }
  body() {
    const o = this.order;
    return `<div class="lines">${OrderItemsModal.linesHtml(o.lines)}</div>
      <div class="totals"><div><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div><span>Taxes</span><span>${money(o.taxes)}</span></div>
      <div class="grand"><span>Total</span><span>${money(o.total)}</span></div></div>`;
  }
  footer() { return `<button class="btn-primary" data-act="cancel">Close</button>`; }
  static linesHtml(lines) {
    return lines.map(l => `<div class="line"><div class="thumb">${l.emoji}</div>
      <div class="info"><div>${esc(l.name)}${l.size ? ` (${esc(l.size)})` : ""}</div>${l.note ? `<div class="note">${esc(l.note)}</div>` : ""}</div>
      <div class="amt">x ${l.qty}<br>${money(l.total)}</div></div>`).join("");
  }
}
class ScheduleModal extends Modal {
  constructor(root, schedule, onUpdate) { super(root); this.schedule = schedule; this.onUpdate = onUpdate; }
  title() { return "Choose Your Pickup Schedule"; }
  subtitle() { return "Review the available date and time, then click Update to apply your selection."; }
  body() {
    const dates = PickupSchedule.dateOptions().map(d => `<option ${fmtDate(d) === this.schedule.dateLabel ? "selected" : ""}>${fmtDate(d)}</option>`).join("");
    const times = PickupSchedule.timeOptions().map(t => `<option ${t === this.schedule.time ? "selected" : ""}>${t}</option>`).join("");
    return `<div class="field"><label>Select pickup order date</label><select id="mDate">${dates}</select></div>
            <div class="field"><label>Select a pickup time</label><select id="mTime">${times}</select></div>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">Update</button>`; }
  onConfirm() {
    const [d, m, y] = this.el.querySelector("#mDate").value.split(".").map(Number);
    this.schedule.date = new Date(y, m - 1, d); this.schedule.time = this.el.querySelector("#mTime").value;
    this.onUpdate(); this.close();
  }
}
class ItemModal extends Modal {
  constructor(root, menuItem, cart, cartItem = null) {
    super(root); Object.assign(this, { menuItem, cart, cartItem, qty: cartItem ? cartItem.qty : 1 });
  }
  title() { return esc(this.menuItem.name); } subtitle() { return esc(this.menuItem.desc); }
  body() {
    const cur = this.cartItem ? this.cartItem.sizeIndex : 0;
    const sizes = this.menuItem.hasSizes ? `<div class="field"><label>Size</label><select id="mSize">${this.menuItem.sizes.map((s, i) =>
      `<option value="${i}" ${i === cur ? "selected" : ""}>${s.label} – ${money(s.price * (1 + Cart.TAX_RATE))}</option>`).join("")}</select></div>` : "";
    return `${sizes}<div class="field"><label>Quantity</label><div class="qty"><button data-q="-1">−</button><strong id="mQty">${this.qty}</strong><button data-q="1">+</button></div></div>
            <div class="field"><label>Special instructions</label><input id="mNote" placeholder="e.g. no lettuce" value="${esc(this.cartItem?.note || "")}"></div>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">${this.cartItem ? "Save" : "Add to order"}</button>`; }
  onOpen() { this.el.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { this.qty = Math.max(1, this.qty + Number(b.dataset.q)); this.el.querySelector("#mQty").textContent = this.qty; })); }
  onConfirm() {
    const sizeIndex = Number(this.el.querySelector("#mSize")?.value || 0), note = this.el.querySelector("#mNote").value.trim();
    if (this.cartItem) this.cart.update(this.cartItem.uid, { sizeIndex, qty: this.qty, note });
    else this.cart.add(new CartItem(this.menuItem, sizeIndex, this.qty, note));
    this.close();
  }
}