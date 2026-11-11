"use strict";

/* =====================================================================
   LỚP LƯU TRỮ — mô phỏng cơ sở dữ liệu bằng localStorage

   Nguyên tắc: CHỈ class DB trong file này được gọi localStorage / sessionStorage.
   Phần còn lại của project (Views, Modals, App) chỉ gọi class Store.
   Sau này muốn đổi sang backend thật → chỉ cần viết lại DB / Store.

   "Bảng" (mục 6 đặc tả)           Key trong localStorage
   -----------------------------   ----------------------
   Users                            rp_users
   Categories + MenuItems           rp_menu   (danh mục là thuộc tính category của món)
   Orders + OrderItems              rp_orders (mỗi đơn chứa mảng lines = OrderItems)
   Bộ đếm mã đơn                    rp_order_seq
   Mã các đơn đặt trên máy này      rp_my_orders
   Cờ đã nạp dữ liệu mẫu            rp_seeded
   Phiên đăng nhập (sessionStorage) rp_session
   ===================================================================== */

const SEED_VERSION = "v1";   // đổi "v1" → "v2" khi bạn sửa cấu trúc dữ liệu → lần mở sau sẽ nạp lại dữ liệu mẫu
const KEYS = {
  seeded: "rp_seeded", users: "rp_users", menu: "rp_menu", orders: "rp_orders",
  seq: "rp_order_seq", mine: "rp_my_orders", session: "rp_session",
};

// Thực đơn đang chạy (đọc từ localStorage bởi Store.loadMenu). Views dùng trực tiếp hai biến này.
let MENU = [];         // tất cả món (kể cả món ngừng bán, để Admin quản lý)
let CATEGORIES = [];   // danh mục có ít nhất 1 món đang bán (hiển thị cho khách)

/* ---------- 1) Tầng thấp: DB ---------- */

