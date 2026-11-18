"use strict";

// DỮ LIỆU MẪU của thực đơn — chỉ dùng để nạp vào localStorage lần đầu (xem Storage.js).
// Giá là giá CHƯA gồm thuế 10%. Ảnh nằm trong thư mục images/ (thay bằng ảnh của bạn, giữ nguyên tên file hoặc sửa đường dẫn ở đây).
// Sửa file này không đổi ngay thực đơn đang chạy → đổi SEED_VERSION trong Storage.js (hoặc xóa localStorage) để nạp lại.

const dish = (id, category, name, desc, price, img) =>
      ({ id, category, name, desc, img: `images/${img}`, price });

const SEED_MENU = [
  dish(1, "Burgers & Wraps", "Classic Cheeseburger", "Soft burger bun with grilled beef patty, melted Cheddar cheese, pickles, fresh lettuce, and special sauce. Served with crispy french fries.", 85000, "cheeseburger.jpg"),
  dish(2, "Burgers & Wraps", "Grilled Chicken Caesar Wrap", "Soft tortilla wrap with grilled chicken breast, fresh Romaine lettuce, Caesar sauce, and Parmesan cheese.", 65000, "chicken-wrap.jpg"),
  dish(3, "Starter", "Pumpkin Soup", "Smooth pumpkin soup cooked with fresh cream, butter, and thyme. Served with crispy garlic bread.", 45000, "pumpkin-soup.jpg"),
  dish(4, "Starter", "Caesar Salad with Grilled Shrimp", "Fresh Romaine lettuce mixed with Caesar sauce, croutons, Parmesan cheese, and grilled shrimp.", 75000, "shrimp-caesar-salad.jpg"),
  dish(5, "Starter", "Garlic Bread with Cheese", "Crispy baguette topped with garlic butter and melted Mozzarella cheese.", 35000, "garlic-bread.jpg"),
  dish(6, "Pizza & Pasta", "Seafood Pizza", "Crispy pizza crust topped with tomato sauce, shrimp, squid, Mozzarella cheese, and fresh basil.", 120000, "seafood-pizza.jpg"),
  dish(7, "Pizza & Pasta", "Spaghetti Carbonara", "Spaghetti cooked with creamy egg sauce, Parmesan cheese, and crispy bacon, topped with black pepper.", 75000, "carbonara.jpg"),
  dish(8, "Pizza & Pasta", "Spaghetti Bolognese", "Spaghetti with slow-cooked tomato sauce, minced beef, vegetables, and Italian herbs.", 70000, "bolognese.jpg"),
  dish(9, "Main Dish", "Ribeye Steak Rice Bowl", "Steamed rice served with juicy beef ribeye steak, black pepper sauce, butter-fried asparagus, and a fried egg.", 95000, "ribeye-bowl.jpg"),
  dish(10, "Main Dish", "Pan-Seared Salmon Rice Bowl", "Pan-seared salmon with lemon butter sauce. Served with rice and roasted vegetables.", 110000, "salmon-bowl.jpg"),
  dish(11, "Drink", "Passion Fruit Mojito", "Refreshing drink made with soda, fresh lime, mint leaves, and passion fruit juice.", 35000, "passion-mojito.jpg"),
  dish(12, "Drink", "Mocktail Sangria", "Grape juice mixed with soda, cinnamon, and fresh fruit slices like apple, orange, and strawberry.", 40000, "sangria.jpg"),
  dish(13, "Dessert", "Classic Tiramisu", "Soft Italian dessert made with Mascarpone cheese, rich Espresso coffee, and cocoa powder on top.", 45000, "tiramisu.jpg"),
  dish(14, "Dessert", "Strawberry Panna Cotta", "Smooth milk dessert topped with sweet and sour strawberry sauce.", 35000, "panna-cotta.jpg"),
];
