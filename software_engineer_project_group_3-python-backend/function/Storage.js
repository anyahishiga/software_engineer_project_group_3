"use strict";

// Chu kỳ tự làm mới dữ liệu: 5000 ms = 5 giây.
// Dùng để hỏi lại server xem có thay đổi gì không (đơn mới, đổi trạng thái, đổi thực đơn...).
const POLL_MS = 5000;

// [API] Địa chỉ gốc của server. Chạy bằng Docker: nginx chuyển tiếp "/api/" sang server Python (xem docker/nginx.conf).
// Chạy "python -m backend.app" thì server Python cũng phục vụ luôn giao diện nên giữ nguyên "/api".
const API_BASE = "/api";



// [API] Dữ liệu (tài khoản, thực đơn, đơn hàng) giờ nằm trong MySQL. Trình duyệt chỉ còn lưu 2 thứ:
//   session: phiên đăng nhập (sessionStorage, mất khi đóng tab)
//   mine   : mã đơn + số điện thoại của các đơn khách đã đặt trên thiết bị này (localStorage)
const KEYS = {
  mine: "rp_my_orders", session: "rp_session",
};




// Thực đơn hiện tại, được Views sử dụng trực tiếp.
let MENU = [];         // Gồm cả món ngừng bán.
let CATEGORIES = [];   // Danh mục có món đang bán.



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



// [API] Lỗi khi gọi server. message là câu hiển thị thẳng cho người dùng (server trả về trong trường "error").
class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

// [API] Gọi server và trả về dữ liệu JSON. Nhân viên / Admin đã đăng nhập thì tự gửi kèm token.
async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = DB.getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("Cannot reach the server. Please try again.");
  }

  let data = null;
  try { data = await res.json(); } catch { /* server không trả JSON */ }

  if (!res.ok) {
    if (res.status === 401 && token) Store.markSessionExpired();   // token hết hạn, hoặc tài khoản vừa bị khoá
    throw new ApiError(data?.error || `Server error (${res.status})`, res.status);
  }
  return data;
}




// [API] Store giữ nguyên các hàm cũ để Views / Modals / App ít phải sửa.
//   - Hàm ĐỌC (orders, users, myOrders, stats...) vẫn chạy ngay, lấy từ bộ nhớ tạm (cache) trong trang.
//   - Cache được nạp từ server bởi Store.sync() — gọi lúc khởi động, sau mỗi thao tác ghi và mỗi POLL_MS.
//   - Hàm GHI (login, addOrder, setStatus...) đổi thành async, gọi server rồi nạp lại cache.
class Store {

  // Cache dữ liệu lấy từ server.
  static #rawMenu = "";           // JSON thực đơn lần trước, để biết thực đơn có đổi không
  static #nextId = 1001;
  static #orders = [];            // tất cả đơn — chỉ nhân viên / Admin mới tải được
  static #mine = [];              // đơn của khách trên thiết bị này
  static #users = [];             // danh sách tài khoản — chỉ Admin
  static #stats = { count: 0, revenue: 0, expected: 0, dishes: [] };
  static #sessionOk = true;       // false khi server báo token hết hạn / tài khoản bị khoá
  static #syncing = null;         // lần sync đang chạy (tránh gọi chồng nhau)
  static menuChanged = false;     // lần sync gần nhất có thấy thực đơn thay đổi không


  // Khởi động: nạp dữ liệu từ server. Trả về true nếu kết nối được.
  static init() { return Store.sync(); }

