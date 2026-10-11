"use strict";

// Đăng nhập / Đăng ký bằng localStorage
const USERS_KEY = "demo_users";
const SESSION_KEY = "demo_session";

const card = document.querySelector(".card");
const loginForm = document.querySelector(".form-login");
const signupForm = document.querySelector(".form-signup");
const profile = document.querySelector(".profile");
const Notification = document.getElementById("toast");


// LẤY VÀ LƯU DỮ LIỆU
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

// Lưu danh sách người dùng
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Lấy phiên đăng nhập
function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

// Băm mật khẩu bằng SHA-256
async function hashPassword(password) {
  if (!window.crypto || !crypto.subtle) {
    return "plain:" + password;
  }

  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}


// HIỂN THỊ THÔNG BÁO
let toastTimer;

function showToast(message, type = "") {
  Notification.textContent = message;
  Notification.className = "toast show " + type;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => (Notification.className = "toast"),
    2800
  );
}


// XỬ LÝ LỖI FORM
function setFieldError(input, message) {
  const field = input.closest(".field");

  field.classList.toggle("invalid", Boolean(message));
  field.querySelector(".error-msg").textContent = message || "";
}

function clearErrors(form) {
  form.querySelectorAll(".field").forEach((f) =>
    f.classList.remove("invalid")
  );

  const box = form.querySelector(".form-error");
  box.classList.remove("show");
  box.textContent = "";
}

function showFormError(form, message) {
  const box = form.querySelector(".form-error");

  box.textContent = message;
  box.classList.add("show");
}


// KHỞI TẠO FORM VÀ NÚT MẬT KHẨU
function setupForm(form) {
  form.noValidate = true;

  // Tạo hộp thông báo lỗi
  const formError = document.createElement("div");
  formError.className = "form-error";
  formError.setAttribute("role", "alert");
  form.querySelector(".subtitle").after(formError);

  form.querySelectorAll(".field").forEach((field) => {
    const input = field.querySelector("input");

    // Tạo thông báo lỗi cho từng ô
    const err = document.createElement("div");
    err.className = "error-msg";
    field.appendChild(err);

    // Xóa lỗi khi nhập lại
    input.addEventListener("input", () => {
      setFieldError(input, "");
      formError.classList.remove("show");
    });

    // Tạo nút ẩn/hiện mật khẩu
    if (input.type === "password") {
      const wrap = document.createElement("div");
      wrap.className = "input-wrap";

      input.before(wrap);
      wrap.appendChild(input);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-pass";
      btn.setAttribute("aria-label", "Hiện hoặc ẩn mật khẩu");

      // Thêm icon con mắt
      const icon = document.createElement("img");
      icon.src = "svg flie/eyes.svg";
      icon.alt = "";

      btn.appendChild(icon);

      // Chuyển đổi trạng thái mật khẩu
      btn.addEventListener("click", () => {
        const show = input.type === "password";

        input.type = show ? "text" : "password";
        icon.src = show ? "svg flie/eyes-off.svg" : "svg flie/eyes.svg";
      });

      wrap.appendChild(btn);
    }
  });
}


// KIỂM TRA DỮ LIỆU
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function Valid_Data_Username(value) {
  if (!value) return "Vui lòng nhập tên đăng nhập.";

  if (!USERNAME_RE.test(value))
    return "3–20 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới (_).";

  return "";
}

function Valid_Data_Password(value) {
  if (!value) return "Vui lòng nhập mật khẩu.";

  if (value.length < 6)
    return "Mật khẩu phải có ít nhất 6 ký tự.";

  return "";
}


// KIỂM TRA PHIÊN ĐĂNG NHẬP
function renderSession() {
  const username = getSession();

  if (username) {
    card.classList.add("logged-in");

    if (profile) {
      profile.hidden = false;

      document.getElementById("profile-name").textContent = username;
      document.getElementById("avatar").textContent =
        username[0].toUpperCase();
    }
  } else {
    card.classList.remove("logged-in");

    if (profile) profile.hidden = true;
  }
}


// ĐĂNG NHẬP
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

  // Kiểm tra tài khoản và mật khẩu
  if (!record || record.passwordHash !== hash) {
    showFormError(loginForm, "Tên đăng nhập hoặc mật khẩu không đúng.");
    return;
  }

  // Lưu phiên và chuyển đến trang chủ
  localStorage.setItem(SESSION_KEY, record.username);
  window.location.href = "home.html";
});


// ĐĂNG KÝ
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors(signupForm);

  const User_Input = signupForm.elements.username;
  const Pass_Input = signupForm.elements.password;
  const Confirm_Input = signupForm.elements.confirm;

  const User_Name = User_Input.value.trim();
  const password = Pass_Input.value;
  const confirm = Confirm_Input.value;

  // Kiểm tra dữ liệu đầu vào
  const User_error = Valid_Data_Username(User_Name);
  const Pass_Error = Valid_Data_Password(password);

  let Confirm_Error = "";

  if (!confirm)
    Confirm_Error = "Vui lòng nhập lại mật khẩu.";
  else if (confirm !== password)
    Confirm_Error = "Mật khẩu nhập lại không khớp.";

  setFieldError(User_Input, User_error);
  setFieldError(Pass_Input, Pass_Error);
  setFieldError(Confirm_Input, Confirm_Error);

  if (User_error || Pass_Error || Confirm_Error) return;

  const users = getUsers();

  // Kiểm tra tên đăng nhập đã tồn tại
  const key = User_Name.toLowerCase();

  if (users[key]) {
    setFieldError(User_Input, "Tên đăng nhập này đã được sử dụng.");
    return;
  }

  // Lưu tài khoản mới
  users[key] = {
    username: User_Name,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  saveUsers(users);

  // Đăng nhập và chuyển đến trang chủ
  localStorage.setItem(SESSION_KEY, User_Name);
  signupForm.reset();

  window.location.href = "home.html";
});


// ĐĂNG XUẤT
const logoutButton = document.getElementById("logout-btn");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);

    renderSession();
    showToast("Đã đăng xuất.");
  });
}


// ĐĂNG NHẬP GOOGLE / FACEBOOK
document.querySelectorAll(".btn-social").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.textContent.trim();

    showToast(`Đăng nhập bằng ${name} chưa được kết nối.`);
    // TODO: Tích hợp OAuth
  });
});


// KHỞI TẠO
setupForm(loginForm);
setupForm(signupForm);
renderSession();
