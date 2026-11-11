"use strict";


/* ---------- 1) Cấu hình ---------- */

// Hình thức nhận hàng (thứ tự khoá = thứ tự hiển thị)
const VIEW_MODES = {
  delivery: { label: "Delivery", icon: "" },
  pickup:   { label: "Pickup",   icon: "" },
};

// Danh sách mới (chuyển khoản VietQR, tiền mặt, test) nằm trong Payment.js

const BILLING_COUNTRIES = ["Việt Nam"];

// Các ô bắt buộc ở Checkout (theo thuộc tính name của input)
const CHECKOUT_REQUIRED = ["email", "phone", "first", "addr1", "city"];
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{8,15}$/;   // số điện thoại cũng dùng để khách tra cứu đơn nên phải đúng định dạng

// Cột của bảng Customer Dashboard
const DASHBOARD_COLUMNS = ["Order", "Customer", "Items", "Type", "When", "Payment", "Status", "Total"];

// Thông báo hiện cho khách
const MESSAGES = {
  cartEmpty:      "Your cart is empty",
  requiredFields: "Please fill in the required fields",
  acceptTerms:    "Please accept Terms & Conditions",
};


/* ---------- 2) Tiện ích ---------- */

// when(true, "x") -> "x", when(false, "x") -> ""  (dùng cho checked / selected / class)
const when = (condition, text) => (condition ? text : "");

// Gắn sự kiện cho mọi phần tử khớp selector: handler(phần_tử, sự_kiện)
const bindAll = (root, selector, handler, event = "click") =>
  root.querySelectorAll(selector).forEach(el => el.addEventListener(event, e => handler(el, e)));


/* ---------- 3) View: lớp cha ---------- */

class View {
  constructor(app) { this.app = app; this.cart = app.cart; this.schedule = app.schedule; }
  render() { return ""; }
  mount(container) { container.innerHTML = this.render(); this.bind(container); this._sig = this.signature(); }
  // Chuỗi đại diện cho dữ liệu view đang hiển thị. View nào cần tự cập nhật (Dashboard, Staff, Admin) thì ghi đè;
  // App gọi onTick() định kỳ và khi tab khác ghi localStorage → chuỗi đổi thì vẽ lại.
  signature() { return ""; }
  onTick() { if (this.signature() !== this._sig) this.app.refresh(); }
  bind() { }

  /* --- HTML dùng chung --- */

  // Một dòng món trong giỏ hàng (có nút Edit / Remove)
  cartLineHtml(c) {
    return `<div class="line"><div class="thumb">${c.item.emoji}</div>
      <div class="info"><div>${esc(c.item.name)}${when(c.item.hasSizes, ` (${esc(c.size.label)})`)}</div>${this.noteHtml(c.note)}
      <div class="acts"><button data-edit="${c.uid}">✎ Edit</button><button class="rm" data-remove="${c.uid}">✕ Remove</button></div></div>
      <div class="amt">x ${c.qty}<br>${money(c.unitPrice)}</div></div>`;
  }

  noteHtml(note) { return when(note, `<div class="note">${esc(note)}</div>`); }

  // Khối Subtotal / Taxes / Total
  totalsHtml(totalLabel = "Total") {
    return `<div class="totals">
      <div><span>Subtotal</span><span>${money(this.cart.subtotal)}</span></div>
      <div><span>Taxes</span><span>${money(this.cart.taxes)}</span></div>
      <div class="grand"><span>${totalLabel}</span><span>${money(this.cart.total)}</span></div></div>`;
  }

  // Khung "Your Order" bên phải (trang Order Online và Cart)
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

  // Các nút đổi Delivery / Pickup (thuộc tính data-mode)
  bindModeButtons(root) {
    bindAll(root, "[data-mode]", el => this.setMode(el.dataset.mode));
  }

  setMode(mode) { this.schedule.mode = mode; this.app.refresh(); }

  openSchedule() {
    new ScheduleModal(this.app.modalRoot, this.schedule, () => this.app.refresh()).open();
  }
}


/* ---------- 4a) Order Online ---------- */

class OrderView extends View {
  constructor(app) { super(app); this.category = CATEGORIES[0]; this.query = ""; }

