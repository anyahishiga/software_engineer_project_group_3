"use strict";

// true = chế độ demo: giỏ hàng có sẵn 2 món để test nhanh + màn hình chào mừng có nút "Reset dữ liệu mẫu".
// Đặt false khi nộp / trình bày bản cuối.
const DEMO_MODE = true;

const POLL_MS = 5000;                                      // chu kỳ tự làm mới (giây × 1000), bổ sung cho sự kiện "storage"
const CUSTOMER_VIEWS = ["order", "cart", "checkout", "dashboard"];
const ROLE_VIEWS = { staff: ["Staff", "Admin"], admin: ["Admin"] };   // view → các vai trò được vào

class App {
  constructor() {
    Store.init();        // lần đầu: nạp dữ liệu mẫu (Data.js, Users.js, Orders.js) vào localStorage
    Store.loadMenu();    // từ đây MENU / CATEGORIES lấy từ localStorage

    this.root = document.getElementById("app"); this.modalRoot = document.getElementById("modalRoot");
    this.cart = new Cart(); this.schedule = new PickupSchedule(); this.current = "welcome";
    this.views = {
      welcome: new WelcomeView(this),
      order: new OrderView(this), cart: new CartView(this), checkout: new CheckoutView(this), dashboard: new DashboardView(this),
      staff: new StaffView(this), admin: new AdminView(this),
    };
    if (DEMO_MODE && MENU[1] && MENU[0]) { this.cart.add(new CartItem(MENU[1], 0, 1, "no latuce")); this.cart.add(new CartItem(MENU[0], 0, 4)); }
    this.cart.subscribe(() => this.refresh());

    document.querySelectorAll(".nav-btn[data-view]").forEach(b => b.addEventListener("click", () => this.navigate(b.dataset.view)));
    document.getElementById("exitBtn").addEventListener("click", () => this.exit());

    // Đồng bộ giữa các tab cùng trình duyệt: tab khác ghi localStorage → sự kiện "storage"; thêm polling để chắc chắn
    window.addEventListener("storage", e => this.onStorage(e));
    setInterval(() => this.tick(), POLL_MS);

    this.navigate(this.homeView());   // tải lại trang vẫn giữ vai trò đã chọn (sessionStorage)
  }

  /* --- vai trò, phiên đăng nhập, phân quyền --- */

  get session() { return Store.session(); }

  homeView() {
    const s = Store.sessionValid() ? this.session : null;
    return !s ? "welcome" : s.role === "Customer" ? "order" : s.role === "Admin" ? "admin" : "staff";
  }
  chooseCustomer() { Store.startSession("Customer"); this.navigate("order"); }
  login(user) { Store.startSession(user.role, user.username); this.toast(`Xin chào, ${user.username}`); this.navigate(this.homeView()); }
  exit() { this.cart.clear(); Store.endSession(); this.navigate("welcome"); }

  // Màn hình nào được mở với phiên hiện tại. Chặn truy cập trang nhân viên/quản trị khi chưa đăng nhập (mục 1.9)
  allowed(name) {
    if (name === "welcome") return true;
    const s = this.session;
    if (!s) return false;
    if (CUSTOMER_VIEWS.includes(name)) return s.role === "Customer";
    return !!ROLE_VIEWS[name]?.includes(s.role) && Store.sessionValid();
  }
  guard() {
    if (this.session && !Store.sessionValid()) { Store.endSession(); this.toast("Phiên đăng nhập không còn hiệu lực"); }
    if (!this.allowed(this.current)) this.current = "welcome";
  }

  /* --- điều hướng & vẽ lại --- */

  navigate(name) {
    if (name !== "welcome" && !this.allowed(name)) this.toast("Vui lòng chọn vai trò / đăng nhập trước");
    this.current = name; this.refresh(); window.scrollTo({ top: 0 });
  }
  refresh() {
    this.guard();
    const s = this.session, isStaffArea = this.current in ROLE_VIEWS;
    document.body.dataset.mode = this.current === "welcome" ? "welcome" : isStaffArea ? "staff" : "customer";   // CSS ẩn/hiện thanh điều hướng theo vai trò
    document.getElementById("userLabel").textContent = !s ? "" : s.role === "Customer" ? "Khách hàng" : `${s.username} · ${s.role}`;
    document.getElementById("exitBtn").textContent = isStaffArea ? "Đăng xuất" : "Đổi vai trò";
    document.querySelectorAll(".nav-btn[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === this.current));
    document.getElementById("cartBadge").textContent = this.cart.count;
    this.views[this.current].mount(this.root);
  }
  onStorage(e) {
    if (e.key === null) return location.reload();               // ai đó xóa toàn bộ storage → khởi động lại để nạp dữ liệu mẫu
    if (!e.key.startsWith("rp_")) return;
    if (e.key === KEYS.menu) { Store.loadMenu(); if (this.current === "order") return this.refresh(); }
    this.tick();
  }
  tick() {
    if (this.current !== "welcome" && !this.allowed(this.current)) return this.refresh();   // vd. tài khoản vừa bị Admin khóa
    this.views[this.current].onTick();
  }

  /* --- dữ liệu đơn hàng (lưu trong localStorage qua Store) --- */

  get orders() { return Store.orders(); }          // tất cả đơn — dành cho Nhân viên / Admin
  get myOrders() { return Store.myOrders(); }      // đơn của khách trên thiết bị này (+ đơn đã tra cứu)

  //  Mã đơn kế tiếp — dùng làm nội dung chuyển khoản trên mã QR (RP1001...) và khi đặt đơn
  get nextOrderId() { return Store.nextOrderId(); }

  // info: { name, phone, email, address }; payment: id phương thức thanh toán
  placeOrder(info, payment) {
    const gone = this.cart.items.find(c => !Store.isAvailable(c.item.id));   // món có thể vừa bị Admin ngừng bán
    if (gone) return this.toast(`"${gone.item.name}" is no longer available — please remove it from your cart`);
    const scheduleError = PickupSchedule.validate(this.schedule.date, this.schedule.time);
    if (scheduleError) return this.toast(scheduleError);

    const id = this.nextOrderId;
    const lines = this.cart.items.map(Order.lineFrom); // chụp lại các món trước khi xoá giỏ hàng
    Store.addOrder(new Order(id, lines, this.cart.total, this.schedule, info.name, payment, info));
    Store.rememberOrder(id);
    this.cart.clear(); this.toast(`Order #${id} placed successfully!`); this.navigate("dashboard");
  }

  toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(this._t); this._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
}
document.addEventListener("DOMContentLoaded", () => new App());
