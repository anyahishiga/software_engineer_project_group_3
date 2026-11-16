"use strict";


//cấu hình các chế độ hiển thị và các thông tin khác

// Thứ tự khai báo cũng là thứ tự hiển thị.
const VIEW_MODES = {
  delivery: { label: "Delivery", icon: "" },
  pickup:   { label: "Pickup",   icon: "" },
};

// Phương thức thanh toán nằm trong Payment.js.

const RESTAURANT_NAME = "Restaurant Order Management Group 3";
const OPEN_HOURS = "10:00 — 22:30";

// 16 quận nội thành TP.HCM cho ô chọn District.
const HCMC_DISTRICTS = ["District 1", "District 3", "District 4", "District 5", "District 6", "District 7", "District 8", "District 10",
  "District 11", "District 12", "Binh Tan", "Binh Thanh", "Go Vap", "Phu Nhuan", "Tan Binh", "Tan Phu"];

// Trường bắt buộc trong Checkout.
const CHECKOUT_REQUIRED = ["email", "phone", "first", "addr1", "ward", "district"];
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{8,15}$/;   // Dùng cả khi tra cứu đơn.

// Cột của bảng Customer Dashboard
const DASHBOARD_COLUMNS = ["Order", "Customer", "Items", "Type", "When", "Payment", "Status", "Total"];

// Thông báo hiện cho khách
const MESSAGES = {
  cartEmpty:      "Your cart is empty",
  requiredFields: "Please fill in the required fields",
  acceptTerms:    "Please accept Terms & Conditions",
};


// Các hàm tiện ích dùng trong View

// Trả text nếu điều kiện đúng.
const when = (condition, text) => (condition ? text : "");

// Gắn sự kiện cho các phần tử khớp selector.
const bindAll = (root, selector, handler, event = "click") =>
  root.querySelectorAll(selector).forEach(el => el.addEventListener(event, e => handler(el, e)));


//các class của view

class View {
  constructor(app) { this.app = app; this.cart = app.cart; this.schedule = app.schedule; }
  render() { return ""; }
  mount(container) { container.innerHTML = this.render(); this.bind(container); this._sig = this.signature(); }
  // View cần tự cập nhật sẽ ghi đè phương thức này.
  signature() { return ""; }
  onTick() { if (this.signature() !== this._sig) this.app.refresh(); }
  bind() { }

  /* --- HTML dùng chung --- */

  // Hiển thị một món trong giỏ.
  cartLineHtml(c) {
    return `<div class="line">${thumbHtml(c.item.img)}
      <div class="info"><div>${esc(c.item.name)}${when(c.item.hasSizes, ` (${esc(c.size.label)})`)}</div>${this.noteHtml(c.note)}
      <div class="acts"><button data-edit="${c.uid}">✎ Edit</button><button class="rm" data-remove="${c.uid}">✕ Remove</button></div></div>
      <div class="amt">x ${c.qty}<br>${money(c.unitPrice)}</div></div>`;
  }

  noteHtml(note) { return when(note, `<div class="note">${esc(note)}</div>`); }

  // Hiển thị tổng tiền.
  totalsHtml(totalLabel = "Total") {
    return `<div class="totals">
      <div><span>Subtotal</span><span>${money(this.cart.subtotal)}</span></div>
      <div><span>Taxes</span><span>${money(this.cart.taxes)}</span></div>
      <div class="grand"><span>${totalLabel}</span><span>${money(this.cart.total)}</span></div></div>`;
  }

  // Bảng đơn hàng bên cạnh.
  orderPanel({ checkoutBtn = true } = {}) {
    const count = this.cart.count;
    const lines = this.cart.items.map(c => this.cartLineHtml(c)).join("");
    return `<aside class="panel"><div class="panel-head">Your Order <span>${count} items</span></div>
      ${lines || `<div class="empty">${MESSAGES.cartEmpty}</div>`}
      ${this.totalsHtml(`Total (${count} items)`)}
      ${when(checkoutBtn, `<button class="btn-primary" data-go="checkout">Checkout</button>`)}</aside>`;
  }

  /* --- gắn sự kiện dùng chung --- */

