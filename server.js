"use strict";

const path = require("path");
const express = require("express");
const sql = require("mssql");
const bcrypt = require("bcryptjs");

const PORT = Number(process.env.PORT) || 3000;
const TAX_RATE = 0.1;

const dbConfig = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || "restaurant_db",
  user: process.env.DB_USER || "restaurant_app",
  password: process.env.DB_PASSWORD || "Restaurant@123",
  options: { encrypt: false, trustServerCertificate: true },
};

const SEED_USERS = [
  { username: "admin", password: "admin123", role: "Admin" },
  { username: "staff1", password: "staff123", role: "Staff" },
];

const ORDER_FLOW = {
  Pending: () => ["Confirmed", "Rejected"],
  Confirmed: () => ["Cooking"],
  Cooking: () => ["Ready"],
  Ready: mode => (mode === "delivery" ? ["Delivering"] : ["Completed"]),
  Delivering: () => ["Completed"],
};

let pool;

function request(tx) {
  return new sql.Request(tx || pool);
}

function bind(req, params = {}) {
  for (const [name, [type, value]] of Object.entries(params)) req.input(name, type, value);
  return req;
}

async function query(text, params, tx) {
  const result = await bind(request(tx), params).query(text);
  return result.recordset || [];
}

async function inTransaction(work) {
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const handle = fn => (req, res) =>
  fn(req, res).catch(err => {
    if (!(err instanceof HttpError)) console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  });

const money = n => Math.round(Number(n) * 100) / 100;

/* ---------------- Menu ---------------- */

async function loadMenu() {
  const items = await query(`
    SELECT mi.id, mi.name, mi.description, mi.image_url, mi.available, c.name AS category
    FROM menu_items mi JOIN categories c ON c.id = mi.category_id
    ORDER BY mi.id`);
  const sizes = await query(`SELECT item_id, label, price FROM menu_item_sizes ORDER BY item_id, sort_order, id`);
  return items.map(m => ({
    id: m.id,
    name: m.name,
    desc: m.description,
    img: m.image_url,
    category: m.category,
    available: !!m.available,
    sizes: sizes.filter(s => s.item_id === m.id).map(s => ({ label: s.label, price: Number(s.price) })),
  }));
}

function validateMenuItem(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const sizes = Array.isArray(body.sizes) ? body.sizes : [];
  if (!name || !category) throw new HttpError(400, "Please enter a name and a category.");
  if (!sizes.length) throw new HttpError(400, "At least one size with a price is required.");
  for (const s of sizes) {
    if (!String(s.label || "").trim() || !Number.isFinite(Number(s.price)) || Number(s.price) < 0)
      throw new HttpError(400, "Invalid size or price.");
  }
  return {
    name, category, sizes,
    desc: String(body.desc || ""),
    img: String(body.img || ""),
    available: body.available !== false,
  };
}

async function categoryId(name, tx) {
  const found = await query(`SELECT id FROM categories WHERE name = @name`, { name: [sql.NVarChar(100), name] }, tx);
  if (found.length) return found[0].id;
  const created = await query(`INSERT INTO categories (name) OUTPUT INSERTED.id VALUES (@name)`,
    { name: [sql.NVarChar(100), name] }, tx);
  return created[0].id;
}

async function saveSizes(itemId, sizes, tx) {
  await query(`DELETE FROM menu_item_sizes WHERE item_id = @id`, { id: [sql.Int, itemId] }, tx);
  for (const [i, s] of sizes.entries()) {
    await query(`INSERT INTO menu_item_sizes (item_id, label, price, sort_order) VALUES (@id, @label, @price, @ord)`, {
      id: [sql.Int, itemId],
      label: [sql.NVarChar(50), String(s.label).trim()],
      price: [sql.Decimal(12, 2), Number(s.price)],
      ord: [sql.Int, i],
    }, tx);
  }
}

function menuParams(m, catId) {
  return {
    cat: [sql.Int, catId],
    name: [sql.NVarChar(100), m.name],
    desc: [sql.NVarChar(500), m.desc],
    img: [sql.NVarChar(255), m.img],
    avail: [sql.Bit, m.available ? 1 : 0],
  };
}

/* ---------------- Orders ---------------- */

async function loadOrders() {
  const orders = await query(`
    SELECT id, customer_name, email, phone, address, mode,
           CONVERT(char(10), sched_date, 23)  AS date,
           CONVERT(char(10), sched_date, 104) AS date_label,
           sched_time, total, payment, paid, status, reject_reason, created_at
    FROM orders ORDER BY created_at DESC, id DESC`);
  const lines = await query(`
    SELECT order_id, item_id, item_name, image_url, size_label, qty, unit_price, line_total, note
    FROM order_items ORDER BY id`);
  const byOrder = new Map();
  for (const l of lines) {
    if (!byOrder.has(l.order_id)) byOrder.set(l.order_id, []);
    byOrder.get(l.order_id).push({
      itemId: l.item_id,
      name: l.item_name,
      img: l.image_url,
      size: l.size_label,
      qty: l.qty,
      unitPrice: Number(l.unit_price),
      note: l.note,
      total: Number(l.line_total),
    });
  }
  return orders.map(o => ({
    id: o.id,
    lines: byOrder.get(o.id) || [],
    total: Number(o.total),
    customer: o.customer_name,
    payment: o.payment,
    mode: o.mode,
    when: `${o.date_label} ${o.sched_time}`,
    date: o.date,
    time: o.sched_time,
    phone: o.phone,
    email: o.email,
    address: o.address,
    status: o.status,
    paid: !!o.paid,
    rejectReason: o.reject_reason || "",
    createdAt: new Date(o.created_at).toISOString(),
  }));
}

async function nextOrderId(tx) {
  const rows = await query(`SELECT ISNULL(MAX(id), 1000) + 1 AS id FROM orders WITH (UPDLOCK, HOLDLOCK)`, {}, tx);
  return rows[0].id;
}

function validateOrder(body) {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const name = String(body.customer || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const mode = body.mode;
  const payment = body.payment;
  const date = String(body.date || "");
  const time = String(body.time || "");
  if (!lines.length) throw new HttpError(400, "Your cart is empty");
  if (!name || !email || !phone) throw new HttpError(400, "Please fill in the required fields");
  if (!["pickup", "delivery"].includes(mode)) throw new HttpError(400, "Invalid order type");
  if (!["bank", "cash"].includes(payment)) throw new HttpError(400, "Invalid payment method");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Invalid date");
  if (time !== "ASAP" && !(/^\d{2}:\d{2}$/.test(time) && time >= "10:00" && time <= "21:30"))
    throw new HttpError(400, "Pickup time must be between 10:00 and 21:30");
  for (const l of lines) {
    if (!Number.isInteger(Number(l.itemId)) || !(Number(l.qty) > 0)) throw new HttpError(400, "Invalid item in cart");
  }
  return { lines, name, email, phone, mode, payment, date, time, address: String(body.address || "") };
}

/* ---------------- Users ---------------- */

const publicUser = u => ({ user_id: u.user_id, username: u.username, role: u.role, status: u.status });

async function seedUsers() {
  const rows = await query(`SELECT COUNT(*) AS n FROM users`);
  if (rows[0].n > 0) return;
  for (const u of SEED_USERS) {
    await query(`INSERT INTO users (username, password_hash, role) VALUES (@u, @p, @r)`, {
      u: [sql.VarChar(50), u.username],
      p: [sql.VarChar(255), await bcrypt.hash(u.password, 10)],
      r: [sql.VarChar(20), u.role],
    });
  }
  console.log("Created default accounts: admin/admin123, staff1/staff123");
}

/* ---------------- App ---------------- */

const app = express();
app.use(express.json());

const api = express.Router();

api.get("/menu", handle(async (req, res) => res.json(await loadMenu())));

api.post("/menu", handle(async (req, res) => {
  const m = validateMenuItem(req.body);
  const id = await inTransaction(async tx => {
    const rows = await query(`
      INSERT INTO menu_items (category_id, name, description, image_url, available)
      OUTPUT INSERTED.id VALUES (@cat, @name, @desc, @img, @avail)`, menuParams(m, await categoryId(m.category, tx)), tx);
    await saveSizes(rows[0].id, m.sizes, tx);
    return rows[0].id;
  });
  res.status(201).json({ id });
}));

api.put("/menu/:id", handle(async (req, res) => {
  const id = Number(req.params.id);
  const m = validateMenuItem(req.body);
  await inTransaction(async tx => {
    const rows = await query(`
      UPDATE menu_items SET category_id = @cat, name = @name, description = @desc, image_url = @img, available = @avail
      OUTPUT INSERTED.id WHERE id = @id`, { ...menuParams(m, await categoryId(m.category, tx)), id: [sql.Int, id] }, tx);
    if (!rows.length) throw new HttpError(404, "Menu item not found");
    await saveSizes(id, m.sizes, tx);
  });
  res.json({ id });
}));

api.patch("/menu/:id/toggle", handle(async (req, res) => {
  const rows = await query(`UPDATE menu_items SET available = 1 - available OUTPUT INSERTED.available WHERE id = @id`,
    { id: [sql.Int, Number(req.params.id)] });
  if (!rows.length) throw new HttpError(404, "Menu item not found");
  res.json({ available: !!rows[0].available });
}));

api.get("/users", handle(async (req, res) => {
  const rows = await query(`SELECT user_id, username, role, status FROM users ORDER BY user_id`);
  res.json(rows.map(publicUser));
}));

api.post("/login", handle(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const rows = await query(`SELECT * FROM users WHERE username = @u`, { u: [sql.VarChar(50), username] });
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password_hash)))
    throw new HttpError(401, "Incorrect username or password.");
  if (user.status !== "Active") throw new HttpError(403, "This account is locked. Please contact an administrator.");
  res.json({ user: publicUser(user) });
}));

