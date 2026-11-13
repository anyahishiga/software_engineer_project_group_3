"use strict";

const POLL_MS = 5000;                                      // chu kỳ tự làm mới (giây × 1000), bổ sung cho sự kiện "storage"
const ROLE_VIEWS = { staff: ["Staff", "Admin"], admin: ["Admin"] };   // view nhân viên → các vai trò được vào
const CUSTOMER_VIEWS = ["home", "order", "cart", "checkout", "dashboard"];   // chỉ mở khi đã chọn "khách hàng"

class App {
  constructor() {
    Store.init();        // lần đầu: nạp dữ liệu mẫu (Data.js, Users.js, Orders.js) vào localStorage
    Store.loadMenu();    // từ đây MENU / CATEGORIES lấy từ localStorage

    this.root = document.getElementById("app"); this.modalRoot = document.getElementById("modalRoot");
    this.cart = new Cart(); this.schedule = new PickupSchedule(); this.current = "home";
    this.views = {
      home: new HomeView(this), order: new OrderView(this), cart: new CartView(this), checkout: new CheckoutView(this), dashboard: new DashboardView(this),
      staff: new StaffView(this), admin: new AdminView(this),
    };
    this.cart.subscribe(() => this.refresh());

    document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); this.navigate(b.dataset.view); }));
    document.getElementById("signInBtn").addEventListener("click", () => this.openLogin());

    // Đồng bộ giữa các tab cùng trình duyệt: tab khác ghi localStorage → sự kiện "storage"; thêm polling để chắc chắn
    window.addEventListener("storage", e => this.onStorage(e));
    setInterval(() => this.tick(), POLL_MS);

    this.navigate(this.homeView());   // tải lại trang vẫn giữ phiên nhân viên đã đăng nhập (sessionStorage)
  }

  /* --- phiên đăng nhập, phân quyền --- */

  get session() { return Store.session(); }

  homeView() {
    const s = Store.sessionValid() ? this.session : null;
    return !s || s.role === "Customer" ? "home" : s.role === "Admin" ? "admin" : "staff";
  }
  openLogin() { new LoginModal(this.modalRoot, user => this.login(user)).open(); }
  login(user) { Store.startSession(user.role, user.username); this.toast(`Welcome, ${user.username}`); this.navigate(this.homeView()); }
  // Đăng xuất nhân viên → quay về trang khách (mặc định luôn là khách hàng)
  exit() { this.cart.clear(); Store.startSession("Customer"); this.navigate("home"); }

  // Trang nhân viên / quản trị chỉ mở khi đã đăng nhập đúng vai trò
  allowed(name) {
    const s = this.session;
    if (!s) return false;
    if (CUSTOMER_VIEWS.includes(name)) return s.role === "Customer";
    return !!ROLE_VIEWS[name]?.includes(s.role) && Store.sessionValid();
  }
  guard() {
    if (this.session && !Store.sessionValid()) { Store.endSession(); this.toast("Your session is no longer valid"); }
    if (!this.session) Store.startSession("Customer");   // không có phiên → mặc định là khách
    if (!this.allowed(this.current)) this.current = this.homeView();
  }

  /* --- điều hướng & vẽ lại --- */

  navigate(name) {
    if (!this.allowed(name)) name = this.homeView();
    this.current = name; this.refresh(); window.scrollTo({ top: 0 });
  }
  refresh() {
    this.guard();
    document.body.dataset.mode = this.current in ROLE_VIEWS ? "staff" : "customer";   // CSS ẩn thanh điều hướng ở trang nhân viên
    const active = this.current === "checkout" ? "cart" : this.current;
    document.querySelectorAll(".nav-btn[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === active));
    document.getElementById("cartBadge").textContent = this.cart.count;
    this.views[this.current].mount(this.root);
  }
  onStorage(e) {
    if (e.key === null) return location.reload();               // ai đó xóa toàn bộ storage → khởi động lại để nạp dữ liệu mẫu
    if (!e.key.startsWith("rp_")) return;
    if (e.key === KEYS.menu) { Store.loadMenu(); if (["home", "order"].includes(this.current)) return this.refresh(); }
    this.tick();
  }
  tick() {
    if (!this.allowed(this.current)) return this.refresh();   // vd. tài khoản vừa bị Admin khóa
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