  bindPanel(root) {
    this.bindRemoveButtons(root);
    bindAll(root, "[data-edit]", el => {
      const c = this.cart.find(Number(el.dataset.edit));
      new ItemModal(this.app.modalRoot, c.item, this.cart, c).open();
    });
    bindAll(root, "[data-go]", el => this.app.navigate(el.dataset.go));
  }

  bindRemoveButtons(root) {
    bindAll(root, "[data-remove]", el => this.cart.remove(Number(el.dataset.remove)));
  }

  // Nút chọn Delivery/Pickup.
  bindModeButtons(root) {
    bindAll(root, "[data-mode]", el => this.setMode(el.dataset.mode));
  }

  setMode(mode) { this.schedule.mode = mode; this.app.refresh(); }

  openSchedule() {
    new ScheduleModal(this.app.modalRoot, this.schedule, () => this.app.refresh()).open();
  }
}


/* ---------- 4a) Home ---------- */

class HomeView extends View {
  featuredHtml() {
    return MENU.filter(m => m.available).slice(0, 4).map(m => `<article class="dish" data-go="order">
      <div class="dish-img"><img src="${esc(m.img)}" alt="${esc(m.name)}"></div>
      <div class="dish-meta"><span class="cat">${esc(m.category)}</span><span class="price">${m.priceLabel}</span></div><h4>${esc(m.name)}</h4></article>`).join("");
  }
  render() {
    return `<section class="hero"><div class="hero-text"><p class="eyebrow line-before">Welcome to ${esc(RESTAURANT_NAME)}</p>
        <h1 class="hero-title">${esc(RESTAURANT_NAME)}</h1>
        <p>Online food ordering for your restaurant.</p><p>From menu to kitchen.</p>
        <p>A diverse culinary experience from Asian to European dishes, combining traditional and modern cuisine.</p>
        <button class="btn-outline" data-go="order">Explore the menu <span>→</span></button></div>
      <div class="hero-photo"><img src="images/hero.jpg" alt="Restaurant interior"><div class="hours"><small>Open daily</small><strong>${OPEN_HOURS}</strong></div></div></section>
      <section class="featured"><div class="section-head"><div><p class="eyebrow line-before">Featured dishes</p><h2>Our signatures</h2></div>
        <button class="link-arrow" data-go="order">View full menu <span>→</span></button></div>
      <div class="dish-grid four">${this.featuredHtml()}</div></section>`;
  }
  bind(root) { bindAll(root, "[data-go]", el => this.app.navigate(el.dataset.go)); }
}

/* ---------- 4b) Menu (Order Online) ---------- */

class OrderView extends View {
  constructor(app) { super(app); this.category = "All"; this.query = ""; }

  dishHtml(m) {
    return `<article class="dish"><div class="dish-img"><img src="${esc(m.img)}" alt="${esc(m.name)}" loading="lazy"></div>
      <div class="dish-meta"><span class="cat">${esc(m.category)}</span><span class="price">${m.priceLabel}</span></div>
      <h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p>
      <button class="add-row" data-add="${m.id}" aria-label="Add ${esc(m.name)}"><span>Add item</span><span>+</span></button></article>`;
  }

  pillsHtml() {
    return `<div class="pills">${["All", ...CATEGORIES].map(c =>
      `<button class="pill ${when(c === this.category, "on")}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
  }

  // Tóm tắt giỏ hàng bên cạnh.
  miniCartHtml() {
    const items = this.cart.items;
    const lines = items.map(c => `<div class="mini-line"><span>${esc(c.item.name)} × ${c.qty}</span><span>${money(c.total)}</span></div>`).join("");
    return `<aside class="mini-cart"><p class="eyebrow">Your order</p>
      <h3>${items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : MESSAGES.cartEmpty}</h3>${lines}
      <div class="mini-line sub"><span>Subtotal</span><strong>${money(this.cart.subtotal)}</strong></div>
      <button class="btn-primary full" data-go="cart">View cart</button></aside>`;
  }

