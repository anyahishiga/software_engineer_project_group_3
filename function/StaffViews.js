"use strict";

/* View nhân viên và quản trị. */

const URGENT_MINUTES = 30;   // Ngưỡng đơn ưu tiên.

// Tiêu đề dùng chung cho dashboard.
class DashView extends View {
  headHtml(eyebrow, title) {
    return `<header class="dash-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div>
      <div class="dash-right"><span class="date">${longDate(new Date())}</span><button class="link-btn" data-signout>Sign out</button></div></header>`;
  }
  bindHead(root) { bindAll(root, "[data-signout]", () => this.app.exit()); }
}

/* ---------- Chọn vai trò ---------- */

class WelcomeView extends View {
  render() {
    return `<div class="welcome"><p class="eyebrow">Welcome</p><h1>Restaurant Order Management Group 3</h1>
      <p class="lead">Please choose how you would like to continue</p>
      <div class="roles">
        <button class="role-card" data-role="customer"><span class="num">1</span><strong>I am a customer</strong><small>Browse the menu and place an order — no sign in needed</small></button>
        <button class="role-card" data-role="staff"><span class="num">2</span><strong>I am a staff member</strong><small>Sign in to handle orders or manage the restaurant</small></button>
      </div></div>`;
  }
  bind(root) {
    bindAll(root, "[data-role=customer]", () => this.app.chooseCustomer());
    bindAll(root, "[data-role=staff]", () => this.app.openLogin());
  }
}

/* ---------- Staff Dashboard ---------- */

class StaffView extends DashView {
  constructor(app) { super(app); this.filter = "active"; }

  // Cập nhật khi đơn hoặc phút thay đổi.
  signature() { return `${Store.ordersSignature()}:${Math.floor(Date.now() / 60000)}`; }

  isUrgent(o) { return o.isActive && (o.isAsap || o.dueAt - Date.now() <= URGENT_MINUTES * 60000); }