// Dự phòng khi trình duyệt chặn storage (chế độ riêng tư, v.v.): dữ liệu chỉ sống trong bộ nhớ của tab
class MemoryStorage {
  #d = {};
  getItem(k) { return k in this.#d ? this.#d[k] : null; }
  setItem(k, v) { this.#d[k] = String(v); }
  removeItem(k) { delete this.#d[k]; }
}
function pickStorage(name) {
  try { const s = window[name]; s.setItem("__rp_test", "1"); s.removeItem("__rp_test"); return s; }
  catch { return new MemoryStorage(); }
}
const LOCAL = pickStorage("localStorage");
const SESSION = pickStorage("sessionStorage");

class DB {
  // localStorage chỉ lưu chuỗi → luôn JSON.stringify khi ghi và JSON.parse khi đọc
  static get(key, fallback = []) {
    try { const raw = LOCAL.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  static set(key, value) { LOCAL.setItem(key, JSON.stringify(value)); }
  static remove(key) { LOCAL.removeItem(key); }
  static getSession() { try { return JSON.parse(SESSION.getItem(KEYS.session)); } catch { return null; } }
  static setSession(value) { value ? SESSION.setItem(KEYS.session, JSON.stringify(value)) : SESSION.removeItem(KEYS.session); }
}

/* ---------- 2) Tầng nghiệp vụ: Store ---------- */

class Store {
  /* --- khởi tạo / reset --- */

  // Gọi một lần khi mở web: nếu chưa có dữ liệu thì nạp từ các file mẫu (Data.js, Users.js, Orders.js)
  static init() {
    if (DB.get(KEYS.seeded, null) !== SEED_VERSION) Store.seed();
  }
  static seed() {
    const orders = buildSeedOrders();
    DB.set(KEYS.users, SEED_USERS);
    DB.set(KEYS.menu, SEED_MENU.map(m => ({ available: true, ...m })));   // món mẫu chưa khai báo available → mặc định đang bán
    DB.set(KEYS.orders, orders);
    DB.set(KEYS.seq, Math.max(1000, ...orders.map(o => o.id)) + 1);
    DB.set(KEYS.mine, []);
    DB.set(KEYS.seeded, SEED_VERSION);
  }
  static reset() {
    Object.values(KEYS).forEach(k => DB.remove(k));
    DB.setSession(null);
    Store.seed();
  }

  /* --- tài khoản & phiên đăng nhập --- */

  static users() { return DB.get(KEYS.users); }

  // Trả về { user } nếu đúng, hoặc { error } nếu sai / bị khóa
  static login(username, password) {
    const u = Store.users().find(x => x.username.toLowerCase() === String(username).trim().toLowerCase());
    if (!u || u.password !== password) return { error: "Sai tên đăng nhập hoặc mật khẩu." };
    if (u.status !== "Active") return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." };
    return { user: u };
  }
  static session() { return DB.getSession(); }
  static startSession(role, username = "") { DB.setSession({ role, username }); }
  static endSession() { DB.setSession(null); }
  // Phiên Staff/Admin chỉ hợp lệ khi tài khoản còn tồn tại, còn Active và đúng vai trò
  // (Admin khóa tài khoản đang đăng nhập → phiên đó mất hiệu lực ở lần kiểm tra kế tiếp)
  static sessionValid() {
    const s = Store.session();
    if (!s) return false;
    if (s.role === "Customer") return true;
    const u = Store.users().find(x => x.username === s.username);
    return !!u && u.status === "Active" && u.role === s.role;
  }

  // Trả về chuỗi lỗi, hoặc "" nếu thành công
  static addUser(username, password) {
    const users = Store.users(), name = username.trim();
    if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) return "Tên đăng nhập đã tồn tại.";
    users.push({ user_id: Math.max(0, ...users.map(u => u.user_id)) + 1, username: name, password, role: "Staff", status: "Active" });
    DB.set(KEYS.users, users);
    return "";
  }
  static updateUser(userId, patch) {
    const users = Store.users(), u = users.find(x => x.user_id === userId);
    if (!u) return;
    Object.assign(u, patch);
    DB.set(KEYS.users, users);
  }

  /* --- thực đơn --- */

  static loadMenu() {
    MENU = DB.get(KEYS.menu).map(raw => new MenuItem(raw));
    CATEGORIES = [...new Set(MENU.filter(m => m.available).map(m => m.category))];
  }
  static allCategories() { return [...new Set(MENU.map(m => m.category))]; }
  static isAvailable(id) { const m = MENU.find(x => x.id === id); return !!m && m.available; }

  // Thêm món mới (không có id) hoặc cập nhật món (có id)
  static saveMenuItem(data) {
    const list = DB.get(KEYS.menu);
    if (data.id) list.splice(list.findIndex(m => m.id === data.id), 1, data);
    else list.push({ ...data, id: Math.max(0, ...list.map(m => m.id)) + 1 });
    DB.set(KEYS.menu, list);
    Store.loadMenu();
  }
  // "Ngừng kinh doanh" = ẩn món chứ không xóa, để các đơn cũ vẫn tham chiếu được
  static toggleAvailable(id) {
    const list = DB.get(KEYS.menu), m = list.find(x => x.id === id);
    if (!m) return;
    m.available = m.available === false;   // chỉ false mới → true; undefined/true → false
    DB.set(KEYS.menu, list);
    Store.loadMenu();
  }

  /* --- đơn hàng --- */

  static orders() { return DB.get(KEYS.orders).map(o => Order.fromJSON(o)); }
  static nextOrderId() { return DB.get(KEYS.seq, 1001); }

  static addOrder(order) {
    const list = DB.get(KEYS.orders);
    list.unshift(order);
    DB.set(KEYS.orders, list);
    DB.set(KEYS.seq, order.id + 1);
  }

  // Đổi trạng thái đơn. Trả về false nếu bước đó không còn hợp lệ (ví dụ nhân viên khác vừa cập nhật trước)
  static setStatus(id, status) {
    const list = DB.get(KEYS.orders), raw = list.find(o => o.id === id);
    if (!raw || !Order.fromJSON(raw).nextSteps.some(([s]) => s === status)) return false;
    raw.status = status;
    if (status === "Completed" && raw.payment === "cash") raw.paid = true;   // tiền mặt: thu khi giao/nhận hàng
    DB.set(KEYS.orders, list);
    return true;
  }
  static markPaid(id) {
    const list = DB.get(KEYS.orders), raw = list.find(o => o.id === id);
    if (!raw) return;
    raw.paid = true;
    DB.set(KEYS.orders, list);
  }
  // Chuỗi đại diện cho toàn bộ đơn: nếu đổi nghĩa là có dữ liệu mới (dùng để biết khi nào cần vẽ lại)
  static ordersSignature() { return JSON.stringify(DB.get(KEYS.orders)); }

  /* --- lịch sử đơn của khách (khách không có tài khoản) --- */

  static rememberOrder(id) {
    const ids = DB.get(KEYS.mine);
    if (!ids.includes(id)) DB.set(KEYS.mine, [...ids, id]);
  }
  static myOrders() {
    const ids = new Set(DB.get(KEYS.mine));
    return Store.orders().filter(o => ids.has(o.id));
  }
  // Tra cứu bằng mã đơn ("1001" hoặc "RP1001") + số điện thoại đã dùng khi đặt
  static findOrder(code, phone) {
    const digits = s => String(s).replace(/\D/g, ""), id = Number(digits(code));
    return Store.orders().find(o => o.id === id && digits(o.phone) === digits(phone) && digits(phone) !== "") || null;
  }

  /* --- thống kê cho Admin --- */

  // Thống kê các đơn TẠO TRONG NGÀY (trừ đơn bị từ chối)
  //  - revenue: doanh thu đã thu (đơn đã thanh toán)   - expected: tổng giá trị các đơn kể cả chưa thu tiền
  //  - dishes: số lượng từng món (theo size) đã đặt trong ngày, giảm dần
  static stats(day = isoDate(new Date())) {
    const today = Store.orders().filter(o => isoDate(new Date(o.createdAt)) === day && o.status !== "Rejected");
    const dishes = new Map();
    today.forEach(o => o.lines.forEach(l => {
      const key = `${l.name}|${l.size}`, cur = dishes.get(key) || { name: l.name, size: l.size, qty: 0 };
      cur.qty += l.qty; dishes.set(key, cur);
    }));
    return {
      count: today.length,
      revenue: today.filter(o => o.paid).reduce((s, o) => s + o.total, 0),
      expected: today.reduce((s, o) => s + o.total, 0),
      dishes: [...dishes.values()].sort((a, b) => b.qty - a.qty),
    };
  }
}
