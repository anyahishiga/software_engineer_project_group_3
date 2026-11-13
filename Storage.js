"use strict";

/* Lưu trữ qua backend (server/server.js → SQL Server).
   Các phần khác vẫn chỉ dùng Store như trước; Store giữ một bản sao dữ liệu (cache)
   để đọc đồng bộ, và đồng bộ lại với server mỗi lần App.tick() chạy. */

const API_BASE = "/api";
const KEYS = { mine: "rp_my_orders", session: "rp_session" };

// Thực đơn hiện tại, được Views sử dụng trực tiếp.
let MENU = [];         // Gồm cả món ngừng bán.
let CATEGORIES = [];   // Danh mục có món đang bán.

/* ---------- 1) Lưu trên trình duyệt: phiên đăng nhập và danh sách đơn của khách ---------- */

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
  static get(key, fallback = []) {
    try { const raw = LOCAL.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  static set(key, value) { LOCAL.setItem(key, JSON.stringify(value)); }
  static remove(key) { LOCAL.removeItem(key); }
  static getSession() { try { return JSON.parse(SESSION.getItem(KEYS.session)); } catch { return null; } }
  static setSession(value) { value ? SESSION.setItem(KEYS.session, JSON.stringify(value)) : SESSION.removeItem(KEYS.session); }
}

/* ---------- 2) Gọi API ---------- */

class Api {
  static async request(method, path, body) {
    const res = await fetch(API_BASE + path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    return data;
  }
  static get(path) { return Api.request("GET", path); }
  static post(path, body) { return Api.request("POST", path, body); }
  static put(path, body) { return Api.request("PUT", path, body); }
  static patch(path, body = {}) { return Api.request("PATCH", path, body); }
}

/* ---------- 3) Store ---------- */

class Store {
  static #cache = { users: [], menu: [], orders: [], nextId: 1001 };
  static #menuSig = "";

  // App gán hàm này để hiện thông báo khi server báo lỗi.
  static onError = msg => console.error(msg);

  /* --- Khởi tạo / đồng bộ --- */

  static async init() { await Store.refresh(); }

  // Tải lại toàn bộ dữ liệu từ server. Trả về { menuChanged } để App biết có cần vẽ lại thực đơn.
  static async refresh() {
    const [menu, users, orders, next] = await Promise.all([
      Api.get("/menu"), Api.get("/users"), Api.get("/orders"), Api.get("/orders/next-id"),
    ]);
    Object.assign(Store.#cache, { menu, users, orders, nextId: next.id });
    const sig = JSON.stringify(menu), menuChanged = sig !== Store.#menuSig;
    if (menuChanged) { Store.#menuSig = sig; Store.loadMenu(); }
    return { menuChanged };
  }

  // Ghi lên server; nếu lỗi thì báo và tải lại dữ liệu thật từ server.
  static #write(promise) {
    return promise
      .then(() => Store.refresh())
      .catch(err => { Store.onError(err.message); return Store.refresh().catch(() => {}); });
  }

  static reset() {
    Object.values(KEYS).forEach(k => DB.remove(k));
    DB.setSession(null);
  }

  /* --- Tài khoản & phiên --- */

  static users() { return Store.#cache.users; }

  // Trả về { user } hoặc { error }.
  static async login(username, password) {
    try { return await Api.post("/login", { username, password }); }
    catch (err) { return { error: err.message }; }
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
    users.push({ user_id: Math.max(0, ...users.map(u => u.user_id)) + 1, username: name, role: "Staff", status: "Active" });
    Store.#write(Api.post("/users", { username: name, password }));
    return "";
  }
  static updateUser(userId, patch) {
    const u = Store.users().find(x => x.user_id === userId);
    if (!u) return;
    if (patch.status) u.status = patch.status;
    Store.#write(Api.patch(`/users/${userId}`, patch));
  }

  /* --- Thực đơn --- */

  static loadMenu() {
    MENU = Store.#cache.menu.map(raw => new MenuItem(raw));
    CATEGORIES = [...new Set(MENU.filter(m => m.available).map(m => m.category))];
  }
  static allCategories() { return [...new Set(MENU.map(m => m.category))]; }
  static isAvailable(id) { const m = MENU.find(x => x.id === id); return !!m && m.available; }

  // Thêm món mới hoặc cập nhật món hiện có.
  static saveMenuItem(data) {
    const list = Store.#cache.menu;
    if (data.id) list.splice(list.findIndex(m => m.id === data.id), 1, data);
    else list.push({ ...data, id: Math.max(0, ...list.map(m => m.id)) + 1 });
    Store.loadMenu();
    Store.#write(data.id ? Api.put(`/menu/${data.id}`, data) : Api.post("/menu", data));
  }
  // Ẩn món để giữ tham chiếu trong đơn cũ.
  static toggleAvailable(id) {
    const m = Store.#cache.menu.find(x => x.id === id);
    if (!m) return;
    m.available = m.available === false;
    Store.loadMenu();
    Store.#write(Api.patch(`/menu/${id}/toggle`));
  }

  /* --- Đơn hàng --- */

  static orders() { return Store.#cache.orders.map(o => Order.fromJSON(o)); }
  static nextOrderId() { return Store.#cache.nextId; }

  // Gửi đơn lên server; trả về mã đơn do server cấp.
  static async addOrder(order) {
    const saved = await Api.post("/orders", order);
    await Store.refresh().catch(() => {});
    return saved.id;
  }

  // Đổi trạng thái nếu bước tiếp theo hợp lệ.
  static setStatus(id, status, reason = "") {
    const raw = Store.#cache.orders.find(o => o.id === id);
    if (!raw || !Order.fromJSON(raw).nextSteps.some(([s]) => s === status)) return false;
    raw.status = status;
    if (status === "Rejected") raw.rejectReason = reason;
    if (status === "Completed" && raw.payment === "cash") raw.paid = true;
    Store.#write(Api.patch(`/orders/${id}/status`, { status, reason }));
    return true;
  }
  static markPaid(id) {
    const raw = Store.#cache.orders.find(o => o.id === id);
    if (!raw) return;
    raw.paid = true;
    Store.#write(Api.patch(`/orders/${id}/paid`));
  }
  // Dùng phát hiện thay đổi dữ liệu đơn.
  static ordersSignature() { return JSON.stringify(Store.#cache.orders); }

  /* --- Lịch sử đơn khách (lưu trên trình duyệt của khách) --- */

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