api.post("/users", handle(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!/^[A-Za-z0-9._-]{3,}$/.test(username)) throw new HttpError(400, "Username: at least 3 characters, no spaces or accents.");
  if (password.length < 4) throw new HttpError(400, "Password must be at least 4 characters.");
  const exists = await query(`SELECT 1 AS x FROM users WHERE username = @u`, { u: [sql.VarChar(50), username] });
  if (exists.length) throw new HttpError(409, "That username already exists.");
  const rows = await query(`
    INSERT INTO users (username, password_hash, role) OUTPUT INSERTED.user_id VALUES (@u, @p, 'Staff')`, {
    u: [sql.VarChar(50), username],
    p: [sql.VarChar(255), await bcrypt.hash(password, 10)],
  });
  res.status(201).json({ user_id: rows[0].user_id });
}));

api.patch("/users/:id", handle(async (req, res) => {
  const id = Number(req.params.id);
  const { password, status } = req.body;
  if (password !== undefined) {
    if (String(password).length < 4) throw new HttpError(400, "Password must be at least 4 characters.");
    await query(`UPDATE users SET password_hash = @p WHERE user_id = @id`, {
      id: [sql.Int, id], p: [sql.VarChar(255), await bcrypt.hash(String(password), 10)],
    });
  }
  if (status !== undefined) {
    if (!["Active", "Locked"].includes(status)) throw new HttpError(400, "Invalid status");
    await query(`UPDATE users SET status = @s WHERE user_id = @id`, { id: [sql.Int, id], s: [sql.VarChar(10), status] });
  }
  res.json({ ok: true });
}));

