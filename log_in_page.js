"use strict";

//Đăng nhập / Đăng ký bằng JavaScript (demo phía client)
//Dữ liệu người dùng lưu trong localStorage

const USERS_KEY = "demo_users";
const SESSION_KEY = "demo_session";

const card = document.querySelector(".card");
const loginForm = document.querySelector(".form-login");
const signupForm = document.querySelector(".form-signup");
const profile = document.querySelector(".profile");
const Notification = document.getElementById("toast");

/* ---------- Lưu trữ ---------- */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

//lưu danh sách người dùng vào localStorage
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
//lấy tên người dùng đang đăng nhập từ localStorage
function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

// mã hóa mật khẩu bằng SHA-256 (nếu trình duyệt hỗ trợ)
async function hashPassword(password) {
  if (!window.crypto || !crypto.subtle) {
    // Nếu trình duyệt không hỗ trợ, trả về mật khẩu gốc (không an toàn)
    return "plain:" + password;
  }
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

//thông báo đăng nhập đăng ký thành công hoặc lỗi
let toastTimer;
function showToast(message, type = "") {
  Notification.textContent = message;
  Notification.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (Notification.className = "toast"), 2800);
}

/* ---------- Hiển thị lỗi ---------- */
function setFieldError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("invalid", Boolean(message));
  field.querySelector(".error-msg").textContent = message || "";
}

function clearErrors(form) {
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
  const box = form.querySelector(".form-error");
  box.classList.remove("show");
  box.textContent = "";
}

function showFormError(form, message) {
  const box = form.querySelector(".form-error");
  box.textContent = message;
  box.classList.add("show");
}

/* ---------- Chuẩn bị giao diện (thêm lỗi + nút ẩn/hiện mật khẩu) ---------- */
function setupForm(form) {
  form.noValidate = true; // dùng kiểm tra riêng thay vì popup mặc định

  // Hộp lỗi chung, đặt dưới phần mô tả
  const formError = document.createElement("div");
  formError.className = "form-error";
  formError.setAttribute("role", "alert");
  form.querySelector(".subtitle").after(formError);

  form.querySelectorAll(".field").forEach((field) => {
    const input = field.querySelector("input");

    // Thông báo lỗi dưới từng ô
    const err = document.createElement("div");
    err.className = "error-msg";
    field.appendChild(err);

    // Xoá lỗi khi người dùng gõ lại
    input.addEventListener("input", () => {
      setFieldError(input, "");
      formError.classList.remove("show");
    });

    // Nút ẩn/hiện mật khẩu
    if (input.type === "password") {
      const wrap = document.createElement("div");
      wrap.className = "input-wrap";
      input.before(wrap);
      wrap.appendChild(input);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-pass";
      btn.setAttribute("aria-label", "Hiện hoặc ẩn mật khẩu");
      // Icon con mắt (file svg nằm trong thư mục pic)
      const icon = document.createElement("img");
      icon.src = "pic/eyes.svg";
      icon.alt = "";
      btn.appendChild(icon);
      btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      icon.src = show ? "pic/eyes-off.svg" : "pic/eyes.svg"; 
      });
      wrap.appendChild(btn);
    }
  });
}

/* ---------- Kiểm tra dữ liệu ---------- */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function Valid_Data_Username(value) {
  if (!value) return "Vui lòng nhập tên đăng nhập.";
  if (!USERNAME_RE.test(value))
    return "3–20 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới (_).";
  return "";
}

function Valid_Data_Password(value) {
  if (!value) return "Vui lòng nhập mật khẩu.";
  if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
  return "";
}

/* ---------- Trạng thái đăng nhập ---------- */
function renderSession() {
  const username = getSession();
  if (username) {
    card.classList.add("logged-in");
    if (profile) {
      profile.hidden = false;
      document.getElementById("profile-name").textContent = username;
      document.getElementById("avatar").textContent = username[0].toUpperCase();
    }
  } else {
    card.classList.remove("logged-in");
    if (profile) profile.hidden = true;
  }
}

/* ---------- Đăng nhập ---------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors(loginForm);

  const userInput = loginForm.elements.username;
  const passInput = loginForm.elements.password;
  const username = userInput.value.trim();
  const password = passInput.value;

  const userErr = username ? "" : "Vui lòng nhập tên đăng nhập.";
  const passErr = password ? "" : "Vui lòng nhập mật khẩu.";
  setFieldError(userInput, userErr);
  setFieldError(passInput, passErr);
  if (userErr || passErr) return;

  const users = getUsers();
  const record = users[username.toLowerCase()];
  const hash = await hashPassword(password);

  // Cùng một thông báo cho cả hai trường hợp để không lộ tài khoản có tồn tại
  if (!record || record.passwordHash !== hash) {
    showFormError(loginForm, "Tên đăng nhập hoặc mật khẩu không đúng.");
    return;
  }

  // Lưu trạng thái đăng nhập và chuyển sang trang home
  localStorage.setItem(SESSION_KEY, record.username);
  // Chuyển hướng sang trang home.html khi đăng nhập thành công
  window.location.href = "home.html";
});

/* ---------- Đăng ký ---------- */
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors(signupForm);

  const User_Input = signupForm.elements.username;
  const Pass_Input = signupForm.elements.password;
  const Confirm_Input = signupForm.elements.confirm;

  const User_Name = User_Input.value.trim();
  const password = Pass_Input.value;
  const confirm = Confirm_Input.value;

  // Kiểm tra dữ liệu nếu sai
  const User_error = Valid_Data_Username(User_Name);
  const Pass_Error = Valid_Data_Password(password);
  let Confirm_Error = "";

  if (!confirm) Confirm_Error = "Vui lòng nhập lại mật khẩu.";
  else if (confirm !== password)
    Confirm_Error = "Mật khẩu nhập lại không khớp.";

  setFieldError(User_Input, User_error);
  setFieldError(Pass_Input, Pass_Error);
  setFieldError(Confirm_Input, Confirm_Error);
  if (User_error || Pass_Error || Confirm_Error) return;

  const users = getUsers();
  // Kiểm tra tên đăng nhập đã tồn tại chưa
  const key = User_Name.toLowerCase();
  if (users[key]) {
    setFieldError(User_Input, "Tên đăng nhập này đã được sử dụng.");
    return;
  }
  // Lưu thông tin người dùng mới
  users[key] = {
    username: User_Name,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  saveUsers(users);

  localStorage.setItem(SESSION_KEY, User_Name);
  signupForm.reset();
  window.location.href = "home.html";
});

/* ---------- Đăng xuất ---------- */
const logoutButton = document.getElementById("logout-btn");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    renderSession();
    showToast("Đã đăng xuất.");
  });
}

/* ---------- Nút Google / Facebook (chưa kết nối) ---------- */
document.querySelectorAll(".btn-social").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.textContent.trim();
    showToast(`Đăng nhập bằng ${name} chưa được kết nối.`);
    // TODO: gọi OAuth thật (Firebase Auth, Google Identity Services, Facebook SDK...)
  });
});

/* ---------- Khởi tạo ---------- */
setupForm(loginForm);
setupForm(signupForm);
renderSession();
