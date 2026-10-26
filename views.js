"use strict";
class View {
  constructor(app) { this.app = app; this.cart = app.cart; this.schedule = app.schedule; }
  render() { return ""; }
  mount(container) { container.innerHTML = this.render(); this.bind(container); }
  bind() { }
  orderPanel({ checkoutBtn = true } = {}) {
    const items = this.cart.items;
    const itemCount = this.cart.count;
    const lines = items.map(c => `<div class="line"><div class="thumb">${c.item.emoji}</div>
        <div class="info"><div>${esc(c.item.name)}${c.item.hasSizes ? ` (${c.size.label})` : ""}</div>${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}
        <div class="acts"><button data-edit="${c.uid}">✎ Edit</button><button class="rm" data-remove="${c.uid}">✕ Remove</button></div></div>
        <div class="amt">x ${c.qty}<br>${money(c.unitPrice)}</div></div>`).join("");
    return `<aside class="panel"><div class="panel-head">Your Order <span>${itemCount} items</span></div>${lines || `<div class="empty">Your cart is empty</div>`}
        <div class="totals"><div><span>Subtotal</span><span>${money(this.cart.subtotal)}</span></div><div><span>Taxes</span><span>${money(this.cart.taxes)}</span></div>
        <div class="grand"><span>Total (${itemCount} items)</span><span>${money(this.cart.total)}</span></div></div>
        ${checkoutBtn ? `<button class="btn-primary" data-go="checkout">Checkout</button>` : ""}</aside>`;
  }
  bindPanel(root) {
    this.bindRemoveButtons(root);
    root.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => { const c = this.cart.find(Number(b.dataset.edit)); new ItemModal(this.app.modalRoot, c.item, this.cart, c).open(); }));
    root.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => this.app.navigate(b.dataset.go)));
  }
  bindRemoveButtons(root) {
    root.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => this.cart.remove(Number(b.dataset.remove))));
  }
  openSchedule() {
    new ScheduleModal(this.app.modalRoot, this.schedule, () => this.app.refresh()).open();
  }
}
class OrderView extends View {
  constructor(app) { super(app); this.category = CATEGORIES[0]; this.query = ""; }
  render() {
    const q = this.query.toLowerCase();
    const sections = CATEGORIES.map((cat, i) => {
      const items = MENU.filter(m => m.category === cat && m.name.toLowerCase().includes(q));
      if (!items.length) return "";
      return `<section id="cat-${i}"><h2>${cat}</h2><div class="grid">${items.map(m => `
        <div class="card"><div class="thumb">${m.emoji}</div><div><h4>${m.name}</h4><p>${m.desc}</p></div>
        <span class="price">${m.priceLabel}</span><button class="add" data-add="${m.id}" aria-label="Add ${m.name}">+</button></div>`).join("")}</div></section>`;
    }).join("");
    const s = this.schedule;
    return `<h1>Order Online</h1><div class="tabs">${CATEGORIES.map((c, i) => `<button class="tab ${c === this.category ? "active" : ""}" data-tab="${i}">${c}</button>`).join("")}</div>
      <div class="layout"><div><div class="toolbar">
      <div class="segment"><button data-mode="delivery" class="${s.mode === "delivery" ? "on" : ""}">Delivery</button><button data-mode="pickup" class="${s.mode === "pickup" ? "on" : ""}">Pickup</button></div>
      <div class="sched"><span>${s.dateLabel}</span><span>${s.time}</span><button data-sched>Edit</button></div>
      <input class="search" id="search" placeholder="🔍 Search" value="${esc(this.query)}"></div>
      ${sections || `<div class="empty">No items found</div>`}</div>${this.orderPanel()}</div>`;
  }
  bind(root) {
    this.bindPanel(root);
    root.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
      const i = Number(b.dataset.tab); this.category = CATEGORIES[i];
      root.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === b));
      root.querySelector(`#cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    root.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { this.schedule.mode = b.dataset.mode; this.app.refresh(); }));
    root.querySelector("[data-sched]").addEventListener("click", () => this.openSchedule());
    root.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => { new ItemModal(this.app.modalRoot, MENU.find(x => x.id === Number(b.dataset.add)), this.cart).open(); }));
    const search = root.querySelector("#search");
    search.addEventListener("input", () => { this.query = search.value; this.app.refresh(); const el = document.querySelector("#search"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  }
}
class CartView extends View {
  render() { return `<h1>Cart</h1><div style="max-width:420px">${this.orderPanel()}</div>`; }
  bind(root) { this.bindPanel(root); }
}
class CheckoutView extends View {
  constructor(app) { super(app); this.payment = DEFAULT_PAYMENT; }
  // Nội dung hộp Payment (tách riêng để đổi phương thức mà không làm mất dữ liệu đã nhập ở form)
  paymentHtml() {
    const mode = this.schedule.mode;
    const opts = PAYMENT_METHODS.map(m => { const sub = m.sub(mode); return `<div class="opt ${this.payment === m.key ? "sel" : ""}" data-pay="${m.key}"><span>${esc(m.name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><input type="radio" style="width:auto" ${this.payment === m.key ? "checked" : ""}></div>`; }).join("");
    return `<div class="step"><i>3</i> Payment</div>${opts}${this.payment === "bank" ? this.bankPanel() : ""}`;
  }
  // Mã VietQR có sẵn số tiền + nội dung chuyển khoản (mã đơn)
  bankPanel() {
    if (!this.cart.count) return `<div class="bank-box"><p class="mini">Giỏ hàng trống — thêm món để tạo mã thanh toán.</p></div>`;
    const code = orderCode(this.app.nextOrderId), amount = this.cart.total;
    return `<div class="bank-box">
        <img class="qr" src="${esc(vietQrUrl(amount, code))}" alt="Mã VietQR đơn ${esc(code)}" onerror="this.hidden=true">
        <dl class="bank-info">
          <dt>Ngân hàng</dt><dd>${esc(SHOP_BANK.bankName)}</dd>
          <dt>Số tài khoản</dt><dd>${esc(SHOP_BANK.accountNo)}</dd>
          <dt>Chủ tài khoản</dt><dd>${esc(SHOP_BANK.accountName)}</dd>
          <dt>Số tiền</dt><dd><strong>${money(amount)}</strong></dd>
          <dt>Nội dung CK</dt><dd><strong>${esc(code)}</strong></dd>
        </dl>
        <p class="mini bank-note">Vui lòng giữ nguyên nội dung chuyển khoản. Quán sẽ xác nhận đơn sau khi nhận được tiền.</p>
      </div>`;
  }
  bindPayment(root) {
    root.querySelectorAll("[data-pay]").forEach(b => b.addEventListener("click", () => {
      this.payment = b.dataset.pay;    // ghi nhớ phương thức khách vừa chọn
      root.querySelector("#payBox").innerHTML = this.paymentHtml();
      this.bindPayment(root);
    }));
  }
  render() {
    const s = this.schedule;
    const items = this.cart.items.map(c => `<div class="line"><div class="thumb">${c.item.emoji}</div>
        <div class="info">${esc(c.item.name)} × ${c.qty}${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}</div>
        <div class="amt">${money(c.total)}</div><button data-remove="${c.uid}" style="border:0;background:none" title="Remove">🗑</button></div>`).join("");
    return `<h1>Checkout</h1><div class="layout"><form id="checkoutForm" novalidate>
        <div class="box"><div class="step"><i>1</i> Contact</div><div class="form2">
            <div><label>Email address *</label><input name="email" type="email" placeholder="you@email.com"></div>
            <div><label>Phone number *</label><input name="phone" placeholder="Used for order updates"></div>
            <div><label>First name *</label><input name="first" placeholder="First name"></div>
            <div><label>Last name (optional)</label><input name="last" placeholder="Last name"></div></div>
            <p class="mini"><label style="display:inline"><input type="checkbox" style="width:auto"> Create an account for faster checkout next time (optional)</label></p></div>
        <div class="box"><div class="step"><i>2</i> ${s.mode === "pickup" ? "Pickup" : "Delivery"} details</div><div class="form2">
            <div class="opt ${s.mode === "delivery" ? "sel" : ""}" data-mode="delivery"><span>🚚 Delivery<small>Free</small></span><input type="radio" style="width:auto" ${s.mode === "delivery" ? "checked" : ""}></div>
            <div class="opt ${s.mode === "pickup" ? "sel" : ""}" data-mode="pickup"><span>🛍 Pickup<small>Free</small></span><input type="radio" style="width:auto" ${s.mode === "pickup" ? "checked" : ""}></div>
            <div><label>Select ${s.mode} order date</label><input id="cDate" readonly value="${s.dateLabel}"></div>
            <div><label>${s.mode === "pickup" ? "Pickup" : "Delivery"} time</label><input id="cTime" readonly value="${s.time}"></div></div></div>
        <div class="box" id="payBox">${this.paymentHtml()}</div>
        <div class="box"><div class="step">Billing Details</div><div class="form2">
            <div><label>Billing Address</label><input name="addr1" placeholder="Address line 1"></div>
            <div><label>Billing Address Line 2 (optional)</label><input placeholder="Address line 2"></div>
            <div><label>Billing City</label><input name="city" placeholder="City"></div>
            <div><label>Billing Zip / Postal Code</label><input placeholder="Zip / Postal Code"></div>
            <div><label>Billing Country</label><select name="country"><option>Việt Nam</option></select></div>
            <div><label>Billing State / Province</label><input name="province" placeholder="Tỉnh / Thành phố"></div></div></div>
        <p class="mini"><label style="display:inline"><input type="checkbox" name="terms" style="width:auto"> Terms &amp; Conditions</label></p>
        <p class="mini"><strong>Order Total:</strong> ${money(this.cart.total)}</p>
        <button type="submit" class="btn-primary full" style="border-radius:24px">Place order · ${money(this.cart.total)}</button></form>
        <aside class="panel"><div class="panel-head">Your order</div>${items || `<div class="empty">Your cart is empty</div>`}
        <div class="totals"><div><span>Subtotal</span><span>${money(this.cart.subtotal)}</span></div><div><span>Taxes:</span><span>${money(this.cart.taxes)}</span></div>
        <div class="grand"><span>Total</span><span>${money(this.cart.total)}</span></div></div></aside></div>`;
  }
  bind(root) {
    this.bindRemoveButtons(root);
    root.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { this.schedule.mode = b.dataset.mode; this.app.refresh(); }));
    this.bindPayment(root);
    ["#cDate", "#cTime"].forEach(sel => root.querySelector(sel).addEventListener("click", () => this.openSchedule()));
    root.querySelector("#checkoutForm").addEventListener("submit", e => { e.preventDefault(); this.submit(e.target); });
  }
  submit(form) {
    const f = form.elements;
    const valid = ["email", "phone", "first", "addr1", "city"].map(n => {
      const bad = !f[n].value.trim() || (n === "email" && !/^\S+@\S+\.\S+$/.test(f[n].value));
      f[n].classList.toggle("err", bad);
      return !bad;
    }).every(Boolean);
    if (!this.cart.count) return this.app.toast("Your cart is empty");
    if (!valid) return this.app.toast("Please fill in the required fields");
    if (!f.terms.checked) return this.app.toast("Please accept Terms & Conditions");
    this.app.placeOrder(`${f.first.value} ${f.last?.value || ""}`.trim(), this.payment);
  }
}
class DashboardView extends View {
  render() {
    const rows = this.app.orders.map(o => { const p = findPayment(o.payment); return `<tr><td>#${o.id}</td><td>${esc(o.customer)}</td><td>${o.items} items</td><td>${o.mode}</td><td>${o.when}</td><td>${esc(p.short)}<small>${esc(p.status)}</small></td><td>${money(o.total)}</td></tr>`; }).join("");
    return `<h1>Customer Dashboard</h1><div class="box">${rows ? `<table class="tbl"><tr><th>Order</th><th>Customer</th><th>Items</th><th>Type</th><th>When</th><th>Payment</th><th>Total</th></tr>${rows}</table>` : `<div class="empty">You have no orders yet.</div>`}</div>`;
  }
}