  /* --- HTML --- */

  menuCardHtml(m) {
    return `<div class="card"><div class="thumb">${m.emoji}</div><div><h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p></div>
      <span class="price">${m.priceLabel}</span><button class="add" data-add="${m.id}" aria-label="Add ${esc(m.name)}">+</button></div>`;
  }

  // Một danh mục món; trả về "" nếu không có món nào khớp ô tìm kiếm
  categoryHtml(cat, index) {
    const q = this.query.toLowerCase();
    const items = MENU.filter(m => m.available && m.category === cat && m.name.toLowerCase().includes(q));
    if (!items.length) return "";
    return `<section id="cat-${index}"><h2>${cat}</h2><div class="grid">${items.map(m => this.menuCardHtml(m)).join("")}</div></section>`;
  }

  tabsHtml() {
    return `<div class="tabs">${CATEGORIES.map((c, i) =>
      `<button class="tab ${when(c === this.category, "active")}" data-tab="${i}">${c}</button>`).join("")}</div>`;
  }

  toolbarHtml() {
    const s = this.schedule;
    const modeButtons = Object.entries(VIEW_MODES).map(([key, m]) =>
      `<button data-mode="${key}" class="${when(s.mode === key, "on")}">${m.label}</button>`).join("");
    return `<div class="toolbar">
      <div class="segment">${modeButtons}</div>
      <div class="sched"><span>${s.dateLabel}</span><span>${s.time}</span><button data-sched>Edit</button></div>
      <input class="search" id="search" placeholder="🔍 Search" value="${esc(this.query)}"></div>`;
  }

  render() {
    const sections = CATEGORIES.map((cat, i) => this.categoryHtml(cat, i)).join("");
    return `<h1>Order Online</h1>${this.tabsHtml()}
      <div class="layout"><div>${this.toolbarHtml()}
      ${sections || `<div class="empty">No items found</div>`}</div>${this.orderPanel()}</div>`;
  }

  /* --- sự kiện --- */

  bind(root) {
    this.bindPanel(root);
    this.bindModeButtons(root);
    bindAll(root, "[data-tab]", el => this.selectCategory(root, el));
    bindAll(root, "[data-sched]", () => this.openSchedule());
    bindAll(root, "[data-add]", el => {
      const item = MENU.find(x => x.id === Number(el.dataset.add));
      new ItemModal(this.app.modalRoot, item, this.cart).open();
    });
    bindAll(root, "#search", el => this.onSearch(el), "input");
  }