api.get("/orders", handle(async (req, res) => res.json(await loadOrders())));

api.get("/orders/next-id", handle(async (req, res) => {
  const rows = await query(`SELECT ISNULL(MAX(id), 1000) + 1 AS id FROM orders`);
  res.json({ id: rows[0].id });
}));

api.post("/orders", handle(async (req, res) => {
  const o = validateOrder(req.body);
  const saved = await inTransaction(async tx => {
    const priced = [];
    for (const l of o.lines) {
      const rows = await query(`
        SELECT mi.name, mi.image_url, mi.available, s.label, s.price,
               (SELECT COUNT(*) FROM menu_item_sizes x WHERE x.item_id = mi.id) AS size_count
        FROM menu_items mi
        JOIN menu_item_sizes s ON s.item_id = mi.id
        WHERE mi.id = @id AND (s.label = @label OR @label = '')
        ORDER BY s.sort_order, s.id`, {
        id: [sql.Int, Number(l.itemId)],
        label: [sql.NVarChar(50), String(l.sizeLabel || "")],
      }, tx);
      const m = rows[0];
      if (!m || !m.available) throw new HttpError(409, `"${l.name || "An item"}" is no longer available — please remove it from your cart`);
      priced.push({
        itemId: Number(l.itemId),
        name: m.name,
        img: m.image_url,
        size: m.size_count > 1 ? m.label : "",
        qty: Number(l.qty),
        unitPrice: Number(m.price),
        note: String(l.note || "").slice(0, 255),
      });
    }
    const subtotal = money(priced.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    const tax = money(subtotal * TAX_RATE);
    const total = money(subtotal + tax);
    const id = await nextOrderId(tx);

    await query(`
      INSERT INTO orders (id, customer_name, email, phone, address, mode, sched_date, sched_time,
                          subtotal, tax, total, payment)
      VALUES (@id, @name, @email, @phone, @address, @mode, @date, @time, @subtotal, @tax, @total, @payment)`, {
      id: [sql.Int, id],
      name: [sql.NVarChar(100), o.name],
      email: [sql.VarChar(100), o.email],
      phone: [sql.VarChar(20), o.phone],
      address: [sql.NVarChar(500), o.address],
      mode: [sql.VarChar(10), o.mode],
      date: [sql.VarChar(10), o.date],
      time: [sql.VarChar(5), o.time],
      subtotal: [sql.Decimal(12, 2), subtotal],
      tax: [sql.Decimal(12, 2), tax],
      total: [sql.Decimal(12, 2), total],
      payment: [sql.VarChar(10), o.payment],
    }, tx);

    for (const l of priced) {
      await query(`
        INSERT INTO order_items (order_id, item_id, item_name, image_url, size_label, qty, unit_price, note)
        VALUES (@order, @item, @name, @img, @size, @qty, @price, @note)`, {
        order: [sql.Int, id],
        item: [sql.Int, l.itemId],
        name: [sql.NVarChar(100), l.name],
        img: [sql.NVarChar(255), l.img],
        size: [sql.NVarChar(50), l.size],
        qty: [sql.Int, l.qty],
        price: [sql.Decimal(12, 2), l.unitPrice],
        note: [sql.NVarChar(255), l.note],
      }, tx);
    }
    return { id, subtotal, tax, total };
  });
  res.status(201).json(saved);
}));

api.patch("/orders/:id/status", handle(async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  const reason = String(req.body.reason || "").trim();
  if (status === "Rejected" && !reason) throw new HttpError(400, "Please give a reason for rejecting the order.");
  await inTransaction(async tx => {
    const rows = await query(`SELECT status, mode, payment FROM orders WITH (UPDLOCK) WHERE id = @id`, { id: [sql.Int, id] }, tx);
    const o = rows[0];
    if (!o) throw new HttpError(404, "Order not found");
    const allowed = (ORDER_FLOW[o.status] || (() => []))(o.mode);
    if (!allowed.includes(status)) throw new HttpError(409, `Order #${id} was just updated elsewhere — the list has been refreshed`);
    await query(`
      UPDATE orders SET status = @status,
        reject_reason = CASE WHEN @status = 'Rejected' THEN @reason ELSE reject_reason END,
        paid = CASE WHEN @status = 'Completed' AND payment = 'cash' THEN 1 ELSE paid END
      WHERE id = @id`, {
      id: [sql.Int, id], status: [sql.VarChar(20), status], reason: [sql.NVarChar(255), reason || null],
    }, tx);
  });
  res.json({ ok: true });
}));

api.patch("/orders/:id/paid", handle(async (req, res) => {
  const rows = await query(`UPDATE orders SET paid = 1 OUTPUT INSERTED.id WHERE id = @id`, { id: [sql.Int, Number(req.params.id)] });
  if (!rows.length) throw new HttpError(404, "Order not found");
  res.json({ ok: true });
}));

app.use("/api", api);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

const ROOT = path.join(__dirname, "..");
app.use((req, res, next) => (/^\/(server|database|\.git)(\/|$)/i.test(req.path) ? res.sendStatus(404) : next()));
app.use(express.static(ROOT, { index: "main.html", dotfiles: "deny" }));

async function start() {
  try {
    pool = await sql.connect(dbConfig);
  } catch (err) {
    console.error("Cannot connect to SQL Server:", err.message);
    console.error("Check that SQL Server is running, TCP/IP is enabled and the login in dbConfig is correct.");
    process.exit(1);
  }
  await seedUsers();
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

start();
