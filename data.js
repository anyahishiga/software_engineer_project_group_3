"use strict";
// Giá tính bằng VNĐ — sửa trực tiếp theo giá thật của quán
const S = (price) => [{ label: "Default", price }];
const SML = (a, b, c) => [{ label: "Small", price: a }, { label: "Medium", price: b }, { label: "Large", price: c }];
const MENU = [
  { id: 1, category: "Burgers & Wraps", name: "Classic Cheeseburger", emoji: "🟦", desc: "Beef patty, cheddar, lettuce, tomato, and...", sizes: S(260000) },
  { id: 2, category: "Burgers & Wraps", name: "Paneer Tikka Wrap", emoji: "🟦", desc: "Soft wrap with paneer tikka, onions, peppe...", sizes: S(240000) },
  { id: 3, category: "Drinks & Desserts", name: "Chocolate Brownie", emoji: "🟦", desc: "Warm chocolate brownie with rich...", sizes: S(140000) },
  { id: 4, category: "Drinks & Desserts", name: "Mango Smoothie", emoji: "🟦", desc: "Fresh mango smoothie with a...", sizes: [{ label: "Regular", price: 110000 }, { label: "Large", price: 145000 }] },
  { id: 5, category: "Pizza & Pasta", name: "Creamy Alfredo Pasta", emoji: "🟦", desc: "Penne pasta in creamy alfredo sauc...", sizes: SML(210000, 290000, 360000) },
  { id: 6, category: "Pizza & Pasta", name: "Margherita Pizza", emoji: "🟦", desc: "Classic tomato, mozzarella, and basi...", sizes: SML(200000, 275000, 350000) },
  { id: 7, category: "Rice Bowls", name: "Chicken Biryani Bowl", emoji: "🟦", desc: "Layered rice bowl with chicken, spices, and...", sizes: SML(225000, 300000, 375000) },
  { id: 8, category: "Rice Bowls", name: "Thai Basil Rice Bowl", emoji: "🟦", desc: "Fragrant basil rice bowl with vegetable...", sizes: SML(200000, 260000, 325000) },
  { id: 9, category: "Starters", name: "Crispy Veg Spring Rolls", emoji: "🟦", desc: "Crisp vegetable rolls served with sweet...", sizes: S(190000) },
  { id: 10, category: "Starters", name: "Garlic Bread", emoji: "🟦", desc: "Toasted bread with garlic butter and...", sizes: S(125000) },
  { id: 11, category: "Starters", name: "Loaded Nachos", emoji: "🟦", desc: "Tortilla chips layered with salsa, beans,...", sizes: S(210000) },
  { id: 12, category: "Starters", name: "Spicy Chicken Wings", emoji: "🟦", desc: "Juicy wings tossed in a bold house hot...", sizes: S(240000) },
].map(d => new MenuItem(d));
const CATEGORIES = ["Burgers & Wraps", "Drinks & Desserts", "Pizza & Pasta", "Rice Bowls", "Starters"];