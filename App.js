"use strict";
class App {
  constructor() {
    this.root = document.getElementById("app"); this.modalRoot = document.getElementById("modalRoot");
    this.cart = new Cart(); this.schedule = new PickupSchedule(); this.orders = []; this.current = "order";
    this.views = { order: new OrderView(this), cart: new CartView(this), checkout: new CheckoutView(this), dashboard: new DashboardView(this) };
    this.cart.add(new CartItem(MENU[1], 0, 1, "no latuce")); this.cart.add(new CartItem(MENU[0], 0, 4));
    this.cart.subscribe(() => this.refresh());
    document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => this.navigate(b.dataset.view)));
    this.navigate("order");
  }
  navigate(name) { this.current = name; this.refresh(); window.scrollTo({ top: 0 }); }
  refresh() {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === this.current));
    document.getElementById("cartBadge").textContent = this.cart.count;
    this.views[this.current].mount(this.root);
  }
  // [VN][THÊM MỚI] Mã đơn kế tiếp — dùng làm nội dung chuyển khoản trên mã QR (RP1001...) và khi đặt đơn
  get nextOrderId() { return 1000 + this.orders.length + 1; }
  // [VN][SỬA] Nhận thêm payment; id đơn lấy từ nextOrderId (trước: const id = 1000 + this.orders.length + 1)
  placeOrder(customer, payment) {
    const id = this.nextOrderId;
    const lines = this.cart.items.map(Order.lineFrom); // chụp lại các món trước khi xoá giỏ hàng
    this.orders.unshift(new Order(id, lines, this.cart.total, this.schedule, customer, payment));
    this.cart.clear(); this.toast(`Order #${id} placed successfully!`); this.navigate("dashboard");
  }
  toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(this._t); this._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
}
document.addEventListener("DOMContentLoaded", () => new App());