  render() {
    const q = this.query.trim().toLowerCase();
    const items = MENU.filter(m => m.available && (this.category === "All" || m.category === this.category)
      && (m.name + " " + m.desc).toLowerCase().includes(q));
    return `<header class="page-head"><div><p class="eyebrow">Order online</p><h1>Our menu</h1>
        <p class="lead">Every dish is prepared to order. Displayed prices exclude ${Cart.TAX_RATE * 100}% tax.</p></div>
        <div class="hours right"><small>Open daily</small><strong>${OPEN_HOURS}</strong></div></header>
      <div class="menu-layout"><div>${this.pillsHtml()}
        ${items.length ? `<div class="dish-grid">${items.map(m => this.dishHtml(m)).join("")}</div>` : `<div class="empty">No dishes found</div>`}</div>
        <div class="side"><div class="search-box"><label for="search">Search</label>
          <input id="search" placeholder="Dish name or description..." value="${esc(this.query)}"></div>${this.miniCartHtml()}</div></div>`;
  }

  bind(root) {
    bindAll(root, "[data-go]", el => this.app.navigate(el.dataset.go));
    bindAll(root, "[data-cat]", el => { this.category = el.dataset.cat; this.app.refresh(); });
    bindAll(root, "[data-add]", el => {
      const item = MENU.find(x => x.id === Number(el.dataset.add));
      new ItemModal(this.app.modalRoot, item, this.cart).open();
    });
    bindAll(root, "#search", el => this.onSearch(el), "input");
  }

  // Giữ con trỏ ở cuối ô tìm kiếm sau khi cập nhật.
  onSearch(input) {
    this.query = input.value;
    this.app.refresh();
    const el = document.querySelector("#search");
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}


/* ---------- 4c) Cart (giỏ hiện tại + các đơn đã đặt) ---------- */

class CartView extends View {
  // Hiển thị một đơn đã đặt.
  orderCardHtml(o) {
    return `<div class="box order-card">
      <div class="panel-head">Order #${o.id} <span>${esc(o.mode)} · ${esc(o.when)}</span></div>
      <div class="lines">${OrderItemsModal.linesHtml(o.lines)}</div>
      <div class="totals"><div class="grand"><span>Total (${o.items} items)</span><span>${money(o.total)}</span></div></div></div>`;
  }

  historyHtml() {
    const orders = this.app.myOrders;
    return when(orders.length, `<h2>Previously ordered</h2>${orders.map(o => this.orderCardHtml(o)).join("")}`);
  }

  render() { return `<h1>Cart</h1><div class="cart-col">${this.orderPanel()}${this.historyHtml()}</div>`; }
  bind(root) { this.bindPanel(root); }
}


/* ---------- 4d) Checkout ---------- */

class CheckoutView extends View {
  constructor(app) { super(app); this.payment = PAYMENT_METHODS[0].id; }

  /* --- HTML: mỗi hộp (box) một hàm --- */

  // Tùy chọn nhận hàng hoặc thanh toán.
  optionHtml({ attr, value, selected, label, hint = "" }) {
    return `<div class="opt ${when(selected, "sel")}" ${attr}="${value}">
      <span>${label}${when(hint, `<small>${hint}</small>`)}</span><input type="radio" ${when(selected, "checked")}></div>`;
  }

  contactBoxHtml() {
    return `<div class="box"><div class="step"><i>1</i> Contact</div><div class="form2">
      <div><label>Email address *</label><input name="email" type="email" placeholder="you@email.com"></div>
      <div><label>Phone number *</label><input name="phone" placeholder="Used for order updates"></div>
      <div><label>First name *</label><input name="first" placeholder="First name"></div>
      <div><label>Last name (optional)</label><input name="last" placeholder="Last name"></div></div></div>`;
  }

  modeBoxHtml() {
    const s = this.schedule, label = VIEW_MODES[s.mode].label;
    const options = Object.entries(VIEW_MODES).map(([key, m]) =>
      this.optionHtml({ attr: "data-mode", value: key, selected: s.mode === key, label: `${m.icon} ${m.label}`, hint: "Free" })).join("");
    return `<div class="box"><div class="step"><i>2</i> ${label} details</div><div class="form2">${options}
      <div><label>Select ${s.mode} order date</label><input id="cDate" readonly value="${s.dateLabel}"></div>
      <div><label>${label} time</label><input id="cTime" readonly value="${s.time}"></div></div></div>`;
  }