  selectCategory(root, tabEl) {
    const i = Number(tabEl.dataset.tab);
    this.category = CATEGORIES[i];
    root.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tabEl));
    root.querySelector(`#cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Vẽ lại danh sách rồi trả con trỏ về cuối ô tìm kiếm để gõ tiếp
  onSearch(input) {
    this.query = input.value;
    this.app.refresh();
    const el = document.querySelector("#search");
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}


/* ---------- 4b) Cart (giỏ hiện tại + các đơn đã đặt) ---------- */

class CartView extends View {
  // Một đơn đã đặt: tiêu đề, danh sách món, tổng tiền
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


/* ---------- 4c) Checkout ---------- */

class CheckoutView extends View {
  constructor(app) { super(app); this.payment = PAYMENT_METHODS[0].id; }

  /* --- HTML: mỗi hộp (box) một hàm --- */

  // Ô chọn dạng radio dùng cho hình thức nhận hàng và thanh toán
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

  //  Thêm id="payBox" và tách phần ruột sang paymentInnerHtml(), để khi đổi phương thức chỉ vẽ lại hộp này
  // (không vẽ lại cả form → khách không bị mất dữ liệu đã nhập ở Contact / Billing)
  paymentBoxHtml() {
    return `<div class="box" id="payBox">${this.paymentInnerHtml()}</div>`;
  }

  //  Ruột hộp Payment: các lựa chọn lấy từ PAYMENT_METHODS (Payment.js), kèm khung QR nếu chọn chuyển khoản.
  // hint là hàm nhận hình thức nhận hàng → dòng phụ của "Tiền mặt" đổi theo Pickup / Delivery
  paymentInnerHtml() {
    const mode = this.schedule.mode;
    const options = PAYMENT_METHODS.map(p =>
      this.optionHtml({ attr: "data-pay", value: p.id, selected: this.payment === p.id, label: p.label, hint: p.hint(mode) })).join("");
    return `<div class="step"><i>3</i> Payment</div>${options}${when(this.payment === "bank", this.bankPanelHtml())}`;
  }

  //  Khung QR chuyển khoản: ảnh VietQR đã có sẵn số tiền + nội dung chuyển khoản (mã đơn),
  // kèm thông tin tài khoản lấy từ SHOP_BANK (Payment.js). Chỉ hiện khi khách chọn "Chuyển khoản".
  bankPanelHtml() {
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
      <p class="mini bank-note">Vui lòng giữ nguyên nội dung chuyển khoản. Quán sẽ xác nhận đơn sau khi nhận được tiền.</p></div>`;
  }

  selectHtml(values) { return `<select>${values.map(v => `<option>${v}</option>`).join("")}</select>`; }

  billingBoxHtml() {
    return `<div class="box"><div class="step">Billing Details</div><div class="form2">
      <div><label>Billing Address</label><input name="addr1" placeholder="Address line 1"></div>
      <div><label>Billing Address Line 2 (optional)</label><input placeholder="Address line 2"></div>
      <div><label>Billing City</label><input name="city" placeholder="City"></div>
      <div><label>Billing Zip / Postal Code</label><input placeholder="Zip / Postal Code"></div>
      <div><label>Billing Country</label>${this.selectHtml(BILLING_COUNTRIES)}</div>
      <div><label>Billing State / Province</label><input name="province" placeholder="Tỉnh / Thành phố"></div></div></div>`;
  }

  // Tóm tắt đơn ở cột phải (mỗi món có nút xoá)
  summaryHtml() {
    const lines = this.cart.items.map(c => `<div class="line"><div class="thumb">${c.item.emoji}</div>
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

  // Xử lý bấm chọn phương thức thanh toán: ghi nhớ lựa chọn rồi chỉ vẽ lại #payBox
  bindPayment(root) {
    bindAll(root, "[data-pay]", el => {
      this.payment = el.dataset.pay;
      root.querySelector("#payBox").innerHTML = this.paymentInnerHtml();
      this.bindPayment(root);   // hộp vừa vẽ lại → gắn lại sự kiện bấm cho các ô mới
    });
  }

  // Đánh dấu lỗi (viền đỏ) cho các ô bắt buộc; trả về true nếu tất cả hợp lệ
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
    //  Gửi đủ thông tin liên hệ + địa chỉ để nhân viên xem và để khách tra cứu đơn (mã đơn + SĐT)
    const address = [f.addr1.value, f.city.value, f.province.value].map(x => x.trim()).filter(Boolean).join(", ");
    this.app.placeOrder({
      name: `${f.first.value} ${f.last?.value || ""}`.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), address,
    }, this.payment);
  }
}


/* ---------- 4d) Customer Dashboard ---------- */

// Khách không có tài khoản nên lịch sử gồm: các đơn đặt từ máy này (Store.myOrders)
// + các đơn khách tra cứu thêm bằng mã đơn và số điện thoại.
class DashboardView extends View {
  // Ô Total gồm số tiền và nút xem các món đã đặt
  orderRowHtml(o) {
    const p = findPayment(o.payment), st = ORDER_STATUS[o.status];
    return `<tr><td>#${o.id}</td><td>${esc(o.customer)}</td><td>${o.items} items</td><td>${esc(o.mode)}</td><td>${esc(o.when)}</td>
      <td>${esc(p.short)}<small>${esc(paymentStatusLabel(o))}</small></td>
      <td><span class="st ${st.cls}">${st.label}</span></td>
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
    return `<h1>Customer Dashboard</h1><div class="box">${orders.length ? this.tableHtml(orders) : `<div class="empty">You have no orders yet.</div>`}</div>${this.lookupHtml()}`;
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

  // Trạng thái đơn do nhân viên cập nhật ở tab khác → tự làm mới bảng
  signature() { return Store.ordersSignature(); }
}
