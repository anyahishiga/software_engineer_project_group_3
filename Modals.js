"use strict";
class Modal {
  constructor(root) { this.root = root; this.el = null; }
  eyebrow() { return ""; } title() { return ""; } subtitle() { return ""; } body() { return ""; }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">OK</button>`; }
  onOpen() {} onConfirm() { this.close(); }
  open() {
    this.el = document.createElement("div"); this.el.className = "overlay";
    this.el.innerHTML = `<div class="modal"><button class="x" data-act="cancel" aria-label="Close">×</button>
      ${when(this.eyebrow(), `<p class="eyebrow">${this.eyebrow()}</p>`)}<h3>${this.title()}</h3><p class="sub">${this.subtitle()}</p>${this.body()}<div class="foot">${this.footer()}</div></div>`;
    this.el.addEventListener("click", e => {
      if (e.target === this.el) return this.close();
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") this.close(); else if (act === "ok") this.onConfirm();
    });
    this.root.appendChild(this.el); this.onOpen();
  }
  close() { this.el?.remove(); this.el = null; }
}
class OrderItemsModal extends Modal {
  constructor(root, order) { super(root); this.order = order; }
  title() { return `Order #${this.order.id}`; }
  subtitle() { return `${esc(this.order.customer)} · ${esc(this.order.mode)} · ${esc(this.order.when)}`; }
  body() {
    const o = this.order;
    return `<div class="lines">${OrderItemsModal.linesHtml(o.lines)}</div>
      <div class="totals"><div><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div><span>Taxes</span><span>${money(o.taxes)}</span></div>
      <div class="grand"><span>Total</span><span>${money(o.total)}</span></div></div>`;
  }
  footer() { return `<button class="btn-primary" data-act="cancel">Close</button>`; }
  // Dòng món: ảnh, tên, "SL × đơn giá", ghi chú, thành tiền (dùng ở Staff, Cart, Dashboard)
  static linesHtml(lines) {
    return lines.map(l => `<div class="line">${thumbHtml(l.img)}
      <div class="info"><div class="nm">${esc(l.name)}${l.size ? ` (${esc(l.size)})` : ""}</div><div class="sub">${l.qty} × ${money(l.unitPrice)}</div>${l.note ? `<div class="note">${esc(l.note)}</div>` : ""}</div>
      <div class="amt">${money(l.total)}</div></div>`).join("");
  }
}
// Hỏi lý do khi nhân viên từ chối đơn; onReason(reason) được gọi khi đã nhập hợp lệ
class RejectModal extends Modal {
  constructor(root, orderId, onReason) { super(root); Object.assign(this, { orderId, onReason }); }
  title() { return `Reject order #${this.orderId}`; }
  subtitle() { return "Please tell the customer why this order is being rejected."; }
  body() { return `<div class="field"><label>Reason *</label><textarea id="rReason" rows="3" placeholder="e.g. Item sold out, outside delivery area..."></textarea></div><p class="form-err" id="rErr"></p>`; }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">Reject order</button>`; }
  onOpen() { this.el.querySelector("#rReason").focus(); }
  onConfirm() {
    const reason = this.el.querySelector("#rReason").value.trim();
    if (reason.length < 3) { this.el.querySelector("#rErr").textContent = "Please enter a reason."; return; }
    this.close(); this.onReason(reason);
  }
}
class ScheduleModal extends Modal {
  constructor(root, schedule, onUpdate) { super(root); this.schedule = schedule; this.onUpdate = onUpdate; }
  title() { return "Choose your schedule"; }
  subtitle() { return "Review the available date and time, then click Update to apply your selection."; }
  body() {
    const dates = PickupSchedule.dateOptions().map(d => `<option ${fmtDate(d) === this.schedule.dateLabel ? "selected" : ""}>${fmtDate(d)}</option>`).join("");
    const times = PickupSchedule.timeOptions().map(t => `<option ${t === this.schedule.time ? "selected" : ""}>${t}</option>`).join("");
    return `<div class="field"><label>Select order date</label><select id="mDate">${dates}</select></div>
            <div class="field"><label>Select a time</label><select id="mTime">${times}</select></div>
            <p class="form-err" id="mErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">Update</button>`; }
  onConfirm() {
    const [d, m, y] = this.el.querySelector("#mDate").value.split(".").map(Number);
    const date = new Date(y, m - 1, d), time = this.el.querySelector("#mTime").value;
    const error = PickupSchedule.validate(date, time);   // chặn giờ đã qua / ASAP cho ngày khác
    if (error) { this.el.querySelector("#mErr").textContent = error; return; }
    this.schedule.date = date; this.schedule.time = time;
    this.onUpdate(); this.close();
  }
}
class ItemModal extends Modal {
  constructor(root, menuItem, cart, cartItem = null) {
    super(root); Object.assign(this, { menuItem, cart, cartItem, qty: cartItem ? cartItem.qty : 1 });
  }
  title() { return esc(this.menuItem.name); } subtitle() { return esc(this.menuItem.desc); }
  body() {
    const cur = this.cartItem ? this.cartItem.sizeIndex : 0;
    const sizes = this.menuItem.hasSizes ? `<div class="field"><label>Size</label><select id="mSize">${this.menuItem.sizes.map((s, i) =>
      `<option value="${i}" ${i === cur ? "selected" : ""}>${esc(s.label)} – ${money(s.price)}</option>`).join("")}</select></div>` : "";
    return `${sizes}<div class="field"><label>Quantity</label><div class="qty"><button data-q="-1">−</button><strong id="mQty">${this.qty}</strong><button data-q="1">+</button></div></div>
            <div class="field"><label>Special instructions</label><input id="mNote" placeholder="e.g. no lettuce" value="${esc(this.cartItem?.note || "")}"></div>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">${this.cartItem ? "Save" : "Add to order"}</button>`; }
  onOpen() { this.el.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { this.qty = Math.max(1, this.qty + Number(b.dataset.q)); this.el.querySelector("#mQty").textContent = this.qty; })); }
  onConfirm() {
    const sizeIndex = Number(this.el.querySelector("#mSize")?.value || 0), note = this.el.querySelector("#mNote").value.trim();
    if (this.cartItem) this.cart.update(this.cartItem.uid, { sizeIndex, qty: this.qty, note });
    else this.cart.add(new CartItem(this.menuItem, sizeIndex, this.qty, note));
    this.close();
  }
}