  // Tách hộp thanh toán để không làm mất dữ liệu biểu mẫu.
  paymentBoxHtml() {
    return `<div class="box" id="payBox">${this.paymentInnerHtml()}</div>`;
  }

  // Hiển thị phương thức thanh toán và mã QR nếu cần.
  paymentInnerHtml() {
    const mode = this.schedule.mode;
    const options = PAYMENT_METHODS.map(p =>
      this.optionHtml({ attr: "data-pay", value: p.id, selected: this.payment === p.id, label: p.label, hint: p.hint(mode) })).join("");
    return `<div class="step"><i>3</i> Payment</div>${options}${when(this.payment === "bank", this.bankPanelHtml())}`;
  }

  // Hiển thị mã QR và thông tin chuyển khoản.
  bankPanelHtml() {
    if (!this.cart.count) return `<div class="bank-box"><p class="mini">Your cart is empty — add dishes to generate a payment code.</p></div>`;
    const code = orderCode(this.app.nextOrderId), amount = this.cart.total;
    return `<div class="bank-box">
      <img class="qr" src="${esc(vietQrUrl(amount, code))}" alt="VietQR code for order ${esc(code)}" onerror="this.hidden=true">
      <dl class="bank-info">
        <dt>Bank</dt><dd>${esc(SHOP_BANK.bankName)}</dd>
        <dt>Account no.</dt><dd>${esc(SHOP_BANK.accountNo)}</dd>
        <dt>Account name</dt><dd>${esc(SHOP_BANK.accountName)}</dd>
        <dt>Amount</dt><dd><strong>${money(amount)}</strong></dd>
        <dt>Transfer note</dt><dd><strong>${esc(code)}</strong></dd>
      </dl>
      <p class="mini bank-note">Please keep the transfer note unchanged. The restaurant confirms your order once the payment arrives.</p></div>`;
  }

  billingBoxHtml() {
    return `<div class="box"><div class="step">Billing Details</div><div class="form2">
      <div><label>Detail Address *</label><input name="addr1" placeholder="House number, street name"></div>
      <div><label>Ward / Commune *</label><input name="ward" placeholder="Ward / Commune"></div>
      <div><label>District *</label><select name="district"><option value="">Select district</option>${HCMC_DISTRICTS.map(d => `<option>${d}</option>`).join("")}</select></div>
    </div></div>`;
  }

  // Tóm tắt đơn và nút xóa món.
  summaryHtml() {
    const lines = this.cart.items.map(c => `<div class="line">${thumbHtml(c.item.img)}
      <div class="info">${esc(c.item.name)} × ${c.qty}${this.noteHtml(c.note)}</div>
      <div class="amt">${money(c.total)}</div><button class="icon-btn" data-remove="${c.uid}" title="Remove">🗑</button></div>`).join("");
    return `<aside class="panel"><div class="panel-head">Your order</div>
      ${lines || `<div class="empty">${MESSAGES.cartEmpty}</div>`}${this.totalsHtml()}</aside>`;
  }

  render() {
    const total = money(this.cart.total);
    return `<h1>Checkout</h1><div class="layout"><form id="checkoutForm" novalidate>
      ${this.contactBoxHtml()}${this.modeBoxHtml()}${this.paymentBoxHtml()}${this.billingBoxHtml()}
      <p class="mini"><label class="check"><input type="checkbox" name="terms"> Terms &amp; Conditions</label></p>
      <p class="mini"><strong>Order Total:</strong> ${total}</p>
      <button type="submit" class="btn-primary full pill">Place order · ${total}</button></form>
      ${this.summaryHtml()}</div>`;
  }

  /* --- sự kiện --- */

  bind(root) {
    this.bindRemoveButtons(root);
    this.bindModeButtons(root);
    this.bindPayment(root);
    bindAll(root, "#cDate, #cTime", () => this.openSchedule());
    bindAll(root, "#checkoutForm", (_, e) => { e.preventDefault(); this.submit(e.target); }, "submit");
  }