  // [API] Nạp lại toàn bộ dữ liệu cần dùng từ server. Trả về false nếu không kết nối được server.
  // fresh = true (dùng sau khi vừa ghi dữ liệu): nếu đang có một lần sync chạy dở thì chờ nó xong rồi sync lại,
  // vì lần chạy dở có thể đã đọc dữ liệu TRƯỚC khi thao tác ghi hoàn tất. Mặc định thì dùng chung lần đang chạy.
  static sync(fresh = false) {
    let p;
    if (!Store.#syncing) p = Store.#doSync();
    else if (!fresh) return Store.#syncing;
    else p = Store.#syncing.then(() => Store.#doSync());
    Store.#syncing = p;
    p.finally(() => { if (Store.#syncing === p) Store.#syncing = null; });
    return p;
  }

  static async #doSync() {
    try {
      // Dữ liệu công khai: thực đơn + mã đơn kế tiếp
      const [menu, next] = await Promise.all([api("/menu"), api("/orders/next-id")]);
      const raw = JSON.stringify(menu);
      Store.menuChanged = raw !== Store.#rawMenu;
      if (Store.menuChanged) { Store.#rawMenu = raw; Store.loadMenu(menu); }
      Store.#nextId = next.id;

      // Đơn khách đã đặt / tra cứu trên thiết bị này (server kiểm tra mã đơn + số điện thoại)
      const refs = DB.get(KEYS.mine).filter(r => r && typeof r === "object");
      Store.#mine = refs.length ? (await api("/orders/mine", { method: "POST", body: { orders: refs } })).orders : [];

      // Dữ liệu riêng của nhân viên / Admin
      const s = Store.session();
      if (s && s.role !== "Customer" && Store.#sessionOk) {
        try {
          Store.#orders = (await api("/orders")).orders;
          if (s.role === "Admin") {
            Store.#users = (await api("/users")).users;
            Store.#stats = await api(`/stats?day=${isoDate(new Date())}`);
          }
        } catch (e) {
          if (e.status !== 401) throw e;   // 401 đã được api() ghi nhận vào sessionOk
        }
      }
      return true;
    } catch {
      return false;   // không kết nối được server: giữ nguyên cache cũ
    }
  }

  // [API] Server báo phiên không còn hợp lệ → sessionValid() sẽ trả false ở lần vẽ lại kế tiếp.
  static markSessionExpired() { Store.#sessionOk = false; }

  // Xoá dữ liệu riêng của nhân viên khỏi bộ nhớ (khi đăng xuất).
  static clearPrivate() {
    Store.#orders = []; Store.#users = [];
    Store.#stats = { count: 0, revenue: 0, expected: 0, dishes: [] };
    Store.#sessionOk = true;
  }

  // Xoá dữ liệu lưu trên thiết bị này (đơn đã nhớ + phiên). Dữ liệu thật nằm trong MySQL nên không bị xoá.
  static reset() {
    Object.values(KEYS).forEach(k => DB.remove(k));
    DB.setSession(null);
    Store.clearPrivate();
  }


  // Danh sách tài khoản (chỉ Admin tải được).
  static users() { return Store.#users; }

  // [API] Gửi tên đăng nhập + mật khẩu lên server. Trả về { user } (kèm token) hoặc { error }.
  static async login(username, password) {
    try {
      const { user } = await api("/login", { method: "POST", body: { username, password } });
      return { user };
    } catch (e) {
      return { error: e.message };
    }
  }





  static session() { return DB.getSession(); }
  // [API] token do server cấp khi đăng nhập, được gửi kèm mỗi lần gọi API của nhân viên.
  static startSession(role, username = "", token = "") { Store.#sessionOk = true; DB.setSession({ role, username, token }); }
  static endSession() { DB.setSession(null); Store.clearPrivate(); }


  // Kiểm tra tài khoản Staff/Admin còn hoạt động và đúng vai trò.
  // [API] Việc kiểm tra do server làm (mỗi request đều kiểm tra lại trong database), ở đây chỉ đọc kết quả.
  static sessionValid() {
    const s = Store.session();
    if (!s) return false;
    if (s.role === "Customer") return true;
    return Store.#sessionOk;
  }

  // Ném lỗi (ApiError) nếu thất bại, thành công thì tự nạp lại dữ liệu.
  static async addUser(username, password) {
    await api("/users", { method: "POST", body: { username, password } });
    await Store.sync(true);
  }


  static async updateUser(userId, patch) {
    await api(`/users/${userId}`, { method: "PATCH", body: patch });
    await Store.sync(true);
  }


  // THỰC ĐƠN
  // [API] data = danh sách món lấy từ server; không truyền thì dựng lại từ lần tải gần nhất.
  static loadMenu(data = JSON.parse(Store.#rawMenu || "[]")) {
    MENU = data.map(raw => new MenuItem(raw));
    CATEGORIES = [...new Set(MENU.filter(m => m.available).map(m => m.category))];
  }

  static allCategories() { return [...new Set(MENU.map(m => m.category))]; }
  static isAvailable(id) { const m = MENU.find(x => x.id === id); return !!m && m.available; }

  // Thêm món mới hoặc cập nhật món hiện có. Ném lỗi (ApiError) nếu server từ chối.
  static async saveMenuItem(data) {
    await api("/menu", { method: "POST", body: data });
    await Store.sync(true);
  }
  // Ẩn món để giữ tham chiếu trong đơn cũ.
  static async toggleAvailable(id) {
    await api(`/menu/${id}/toggle`, { method: "POST" });
    await Store.sync(true);
  }

  // Đơn hàng
  static orders() { return Store.#orders.map(o => Order.fromJSON(o)); }
  static nextOrderId() { return Store.#nextId; }

  // [API] payload = { info, lines } theo OrderRepository.create. Giá và tên món do server lấy từ database.
  // Trả về { id, subtotal, tax, total }; ném lỗi (ApiError) nếu server từ chối.
  static async addOrder(payload) {
    const result = await api("/orders", { method: "POST", body: payload });
    await Store.sync(true);
    return result;
  }

  // Đổi trạng thái nếu bước tiếp theo hợp lệ.
  // [API] Trả về true nếu được, false nếu đơn vừa bị người khác đổi (giữ nguyên cách dùng cũ).
  static async setStatus(id, status, reason = "") {
    try {
      await api(`/orders/${id}/status`, { method: "POST", body: { status, reason } });
      await Store.sync(true);
      return true;
    } catch (e) {
      await Store.sync(true);
      if (e.status === 400 && !/reason/i.test(e.message)) return false;
      throw e;
    }
  }



  static async markPaid(id) {
    await api(`/orders/${id}/paid`, { method: "POST" });
    await Store.sync(true);
  }
  // Dùng phát hiện thay đổi dữ liệu đơn.
  // [API] Nhân viên: theo tất cả đơn. Khách: theo các đơn của mình.
  static ordersSignature() {
    const s = Store.session();
    return JSON.stringify(s && s.role !== "Customer" ? Store.#orders : Store.#mine);
  }

  // Lịch sử đơn khách

  // [API] Nhớ cả số điện thoại để server xác nhận đúng chủ đơn khi tải lại.
  static rememberOrder(id, phone) {
    const refs = DB.get(KEYS.mine).filter(r => r && typeof r === "object");
    if (!refs.some(r => r.id === id)) DB.set(KEYS.mine, [...refs, { id, phone }]);
  }
  static myOrders() { return Store.#mine.map(o => Order.fromJSON(o)); }



  // Tra cứu theo mã đơn và số điện thoại.
  // [API] Do server tra cứu. Trả về Order, hoặc null nếu không thấy.
  static async findOrder(code, phone) {
    const { order } = await api("/orders/lookup", { method: "POST", body: { code, phone } });
    return order ? Order.fromJSON(order) : null;
  }


  // Thống kê đơn trong ngày của admin, không tính đơn bị từ chối.
  // [API] Do server tính bằng 2 view trong MySQL (v_daily_revenue, v_daily_dish_stats), chỉ có số liệu của hôm nay.
  static stats() { return Store.#stats; }
}
