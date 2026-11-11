"use strict";

/* =====================================================================
   Các view cho Nhân viên / Quản trị viên (tách riêng khỏi Views.js dành cho khách)
   - WelcomeView : màn hình chọn vai trò
   - StaffView   : Staff Dashboard (danh sách đơn ưu tiên + cập nhật trạng thái)
   - AdminView   : Admin Dashboard = Staff Dashboard + Quản lý thực đơn + Thống kê + Tài khoản
   ===================================================================== */

const URGENT_MINUTES = 30;   // đơn ASAP, hoặc còn ≤ 30 phút tới giờ hẹn (kể cả quá giờ) được highlight

/* ---------- Màn hình chào mừng ---------- */

class WelcomeView extends View {
  render() {
    return `<div class="welcome"><h1>Welcome</h1><p class="sub-lead">Vui lòng chọn vai trò để tiếp tục</p>
      <div class="roles">
        <button class="role-card" data-role="customer"><span class="ico">🍽️</span><strong>Tôi là Khách Hàng</strong>
          <small>Xem thực đơn và đặt món — không cần đăng nhập</small></button>
        <button class="role-card" data-role="staff"><span class="ico">👨‍🍳</span><strong>Tôi là Nhân Viên</strong>
          <small>Đăng nhập để xử lý đơn hàng hoặc quản trị</small></button>
      </div>
      ${when(DEMO_MODE, `<p class="mini demo-reset"><button class="link-btn" data-reset>Reset dữ liệu mẫu (chế độ demo)</button></p>`)}</div>`;
  }

  bind(root) {
    bindAll(root, "[data-role=customer]", () => this.app.chooseCustomer());
    bindAll(root, "[data-role=staff]", () => new LoginModal(this.app.modalRoot, user => this.app.login(user)).open());
    bindAll(root, "[data-reset]", () => {
      if (!confirm("Xóa toàn bộ dữ liệu hiện tại (đơn hàng, thay đổi thực đơn, tài khoản) và nạp lại dữ liệu mẫu?")) return;
      Store.reset(); location.reload();
    });
  }
}

/* ---------- Staff Dashboard ---------- */

class StaffView extends View {
  constructor(app) { super(app); this.filter = "active"; }

  // Dữ liệu đơn đổi, hoặc sang phút mới (để highlight đơn gần giờ hẹn) → vẽ lại
  signature() { return `${Store.ordersSignature()}:${Math.floor(Date.now() / 60000)}`; }

  isUrgent(o) { return o.isActive && (o.isAsap || o.dueAt - Date.now() <= URGENT_MINUTES * 60000); }