  // Cập nhật lựa chọn và vẽ lại hộp thanh toán.
  bindPayment(root) {
    bindAll(root, "[data-pay]", el => {
      this.payment = el.dataset.pay;
      root.querySelector("#payBox").innerHTML = this.paymentInnerHtml();
      this.bindPayment(root);   // Gắn sự kiện cho nội dung mới.
    });
  }

  // Kiểm tra các trường bắt buộc.
  validateRequired(fields) {
    return CHECKOUT_REQUIRED.map(name => {
      const value = fields[name].value;
      const bad = !value.trim() || (name === "email" && !EMAIL_PATTERN.test(value)) || (name === "phone" && !PHONE_PATTERN.test(value.trim()));
      fields[name].classList.toggle("err", bad);
      return !bad;
    }).every(Boolean);
  }

  submit(form) {
    const f = form.elements;
    const valid = this.validateRequired(f);
    if (!this.cart.count) return this.app.toast(MESSAGES.cartEmpty);
    if (!valid) return this.app.toast(MESSAGES.requiredFields);
    if (!f.terms.checked) return this.app.toast(MESSAGES.acceptTerms);
    // Lưu thông tin liên hệ và địa chỉ đơn hàng.
    const address = [f.addr1.value, f.ward.value, f.district.value].map(x => x.trim()).filter(Boolean).join(", ");
    this.app.placeOrder({
      name: `${f.first.value} ${f.last?.value || ""}`.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), address,
    }, this.payment);
  }
}


/* ---------- 4e) Customer Dashboard ---------- */

// Lịch sử gồm đơn trên máy này và đơn đã tra cứu.
class DashboardView extends View {
  // Hiển thị tổng tiền và nút xem món.
  orderRowHtml(o) {
    const p = findPayment(o.payment), st = ORDER_STATUS[o.status];
    return `<tr><td>#${o.id}</td><td>${esc(o.customer)}</td><td>${o.items} items</td><td>${esc(o.mode)}</td><td>${esc(o.when)}</td>
      <td>${esc(p.short)}<small>${esc(paymentStatusLabel(o))}</small></td>
      <td><span class="st ${st.cls}">${st.label}</span>${when(o.rejectReason, `<small>Reason: ${esc(o.rejectReason)}</small>`)}</td>
      <td><div class="total-cell"><span>${money(o.total)}</span><button class="btn-view" data-view-order="${o.id}">View items</button></div></td></tr>`;
  }

  tableHtml(orders) {
    const head = DASHBOARD_COLUMNS.map(c => `<th>${c}</th>`).join("");
    return `<div class="tbl-wrap"><table class="tbl"><tr>${head}</tr>${orders.map(o => this.orderRowHtml(o)).join("")}</table></div>`;
  }

  lookupHtml() {
    return `<form id="lookupForm" class="box" novalidate><div class="step">Track an order</div>
      <p class="mini">Ordered from another device? Enter your order code and the phone number you used.</p>
      <div class="form2"><div><label>Order code</label><input name="code" placeholder="e.g. 1001 or RP1001"></div>
      <div><label>Phone number</label><input name="phone" placeholder="Phone used when ordering"></div></div>
      <p><button type="submit" class="btn-primary">Find my order</button></p></form>`;
  }

  render() {
    const orders = this.app.myOrders;
    return `<h1>My orders</h1><div class="box">${orders.length ? this.tableHtml(orders) : `<div class="empty">You have no orders yet.</div>`}</div>${this.lookupHtml()}`;
  }

  bind(root) {
    bindAll(root, "[data-view-order]", el => {
      const order = this.app.orders.find(o => o.id === Number(el.dataset.viewOrder));
      if (order) new OrderItemsModal(this.app.modalRoot, order).open();
    });
    bindAll(root, "#lookupForm", (_, e) => { e.preventDefault(); this.lookup(e.target.elements); }, "submit");
  }

  lookup(f) {
    const order = Store.findOrder(f.code.value, f.phone.value);
    if (!order) return this.app.toast("No order found — check the code and phone number");
    Store.rememberOrder(order.id);
    this.app.toast(`Order #${order.id} added to your dashboard`);
    this.app.refresh();
  }

  // Cập nhật bảng khi trạng thái đơn thay đổi.
  signature() { return Store.ordersSignature(); }
}