/* ---------- Các hộp thoại của Nhân viên / Quản trị viên ---------- */

// Đăng nhập Nhân viên / Admin (mở từ nút "Sign in" trên thanh điều hướng). Đúng tài khoản → onSuccess(user)
class LoginModal extends Modal {
  constructor(root, onSuccess) { super(root); this.onSuccess = onSuccess; }
  eyebrow() { return "Staff access"; }
  title() { return "Staff sign in"; }
  subtitle() { return "Enter the username and password provided by the restaurant."; }
  body() {
    return `<div class="field"><label>Username</label><input id="lUser" autocomplete="username"></div>
            <div class="field"><label>Password</label><input id="lPass" type="password" autocomplete="current-password"></div>
            <p class="form-err" id="lErr"></p>`;
  }
  footer() { return `<button class="btn-primary full" data-act="ok">Sign in</button>`; }
  onOpen() {
    this.el.querySelector("#lUser").focus();
    this.el.addEventListener("keydown", e => { if (e.key === "Enter") this.onConfirm(); });
  }
  async onConfirm() {
    const result = await Store.login(this.el.querySelector("#lUser").value, this.el.querySelector("#lPass").value);
    if (result.error) { this.el.querySelector("#lErr").textContent = result.error; return; }
    this.close(); this.onSuccess(result.user);
  }
}

