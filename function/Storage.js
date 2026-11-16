"use strict";

/* Lưu trữ giả lập bằng localStorage; các phần khác chỉ dùng Store.
   Có thể thay DB/Store để chuyển sang backend. */

const SEED_VERSION = "v3";   // Tăng phiên bản khi đổi dữ liệu mẫu.
const KEYS = {
  seeded: "rp_seeded", users: "rp_users", menu: "rp_menu", orders: "rp_orders",
  seq: "rp_order_seq", mine: "rp_my_orders", session: "rp_session",
};

// Thực đơn hiện tại, được Views sử dụng trực tiếp.
let MENU = [];         // Gồm cả món ngừng bán.
let CATEGORIES = [];   // Danh mục có món đang bán.

/* ---------- 1) DB ---------- */

// Dự phòng khi storage không khả dụng.
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
  // Storage chỉ nhận chuỗi nên dữ liệu được lưu dưới dạng JSON.
  static get(key, fallback = []) {
    try { const raw = LOCAL.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  static set(key, value) { LOCAL.setItem(key, JSON.stringify(value)); }
  static remove(key) { LOCAL.removeItem(key); }
  static getSession() { try { return JSON.parse(SESSION.getItem(KEYS.session)); } catch { return null; } }
  static setSession(value) { value ? SESSION.setItem(KEYS.session, JSON.stringify(value)) : SESSION.removeItem(KEYS.session); }
}

/* ---------- 2) Store ---------- */

class Store {
  /* --- Khởi tạo / đặt lại --- */

  // Nạp dữ liệu mẫu nếu chưa có hoặc sai phiên bản.
  static init() {
    if (DB.get(KEYS.seeded, null) !== SEED_VERSION) Store.seed();
  }
  static seed() {
    const orders = buildSeedOrders();
    DB.set(KEYS.users, SEED_USERS);
    DB.set(KEYS.menu, SEED_MENU.map(m => ({ available: true, ...m })));   // Mặc định món mẫu đang bán.
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

  /* --- Tài khoản & phiên --- */

  static users() { return DB.get(KEYS.users); }

  // Trả về user hoặc thông báo lỗi.
  static login(username, password) {
    const u = Store.users().find(x => x.username.toLowerCase() === String(username).trim().toLowerCase());
    if (!u || u.password !== password) return { error: "Incorrect username or password." };
    if (u.status !== "Active") return { error: "This account is locked. Please contact an administrator." };
    return { user: u };
  }
  static session() { return DB.getSession(); }
  static startSession(role, username = "") { DB.setSession({ role, username }); }
  static endSession() { DB.setSession(null); }
  // Kiểm tra tài khoản Staff/Admin còn hoạt động và đúng vai trò.
  static sessionValid() {
    const s = Store.session();
    if (!s) return false;
    if (s.role === "Customer") return true;
    const u = Store.users().find(x => x.username === s.username);
    return !!u && u.status === "Active" && u.role === s.role;
  }

  // Trả thông báo lỗi hoặc chuỗi rỗng nếu thành công.
  static addUser(username, password) {
    const users = Store.users(), name = username.trim();
    if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) return "That username already exists.";
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

  /* --- Thực đơn --- */

  static loadMenu() {
    MENU = DB.get(KEYS.menu).map(raw => new MenuItem(raw));
    CATEGORIES = [...new Set(MENU.filter(m => m.available).map(m => m.category))];
  }
  static allCategories() { return [...new Set(MENU.map(m => m.category))]; }
  static isAvailable(id) { const m = MENU.find(x => x.id === id); return !!m && m.available; }

  // Thêm món mới hoặc cập nhật món hiện có.
  static saveMenuItem(data) {
    const list = DB.get(KEYS.menu);
    if (data.id) list.splice(list.findIndex(m => m.id === data.id), 1, data);
    else list.push({ ...data, id: Math.max(0, ...list.map(m => m.id)) + 1 });
    DB.set(KEYS.menu, list);
    Store.loadMenu();
  }
  // Ẩn món để giữ tham chiếu trong đơn cũ.
  static toggleAvailable(id) {
    const list = DB.get(KEYS.menu), m = list.find(x => x.id === id);
    if (!m) return;
    m.available = m.available === false;   // Đảo trạng thái kinh doanh.
    DB.set(KEYS.menu, list);
    Store.loadMenu();
  }

  /* --- Đơn hàng --- */

  static orders() { return DB.get(KEYS.orders).map(o => Order.fromJSON(o)); }
  static nextOrderId() { return DB.get(KEYS.seq, 1001); }

  static addOrder(order) {
    const list = DB.get(KEYS.orders);
    list.unshift(order);
    DB.set(KEYS.orders, list);
    DB.set(KEYS.seq, order.id + 1);
  }

  // Đổi trạng thái nếu bước tiếp theo hợp lệ.
  static setStatus(id, status, reason = "") {
    const list = DB.get(KEYS.orders), raw = list.find(o => o.id === id);
    if (!raw || !Order.fromJSON(raw).nextSteps.some(([s]) => s === status)) return false;
    raw.status = status;
    if (status === "Rejected") raw.rejectReason = reason;   // Lưu lý do từ chối.
    if (status === "Completed" && raw.payment === "cash") raw.paid = true;   // Thu tiền mặt khi hoàn tất.
    DB.set(KEYS.orders, list);
    return true;
  }
  static markPaid(id) {
    const list = DB.get(KEYS.orders), raw = list.find(o => o.id === id);
    if (!raw) return;
    raw.paid = true;
    DB.set(KEYS.orders, list);
  }
  // Dùng phát hiện thay đổi dữ liệu đơn.
  static ordersSignature() { return JSON.stringify(DB.get(KEYS.orders)); }

  /* --- Lịch sử đơn khách --- */

  static rememberOrder(id) {
    const ids = DB.get(KEYS.mine);
    if (!ids.includes(id)) DB.set(KEYS.mine, [...ids, id]);
  }
  static myOrders() {
    const ids = new Set(DB.get(KEYS.mine));
    return Store.orders().filter(o => ids.has(o.id));
  }
  // Tra cứu theo mã đơn và số điện thoại.
  static findOrder(code, phone) {
    const digits = s => String(s).replace(/\D/g, ""), id = Number(digits(code));
    return Store.orders().find(o => o.id === id && digits(o.phone) === digits(phone) && digits(phone) !== "") || null;
  }

  /* --- Thống kê Admin --- */

  // Thống kê đơn trong ngày, không tính đơn bị từ chối.
  // revenue: đã thu; expected: tổng giá trị; dishes: món bán chạy.
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
