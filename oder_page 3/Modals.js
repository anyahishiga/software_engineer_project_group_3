"use strict";
class Modal {
  constructor(root) { this.root = root; this.el = null; }
  title() { return ""; } subtitle() { return ""; } body() { return ""; }
  footer() { return `<button class="btn-ghost" data-act="cancel">Cancel</button><button class="btn-primary" data-act="ok">OK</button>`; }
  onOpen() {} onConfirm() { this.close(); }
  open() {
    this.el = document.createElement("div"); this.el.className = "overlay";
    this.el.innerHTML = `<div class="modal"><button class="x" data-act="cancel" aria-label="Close">×</button>
      <h3>${this.title()}</h3><p class="sub">${this.subtitle()}</p>${this.body()}<div class="foot">${this.footer()}</div></div>`;
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
  static linesHtml(lines) {
    return lines.map(l => `<div class="line"><div class="thumb">${l.emoji}</div>
      <div class="info"><div>${esc(l.name)}${l.size ? ` (${esc(l.size)})` : ""}</div>${l.note ? `<div class="note">${esc(l.note)}</div>` : ""}</div>
      <div class="amt">x ${l.qty}<br>${money(l.total)}</div></div>`).join("");
  }
}
class ScheduleModal extends Modal {
  constructor(root, schedule, onUpdate) { super(root); this.schedule = schedule; this.onUpdate = onUpdate; }
  title() { return "Choose Your Pickup Schedule"; }
  subtitle() { return "Review the available date and time, then click Update to apply your selection."; }
  body() {
    const dates = PickupSchedule.dateOptions().map(d => `<option ${fmtDate(d) === this.schedule.dateLabel ? "selected" : ""}>${fmtDate(d)}</option>`).join("");
    const times = PickupSchedule.timeOptions().map(t => `<option ${t === this.schedule.time ? "selected" : ""}>${t}</option>`).join("");
    return `<div class="field"><label>Select pickup order date</label><select id="mDate">${dates}</select></div>
            <div class="field"><label>Select a pickup time</label><select id="mTime">${times}</select></div>
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
      `<option value="${i}" ${i === cur ? "selected" : ""}>${s.label} – ${money(s.price * (1 + Cart.TAX_RATE))}</option>`).join("")}</select></div>` : "";
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

// Đăng nhập Nhân viên / Admin (mở từ màn hình chào mừng). Đúng tài khoản → gọi onSuccess(user)
class LoginModal extends Modal {
  constructor(root, onSuccess) { super(root); this.onSuccess = onSuccess; }
  title() { return "Đăng nhập nhân viên"; }
  subtitle() { return "Nhập tên đăng nhập và mật khẩu được cấp."; }
  body() {
    return `<div class="field"><label>Tên đăng nhập</label><input id="lUser" autocomplete="username"></div>
            <div class="field"><label>Mật khẩu</label><input id="lPass" type="password" autocomplete="current-password"></div>
            <p class="form-err" id="lErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Hủy</button><button class="btn-primary" data-act="ok">Đăng nhập</button>`; }
  onOpen() {
    this.el.querySelector("#lUser").focus();
    this.el.addEventListener("keydown", e => { if (e.key === "Enter") this.onConfirm(); });
  }
  onConfirm() {
    const result = Store.login(this.el.querySelector("#lUser").value, this.el.querySelector("#lPass").value);
    if (result.error) { this.el.querySelector("#lErr").textContent = result.error; return; }
    this.close(); this.onSuccess(result.user);
  }
}

// Thêm / sửa món ăn (Admin). item = null → thêm mới
class MenuItemModal extends Modal {
  constructor(root, item, onSave) { super(root); Object.assign(this, { item, onSave }); }
  title() { return this.item ? "Sửa món ăn" : "Thêm món ăn"; }
  subtitle() { return "Giá nhập là giá CHƯA gồm thuế. Mỗi kích cỡ một dòng, dạng: Tên | Giá"; }
  body() {
    const m = this.item;
    const sizes = (m ? m.sizes : [{ label: "Default", price: 0 }]).map(s => `${s.label} | ${s.price}`).join("\n");
    const cats = Store.allCategories().map(c => `<option value="${esc(c)}"></option>`).join("");
    return `<div class="field"><label>Tên món *</label><input id="fName" value="${esc(m?.name || "")}"></div>
      <div class="field"><label>Danh mục * (chọn có sẵn hoặc gõ danh mục mới)</label><input id="fCat" list="catList" value="${esc(m?.category || "")}"><datalist id="catList">${cats}</datalist></div>
      <div class="field"><label>Mô tả</label><input id="fDesc" value="${esc(m?.desc || "")}"></div>
      <div class="field"><label>Biểu tượng (emoji)</label><input id="fEmoji" value="${esc(m?.emoji || "🍽️")}"></div>
      <div class="field"><label>Kích cỡ &amp; giá *</label><textarea id="fSizes" rows="3">${esc(sizes)}</textarea></div>
      <label class="check"><input type="checkbox" id="fAvail" ${m && !m.available ? "" : "checked"}> Đang phục vụ</label>
      <p class="form-err" id="fErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Hủy</button><button class="btn-primary" data-act="ok">Lưu</button>`; }
  onConfirm() {
    const val = sel => this.el.querySelector(sel).value.trim();
    const fail = text => { this.el.querySelector("#fErr").textContent = text; };
    const name = val("#fName"), category = val("#fCat");
    if (!name || !category) return fail("Vui lòng nhập tên món và danh mục.");
    const sizes = [];
    for (const row of val("#fSizes").split("\n").filter(r => r.trim())) {
      const [label, price] = row.split("|").map(x => x.trim()), n = Number(price);
      if (!label || !price || !Number.isFinite(n) || n < 0) return fail(`Dòng kích cỡ không hợp lệ: "${row}"`);
      sizes.push({ label, price: n });
    }
    if (!sizes.length) return fail("Cần ít nhất một kích cỡ kèm giá.");
    Store.saveMenuItem({
      id: this.item?.id, name, category, desc: val("#fDesc"), emoji: val("#fEmoji") || "🍽️", sizes,
      available: this.el.querySelector("#fAvail").checked,
    });
    this.close(); this.onSave();
  }
}

// Tạo tài khoản nhân viên mới, hoặc đổi mật khẩu (user != null). Vai trò tài khoản mới luôn là Staff
class UserModal extends Modal {
  constructor(root, user, onSave) { super(root); Object.assign(this, { user, onSave }); }
  title() { return this.user ? `Đổi mật khẩu: ${esc(this.user.username)}` : "Tạo tài khoản nhân viên"; }
  subtitle() { return this.user ? "Để trống nếu không muốn đổi mật khẩu." : "Tài khoản mới có vai trò Nhân viên (Staff)."; }
  body() {
    const name = this.user ? "" : `<div class="field"><label>Tên đăng nhập *</label><input id="uName" autocomplete="off"></div>`;
    return `${name}<div class="field"><label>Mật khẩu ${this.user ? "mới" : "*"}</label><input id="uPass" type="text" autocomplete="off"></div>
      <p class="form-err" id="uErr"></p>`;
  }
  footer() { return `<button class="btn-ghost" data-act="cancel">Hủy</button><button class="btn-primary" data-act="ok">Lưu</button>`; }
  onConfirm() {
    const fail = text => { this.el.querySelector("#uErr").textContent = text; };
    const password = this.el.querySelector("#uPass").value;
    if (this.user) {
      if (password) {
        if (password.length < 4) return fail("Mật khẩu tối thiểu 4 ký tự.");
        Store.updateUser(this.user.user_id, { password });
      }
    } else {
      const username = this.el.querySelector("#uName").value.trim();
      if (!/^[A-Za-z0-9._-]{3,}$/.test(username)) return fail("Tên đăng nhập tối thiểu 3 ký tự, không dấu, không khoảng trắng.");
      if (password.length < 4) return fail("Mật khẩu tối thiểu 4 ký tự.");
      const error = Store.addUser(username, password);
      if (error) return fail(error);
    }
    this.close(); this.onSave();
  }
}