// Thêm / sửa món ăn (Admin). item = null → thêm mới
class MenuItemModal extends Modal {
  constructor(root, item, onSave) { super(root); Object.assign(this, { item, onSave }); }
  title() { return this.item ? "Edit menu item" : "Add menu item"; }
  subtitle() { return "Prices are entered WITHOUT tax. One size per line, format: Name | Price"; }
  body() {
    const m = this.item;
    const sizes = (m ? m.sizes : [{ label: "Default", price: 0 }]).map(s => `${s.label} | ${s.price}`).join("\n");
    const cats = Store.allCategories().map(c => `<option value="${esc(c)}"></option>`).join("");
    return `<div class="field"><label>Name *</label><input id="fName" value="${esc(m?.name || "")}"></div>
      <div class="field"><label>Category * (pick one or type a new one)</label><input id="fCat" list="catList" value="${esc(m?.category || "")}"><datalist id="catList">${cats}</datalist></div>
      <div class="field"><label>Description</label><input id="fDesc" value="${esc(m?.desc || "")}"></div>
      <div class="field"><label>Image path or URL</label><input id="fImg" placeholder="images/my-dish.jpg" value="${esc(m?.img || "")}"></div>
      <div class="field"><label>Sizes &amp; prices *</label><textarea id="fSizes" rows="3">${esc(sizes)}</textarea></div>
      <label class="check"><input type="checkbox" id="fAvail" ${m && !m.available ? "" : "checked"}> Available to guests</label>
      <p class="form-err" id="fErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">Save</button>`; }
  onConfirm() {
    const val = sel => this.el.querySelector(sel).value.trim();
    const fail = text => { this.el.querySelector("#fErr").textContent = text; };
    const name = val("#fName"), category = val("#fCat");
    if (!name || !category) return fail("Please enter a name and a category.");
    const sizes = [];
    for (const row of val("#fSizes").split("\n").filter(r => r.trim())) {
      const [label, price] = row.split("|").map(x => x.trim()), n = Number(price);
      if (!label || !price || !Number.isFinite(n) || n < 0) return fail(`Invalid size line: "${row}"`);
      sizes.push({ label, price: n });
    }
    if (!sizes.length) return fail("At least one size with a price is required.");
    Store.saveMenuItem({
      id: this.item?.id, name, category, desc: val("#fDesc"), img: val("#fImg"), sizes,
      available: this.el.querySelector("#fAvail").checked,
    });
    this.close(); this.onSave();
  }
}

// Tạo tài khoản nhân viên mới (user = null, vai trò luôn là Staff) hoặc sửa tài khoản: đổi mật khẩu + khóa / mở khóa
class UserModal extends Modal {
  constructor(root, user, onSave, isSelf = false) { super(root); Object.assign(this, { user, onSave, isSelf }); }
  title() { return this.user ? `Edit account: ${esc(this.user.username)}` : "New staff account"; }
  subtitle() { return this.user ? "Leave the password empty to keep it unchanged." : "New accounts get the Staff role."; }
  body() {
    const u = this.user;
    const name = u ? "" : `<div class="field"><label>Username *</label><input id="uName" autocomplete="off"></div>`;
    const status = u && !this.isSelf ? `<div class="field"><label>Status</label><select id="uStatus">
      <option value="Active" ${u.status === "Active" ? "selected" : ""}>Active</option><option value="Locked" ${u.status === "Locked" ? "selected" : ""}>Locked</option></select></div>` : "";
    return `${name}<div class="field"><label>${u ? "New password" : "Password *"}</label><input id="uPass" type="text" autocomplete="off"></div>${status}
      <p class="form-err" id="uErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">Save</button>`; }
  onConfirm() {
    const fail = text => { this.el.querySelector("#uErr").textContent = text; };
    const password = this.el.querySelector("#uPass").value;
    if (this.user) {
      if (password && password.length < 4) return fail("Password must be at least 4 characters.");
      const patch = {}, status = this.el.querySelector("#uStatus")?.value;
      if (password) patch.password = password;
      if (status) patch.status = status;
      if (Object.keys(patch).length) Store.updateUser(this.user.user_id, patch);
    } else {
      const username = this.el.querySelector("#uName").value.trim();
      if (!/^[A-Za-z0-9._-]{3,}$/.test(username)) return fail("Username: at least 3 characters, no spaces or accents.");
      if (password.length < 4) return fail("Password must be at least 4 characters.");
      const error = Store.addUser(username, password);
      if (error) return fail(error);
    }
    this.close(); this.onSave();
  }
}