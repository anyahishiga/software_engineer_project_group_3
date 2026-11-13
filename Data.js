"use strict";

// DỮ LIỆU MẪU của thực đơn — chỉ dùng để nạp vào localStorage lần đầu (xem Storage.js).
// Giá là giá CHƯA gồm thuế 10%. Ảnh nằm trong thư mục images/ (thay bằng ảnh của bạn, giữ nguyên tên file hoặc sửa đường dẫn ở đây).
// Sửa file này không đổi ngay thực đơn đang chạy → đổi SEED_VERSION trong Storage.js (hoặc xóa localStorage) để nạp lại.

const dish = (id, category, name, desc, price, img) =>
  ({ id, category, name, desc, img: `images/${img}`, sizes: [{ label: "Default", price }] });

const SEED_MENU = [
  dish(1, "Main Dish", "Classic Cheeseburger", "Grilled beef patty, Cheddar cheese, pickles, lettuce and house sauce.", 85000, "cheeseburger.jpg"),
  dish(2, "Main Dish", "Ribeye Steak Rice Bowl", "Juicy ribeye, black pepper sauce, butter-fried asparagus and a fried egg.", 95000, "ribeye-bowl.jpg"),
  dish(3, "Main Dish", "Pan-Seared Salmon Rice Bowl", "Pan-seared salmon with lemon butter sauce, rice and roasted vegetables.", 110000, "salmon-bowl.jpg"),
  dish(4, "Dessert", "Strawberry Panna Cotta", "Silky milk dessert topped with sweet and sour strawberry sauce.", 35000, "panna-cotta.jpg"),
  dish(5, "Pasta & Pizza", "Creamy Alfredo Pasta", "Penne pasta, Parmesan and mushrooms in a rich cream sauce.", 89000, "alfredo-pasta.jpg"),
  dish(6, "Pasta & Pizza", "Margherita Pizza", "Tomato, fresh mozzarella, basil and extra virgin olive oil.", 99000, "margherita-pizza.jpg"),
  dish(7, "Starter", "Garden Burrata Salad", "Burrata, seasonal greens, tomato and a bright citrus dressing.", 69000, "burrata-salad.jpg"),
  dish(8, "Drink", "Tropical Mango Cooler", "Fresh mango, citrus, mint and sparkling water.", 42000, "mango-cooler.jpg"),
];