  // Ưu tiên đơn cần xong sớm nhất.
  sortedOrders() {
    const all = this.app.orders;
    return this.filter === "active"
      ? all.filter(o => o.isActive).sort((a, b) => a.dueAt - b.dueAt)
      : all.filter(o => !o.isActive).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  kpisHtml() {
    const all = this.app.orders, today = isoDate(new Date());
    const kpi = (cls, label, value, note) => `<div class="kpi ${cls}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
    return `<div class="kpis">${kpi("", "Active orders", all.filter(o => o.isActive).length, "orders to monitor")}
      ${kpi("hot", "Priority orders", all.filter(o => this.isUrgent(o)).length, "ASAP or due soon")}
      ${kpi("", "Completed today", all.filter(o => o.status === "Completed" && isoDate(new Date(o.createdAt)) === today).length, "delivered or picked up")}</div>`;
  }

  orderCardHtml(o) {
    const st = ORDER_STATUS[o.status], p = findPayment(o.payment);
    const steps = o.nextSteps.map(([status, label]) =>
      `<button class="${status === "Rejected" ? "btn-outline" : "btn-primary"}" data-status="${o.id}:${status}">${label}</button>`).join("");
    const payBtn = !o.paid && o.status !== "Rejected" ? `<button class="btn-ghost" data-paid="${o.id}">Mark as paid</button>` : "";
    const address = o.mode === "delivery" && o.address ? `<div><span class="lbl">Address</span><span>${esc(o.address)}</span></div>` : "";
    return `<article class="ocard ${when(this.isUrgent(o), "urgent")}">
      <header><strong>#${o.id}</strong><span class="tag ${o.mode}">${o.mode}</span><span class="tag time">${o.isAsap ? "ASAP" : esc(o.time)}</span>
        <span class="st ${st.cls}">${st.label}</span></header>
      <div class="info-grid"><div><span class="lbl">Customer</span><b>${esc(o.customer)}</b><span>${esc(o.phone)}</span></div>${address}</div>
      <div class="lines">${OrderItemsModal.linesHtml(o.lines)}</div>
      ${when(o.status === "Rejected", `<div class="reject-reason"><span class="lbl">Rejection reason</span>${esc(o.rejectReason || "—")}</div>`)}
      <footer><div><span class="mini">${esc(p.short)} · ${esc(paymentStatusLabel(o))}</span><strong class="tot">${money(o.total)}</strong></div>
        <div class="acts-row">${payBtn}${steps}</div></footer></article>`;
  }

  boardHtml() {
    const list = this.sortedOrders(), activeCount = this.app.orders.filter(o => o.isActive).length;
    const tab = (key, label) => `<button data-filter="${key}" class="${when(this.filter === key, "on")}">${label}</button>`;
    return `<section class="board"><div class="board-bar"><div class="segment">${tab("active", `Active orders (${activeCount})`)}${tab("done", "Completed / rejected")}</div>
      <small class="muted">Orders due soonest are shown first</small></div>
      ${list.length ? `<div class="ocards">${list.map(o => this.orderCardHtml(o)).join("")}</div>` : `<div class="empty">No orders here</div>`}</section>`;
  }

  bindBoard(root) {
    bindAll(root, "[data-filter]", el => { this.filter = el.dataset.filter; this.app.refresh(); });
    bindAll(root, "[data-status]", el => {
      const [id, status] = el.dataset.status.split(":");
      this.changeStatus(Number(id), status);
    });
    bindAll(root, "[data-paid]", el => { Store.markPaid(Number(el.dataset.paid)); this.app.toast("Payment recorded"); this.app.refresh(); });
  }

  changeStatus(id, status) {
    if (status === "Rejected") return new RejectModal(this.app.modalRoot, id, reason => this.applyStatus(id, status, reason)).open();
    this.applyStatus(id, status);
  }

  applyStatus(id, status, reason = "") {
    const ok = Store.setStatus(id, status, reason);
    this.app.toast(ok ? `Order #${id}: ${ORDER_STATUS[status].label}` : `Order #${id} was just updated elsewhere — the list has been refreshed`);
    this.app.refresh();
  }

  render() { return `${this.headHtml("Kitchen &amp; service", "Staff Dashboard")}${this.kpisHtml()}${this.boardHtml()}`; }
  bind(root) { this.bindHead(root); this.bindBoard(root); }
}

/* ---------- Admin Dashboard ---------- */

const ADMIN_TABS = [["orders", "Orders"], ["menu", "Menu"], ["analytics", "Analytics"], ["users", "Staff accounts"]];

class AdminView extends DashView {
  constructor(app) { super(app); this.tab = "orders"; this.board = new StaffView(app); }

  // Chỉ Orders và Analytics tự cập nhật.
  signature() { return this.tab === "orders" || this.tab === "analytics" ? this.board.signature() : ""; }

  tabsHtml() {
    return `<nav class="admin-tabs">${ADMIN_TABS.map(([key, label]) =>
      `<button class="${when(this.tab === key, "on")}" data-atab="${key}">${label}</button>`).join("")}</nav>`;
  }

  /* --- Menu --- */

  menuHtml() {
    const rows = MENU.map(m => `<tr class="${when(!m.available, "off")}">
      <td><div class="item-cell">${thumbHtml(m.img)}<div><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></div></div></td>
      <td>${esc(m.category)}</td>
      <td>${m.sizes.map(s => `${m.hasSizes ? `${esc(s.label)}: ` : ""}${money(s.price)}`).join("<br>")}</td>
      <td><span class="st ${m.available ? "st-ready" : "st-done"}">${m.available ? "Available" : "Unavailable"}</span></td>
      <td class="row-acts"><button class="btn-view" data-edit-item="${m.id}">Edit</button>
        <button class="btn-view" data-toggle-item="${m.id}">${m.available ? "Mark unavailable" : "Mark available"}</button></td></tr>`).join("");
    return `<section class="box wide"><div class="box-head"><div><p class="eyebrow">Catalog</p><h2>Menu (${MENU.length} items)</h2></div>
      <div class="box-tools"><small class="muted">Unavailable items are hidden from guests but remain in existing orders.</small>
      <button class="btn-primary" data-add-item>+ Add item</button></div></div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>Item</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>${rows}</table></div></section>`;
  }