  // Đang xử lý: sắp theo thời điểm cần xong (ASAP tính từ lúc đặt, đơn hẹn giờ tính theo giờ hẹn) — sớm nhất lên đầu
  sortedOrders() {
    const all = this.app.orders;
    return this.filter === "active"
      ? all.filter(o => o.isActive).sort((a, b) => a.dueAt - b.dueAt)
      : all.filter(o => !o.isActive).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  orderCardHtml(o) {
    const st = ORDER_STATUS[o.status], p = findPayment(o.payment);
    const steps = o.nextSteps.map(([status, label]) =>
      `<button class="${status === "Rejected" ? "btn-danger" : "btn-primary"}" data-status="${o.id}:${status}">${label}</button>`).join("");
    const payBtn = !o.paid && o.status !== "Rejected"
      ? `<button class="btn-ghost" data-paid="${o.id}">${o.payment === "bank" ? "Đã nhận chuyển khoản" : "Đã thu tiền mặt"}</button>` : "";
    return `<article class="ocard ${when(this.isUrgent(o), "urgent")}">
      <header><strong>#${o.id}</strong>
        <span class="tag ${o.mode}">${o.mode === "delivery" ? "🚚 Delivery" : "🛍 Pickup"}</span>
        <span class="tag time">${o.isAsap ? "⚡ ASAP" : `⏰ ${esc(o.when)}`}</span>
        <span class="st ${st.cls}">${st.label}</span></header>
      <div class="meta">${esc(o.customer)} · ${esc(o.phone)}${when(o.mode === "delivery" && o.address, `<br>📍 ${esc(o.address)}`)}</div>
      <div class="lines">${OrderItemsModal.linesHtml(o.lines)}</div>
      <footer><span class="mini">${money(o.total)} · ${esc(p.short)} — <b>${esc(paymentStatusLabel(o))}</b></span>
        <div class="acts-row">${payBtn}${steps}</div></footer></article>`;
  }

  boardHtml() {
    const list = this.sortedOrders(), activeCount = this.app.orders.filter(o => o.isActive).length;
    const tab = (key, label) => `<button data-filter="${key}" class="${when(this.filter === key, "on")}">${label}</button>`;
    return `<div class="board-head"><div class="segment">${tab("active", `Đang xử lý (${activeCount})`)}${tab("done", "Đã xong / từ chối")}</div>
      <small class="muted">Tự cập nhật mỗi ${POLL_MS / 1000} giây · đơn gần giờ nhận nhất ở trên cùng</small></div>
      ${list.length ? `<div class="ocards">${list.map(o => this.orderCardHtml(o)).join("")}</div>` : `<div class="empty">Không có đơn nào</div>`}`;
  }

  bindBoard(root) {
    bindAll(root, "[data-filter]", el => { this.filter = el.dataset.filter; this.app.refresh(); });
    bindAll(root, "[data-status]", el => {
      const [id, status] = el.dataset.status.split(":");
      this.changeStatus(Number(id), status);
    });
    bindAll(root, "[data-paid]", el => { Store.markPaid(Number(el.dataset.paid)); this.app.toast("Đã ghi nhận thanh toán"); this.app.refresh(); });
  }

  changeStatus(id, status) {
    if (status === "Rejected" && !confirm(`Từ chối đơn #${id}?`)) return;
    const ok = Store.setStatus(id, status);
    this.app.toast(ok ? `Đơn #${id}: ${ORDER_STATUS[status].label}` : `Đơn #${id} vừa được cập nhật ở nơi khác — danh sách đã làm mới`);
    this.app.refresh();
  }

  render() { return `<h1>Staff Dashboard</h1>${this.boardHtml()}`; }
  bind(root) { this.bindBoard(root); }
}

/* ---------- Admin Dashboard ---------- */

const ADMIN_TABS = [
  ["orders", "Đơn hàng"], ["menu", "Quản lý thực đơn"], ["analytics", "Thống kê"], ["users", "Tài khoản nhân viên"],
];

class AdminView extends View {
  constructor(app) { super(app); this.tab = "orders"; this.board = new StaffView(app); }

  // Tab Đơn hàng / Thống kê tự cập nhật theo dữ liệu; tab Menu / Tài khoản không tự vẽ lại (tránh mất thao tác đang làm)
  signature() { return this.tab === "orders" || this.tab === "analytics" ? this.board.signature() : ""; }

  tabsHtml() {
    return `<div class="tabs">${ADMIN_TABS.map(([key, label]) =>
      `<button class="tab ${when(this.tab === key, "active")}" data-atab="${key}">${label}</button>`).join("")}</div>`;
  }

  /* --- Quản lý thực đơn --- */

