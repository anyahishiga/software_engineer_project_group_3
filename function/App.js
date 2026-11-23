//  các hàm chính của ứng dụng:



// điều hướng: navigate(name) → refresh() → this.views[name].mount()
// đồng bộ giữa các tab: onStorage() → tick() → Store.sync() → refresh()
// tạo đơn: placeOrder() → Store.addOrder() → Store.rememberOrder() → Store.sync()
// thông báo: toast(msg)z
// quantrị phiên đăng nhập: login() → Store.startSession() → Store.sync() → navigate()
// phân quyền: allowed(name) → guard() → refresh()









"use strict";



                        

const ROLE_VIEWS = { staff: ["Staff", "Admin"], admin: ["Admin"] };   // view nhân viên → các vai trò được vào


const CUSTOMER_VIEWS = ["home", "order", "cart", "checkout", "dashboard"];   // chỉ mở khi đã chọn "khách hàng"






class App {

  constructor() {


    this.ready = false;  // true sau khi nạp xong dữ liệu lần đầu
    this.online = true;  // false khi mất kết nối server (để chỉ báo lỗi 1 lần)




    this.root = document.getElementById("app"); this.modalRoot = document.getElementById("modalRoot");
    this.cart = new Cart(); this.schedule = new PickupSchedule(); this.current = "home";''
    

    // Các view của ứng dụng (khách, nhân viên, quản trị) — mỗi view là 1 class riêng
    this.views = {
      home: new HomeView(this), order: new OrderView(this), cart: new CartView(this), checkout: new CheckoutView(this), dashboard: new DashboardView(this),
      staff: new StaffView(this), admin: new AdminView(this),
    };
    this.cart.subscribe(() => this.refresh());

    document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); this.navigate(b.dataset.view); }));
    
    
    // Nút "Đăng nhập" mở cửa sổ đăng nhập
    document.getElementById("signInBtn").addEventListener("click", () => this.openLogin());



    // Đồng bộ giữa các tab cùng trình duyệt:
    window.addEventListener("storage", e => this.onStorage(e));
    setInterval(() => this.tick(), POLL_MS);




    this.start();   // [API] nạp dữ liệu từ server rồi mới vào trang đầu tiên
  } // này là của hàm constructor


  // [API] Nạp dữ liệu từ server (thực đơn, đơn hàng...) rồi vào trang. Tải lại trang vẫn giữ phiên nhân viên đã đăng nhập (sessionStorage).
  async start() {
    this.root.innerHTML = `<p class="empty">Loading…</p>`;
    const connected = await Store.init();
    this.ready = true;
    this.navigate(this.homeView());
    if (!connected) this.toast("Cannot reach the server. Please try again.");
  }


  /* --- phiên đăng nhập, phân quyền --- */
  get session() { return Store.session(); }

  homeView() {
    const s = Store.sessionValid() ? this.session : null;
    return !s || s.role === "Customer" ? "home" : s.role === "Admin" ? "admin" : "staff";
  }




  openLogin() { new LoginModal(this.modalRoot, user => this.login(user)).open(); }


   // Xử lý sau khi đăng nhập thành công
  // [API] user.token do server cấp; sync() để tải ngay danh sách đơn / tài khoản của nhân viên trước khi vẽ trang.
  async login(user) {

    Store.startSession(user.role, user.username, user.token);
    await Store.sync(true);
    this.toast(`Welcome, ${user.username}`); this.navigate(this.homeView());
  }
  // Đăng xuất nhân viên → quay về trang khách (mặc định luôn là khách hàng)
  exit() { this.cart.clear(); Store.clearPrivate(); Store.startSession("Customer"); this.navigate("home"); }


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




  /// Cập nhật khi tab khác trên cùng trình duyệt đổi localStorage (nay chỉ còn danh sách đơn của khách "rp_my_orders")
  onStorage(e) {
    if (e.key === null) return location.reload();               // ai đó xóa toàn bộ storage → tải lại trang
    if (!e.key.startsWith("rp_")) return;
    this.tick();
  }



  // Cập nhật dữ liệu theo chu kỳ để đồng bộ giữa các máy / tab (hỏi lại server)
  async tick() {
    if (!this.ready) return;
    const connected = await Store.sync();
    if (!connected && this.online) this.toast("Lost connection to the server");   // chỉ báo 1 lần
    this.online = connected;
    if (!this.allowed(this.current)) return this.refresh();   // vd. tài khoản vừa bị Admin khóa
    if (Store.menuChanged && ["home", "order"].includes(this.current)) return this.refresh();   // thực đơn vừa đổi
    this.views[this.current].onTick();  // cho phép view tự cập nhật theo chu kỳ (vd. đồng hồ PickupSchedule)
  }


  /* --- dữ liệu đơn hàng  --- */
  get orders() { return Store.orders(); }          // tất cả đơn — dành cho Nhân viên / Admin
  get myOrders() { return Store.myOrders(); }      // đơn của khách trên thiết bị này (+ đơn đã tra cứu)



  //  Mã đơn kế tiếp — dùng làm nội dung chuyển khoản trên mã QR (RP1001...) và khi đặt đơn
  get nextOrderId() { return Store.nextOrderId(); }



  // info: { name, phone, email, address }; payment: id phương thức thanh toán
  // [API] Gửi đơn lên server; server tính lại giá từ database và tự cấp mã đơn.
  async placeOrder(info, payment) {

    
    const gone = this.cart.items.find(c => !Store.isAvailable(c.item.id));   // món có thể vừa bị Admin ngừng bán
    if (gone) return this.toast(`"${gone.item.name}" is no longer available — please remove it from your cart`);
    const scheduleError = PickupSchedule.validate(this.schedule.date, this.schedule.time);
    if (scheduleError) return this.toast(scheduleError);

    const expectedId = this.nextOrderId;   // mã đang hiện trên QR chuyển khoản


    // [API] Chỉ gửi mã món, size, số lượng, ghi chú — server tự lấy tên và giá từ database.
    const lines = this.cart.items.map(c => ({ item_id: c.item.id, size: c.item.hasSizes ? c.size.label : "", qty: c.qty, note: c.note }));
    if (this._placing) return;   // đang gửi đơn → bỏ qua lần bấm thứ hai (tránh tạo 2 đơn)
    this._placing = true;
    let result;




    try {
      result = await Store.addOrder({
        info: { ...info, mode: this.schedule.mode, date: isoDate(this.schedule.date), time: this.schedule.time, payment },
        lines,
      });
    } catch (e) {
      return this.toast(e.message);   // vd. món vừa ngừng bán, giờ nhận không hợp lệ
    } finally {
      this._placing = false;
    }





    const id = result.id;
    Store.rememberOrder(id, info.phone);
    
    // tải lại để đơn mới hiện ngay ở "My orders"
    await Store.sync(true);            
    this.cart.clear();
    // Có người khác đặt đơn trong lúc khách quét QR → mã đơn thật khác mã trên QR, nhắc khách ghi đúng nội dung chuyển khoản
    this.toast(payment === "bank" && id !== expectedId
      ? `Order #${id} placed — please use ${orderCode(id)} as the transfer note`
      : `Order #${id} placed successfully!`);
    this.navigate("dashboard");
  }


  // Hiển thị thông báo dạng hàm toast 
  toast(msg) {
    const t = document.getElementById("toast");
     t.textContent = msg; t.classList.add("show");
    clearTimeout(this._t);
     this._t = setTimeout(() => t.classList.remove("show"), 2200);
  }


}







// Khởi động ứng dụng khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => new App());




//testing git