  bindMenu(root) {
    const refresh = () => this.app.refresh();
    bindAll(root, "[data-add-item]", () => new MenuItemModal(this.app.modalRoot, null, refresh).open());
    bindAll(root, "[data-edit-item]", el => {
      const item = MENU.find(m => m.id === Number(el.dataset.editItem));
      if (item) new MenuItemModal(this.app.modalRoot, item, refresh).open();
    });
    bindAll(root, "[data-toggle-item]", el => { Store.toggleAvailable(Number(el.dataset.toggleItem)); refresh(); });
  }

  /* --- Analytics trong ngày --- */

  analyticsHtml() {
    const s = Store.stats(), max = Math.max(1, ...s.dishes.map(d => d.qty));
    const stat = (label, value, note) => `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
    const rows = s.dishes.map(d => `<div class="bar-row"><span>${esc(d.name)}${when(d.size, ` <small class="inline">(${esc(d.size)})</small>`)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.qty / max * 100)}%"></div></div><b>${d.qty}</b></div>`).join("");
    return `<div class="stats">${stat("Revenue collected today", money(s.revenue), "paid orders only")}
      ${stat("Total order value today", money(s.expected), "including unpaid orders")}${stat("Orders today", s.count, "excluding rejected orders")}</div>
      <section class="box wide"><div class="box-head"><div><p class="eyebrow">Best sellers</p><h2>Items ordered today</h2></div></div>
      ${s.dishes.length ? `<div class="bars">${rows}</div>` : `<div class="empty">No orders yet today</div>`}</section>`;
  }

  /* --- Tài khoản nhân viên --- */

  usersHtml() {
    const me = Store.session()?.username;
    const rows = Store.users().map(u => `<tr><td class="muted">#${u.user_id}</td>
      <td><b>${esc(u.username)}</b>${when(u.username === me, ` <span class="chip">You</span>`)}</td><td>${esc(u.role)}</td>
      <td><span class="st ${u.status === "Active" ? "st-ready" : "st-rejected"}">${u.status}</span></td>
      <td class="row-acts"><button class="btn-view" data-edit-user="${u.user_id}">${u.username === me ? "Change password" : "Edit"}</button></td></tr>`).join("");
    return `<section class="box wide"><div class="box-head"><div><p class="eyebrow">Access control</p><h2>Staff accounts</h2></div>
      <div class="box-tools"><small class="muted">Locked accounts cannot sign in to the dashboard.</small>
      <button class="btn-primary" data-add-user>+ New staff account</button></div></div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr>${rows}</table></div></section>`;
  }

  bindUsers(root) {
    const refresh = () => this.app.refresh(), me = Store.session()?.username;
    bindAll(root, "[data-add-user]", () => new UserModal(this.app.modalRoot, null, refresh).open());
    bindAll(root, "[data-edit-user]", el => {
      const user = Store.users().find(u => u.user_id === Number(el.dataset.editUser));
      if (user) new UserModal(this.app.modalRoot, user, refresh, user.username === me).open();
    });
  }

  /* --- Hiển thị --- */

  render() {
    const body = { orders: () => this.board.kpisHtml() + this.board.boardHtml(), menu: () => this.menuHtml(), analytics: () => this.analyticsHtml(), users: () => this.usersHtml() };
    return `${this.headHtml("Administration", "Admin Dashboard")}${this.tabsHtml()}${body[this.tab]()}`;
  }

  bind(root) {
    this.bindHead(root);
    bindAll(root, "[data-atab]", el => { this.tab = el.dataset.atab; this.app.refresh(); });
    if (this.tab === "orders") this.board.bindBoard(root);
    if (this.tab === "menu") this.bindMenu(root);
    if (this.tab === "users") this.bindUsers(root);
  }
}