  menuHtml() {
    const rows = MENU.map(m => `<tr class="${when(!m.available, "off")}"><td>${esc(m.emoji)}</td>
      <td>${esc(m.name)}<small>${esc(m.desc)}</small></td><td>${esc(m.category)}</td>
      <td>${m.sizes.map(s => `${esc(s.label)}: ${money(s.price)}`).join("<br>")}</td>
      <td>${m.available ? "Đang bán" : "Ngừng bán"}</td>
      <td class="row-acts"><button class="btn-view" data-edit-item="${m.id}">Sửa</button>
        <button class="btn-view" data-toggle-item="${m.id}">${m.available ? "Ngừng bán" : "Bán lại"}</button></td></tr>`).join("");
    return `<div class="box"><div class="bar"><strong>Thực đơn (${MENU.length} món)</strong>
      <button class="btn-primary" data-add-item>+ Thêm món</button></div>
      <p class="mini muted">Giá hiển thị là giá chưa gồm thuế ${Cart.TAX_RATE * 100}%. Món "Ngừng bán" bị ẩn với khách nhưng vẫn giữ trong lịch sử đơn.</p>
      <div class="tbl-wrap"><table class="tbl"><tr><th></th><th>Món</th><th>Danh mục</th><th>Kích cỡ &amp; giá</th><th>Trạng thái</th><th></th></tr>${rows}</table></div></div>`;
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

  /* --- Thống kê trong ngày --- */

  analyticsHtml() {
    const s = Store.stats(), max = Math.max(1, ...s.dishes.map(d => d.qty));
    const rows = s.dishes.map(d => `<tr><td>${esc(d.name)}${when(d.size, ` <small class="inline">(${esc(d.size)})</small>`)}</td>
      <td class="qty-cell"><div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.qty / max * 100)}%"></div></div></td><td><strong>${d.qty}</strong></td></tr>`).join("");
    return `<div class="stats">
      <div class="stat"><span>Doanh thu hôm nay (đã thu)</span><strong>${money(s.revenue)}</strong></div>
      <div class="stat"><span>Tổng giá trị đơn hôm nay</span><strong>${money(s.expected)}</strong><small>gồm cả đơn chưa thu tiền</small></div>
      <div class="stat"><span>Số đơn hôm nay</span><strong>${s.count}</strong><small>không tính đơn bị từ chối</small></div></div>
      <div class="box"><div class="step">Số lượng món đã đặt hôm nay · ${fmtDate(new Date())}</div>
      ${s.dishes.length ? `<table class="tbl"><tr><th>Món</th><th></th><th>Số lượng</th></tr>${rows}</table>` : `<div class="empty">Hôm nay chưa có đơn nào</div>`}</div>`;
  }

  /* --- Tài khoản nhân viên --- */

  usersHtml() {
    const me = Store.session()?.username;
    const rows = Store.users().map(u => `<tr><td>${u.user_id}</td><td>${esc(u.username)}${when(u.username === me, " <small class=\"inline\">(bạn)</small>")}</td>
      <td>${esc(u.role)}</td><td><span class="st ${u.status === "Active" ? "st-ready" : "st-rejected"}">${u.status === "Active" ? "Hoạt động" : "Đã khóa"}</span></td>
      <td class="row-acts"><button class="btn-view" data-pass-user="${u.user_id}">Đổi mật khẩu</button>
        ${when(u.username !== me, `<button class="btn-view" data-lock-user="${u.user_id}">${u.status === "Active" ? "Khóa" : "Mở khóa"}</button>`)}</td></tr>`).join("");
    return `<div class="box"><div class="bar"><strong>Tài khoản</strong><button class="btn-primary" data-add-user>+ Tạo tài khoản nhân viên</button></div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>ID</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr>${rows}</table></div></div>`;
  }

  bindUsers(root) {
    const refresh = () => this.app.refresh();
    bindAll(root, "[data-add-user]", () => new UserModal(this.app.modalRoot, null, refresh).open());
    bindAll(root, "[data-pass-user]", el => {
      const user = Store.users().find(u => u.user_id === Number(el.dataset.passUser));
      if (user) new UserModal(this.app.modalRoot, user, refresh).open();
    });
    bindAll(root, "[data-lock-user]", el => {
      const user = Store.users().find(u => u.user_id === Number(el.dataset.lockUser));
      if (!user) return;
      Store.updateUser(user.user_id, { status: user.status === "Active" ? "Locked" : "Active" });
      refresh();
    });
  }

  /* --- ghép lại --- */

  render() {
    const body = { orders: () => this.board.boardHtml(), menu: () => this.menuHtml(), analytics: () => this.analyticsHtml(), users: () => this.usersHtml() };
    return `<h1>Admin Dashboard</h1>${this.tabsHtml()}${body[this.tab]()}`;
  }

  bind(root) {
    bindAll(root, "[data-atab]", el => { this.tab = el.dataset.atab; this.app.refresh(); });
    if (this.tab === "orders") this.board.bindBoard(root);
    if (this.tab === "menu") this.bindMenu(root);
    if (this.tab === "users") this.bindUsers(root);
  }
}
