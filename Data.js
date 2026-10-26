
"use strict";

// Add menu items here. Categories are generated in the order they first appear.
const MENU = [
  {
    id: 1,
    category: "Burgers & Wraps",
    name: "Classic Cheeseburger",
    emoji: "🟦",
    desc: "Beef patty, cheddar, lettuce, tomato, and...",
    sizes: [
      { label: "Default", price: 10.50 },
    ],
  },
  {
    id: 2,
    category: "Burgers & Wraps",
    name: "Paneer Tikka Wrap",
    emoji: "🟦",
    desc: "Soft wrap with paneer tikka, onions, peppe...",
    sizes: [
      { label: "Default", price: 9.50 },
    ],
  },
  {
    id: 3,
    category: "Drinks & Desserts",
    name: "Chocolate Brownie",
    emoji: "🟦",
    desc: "Warm chocolate brownie with rich...",
    sizes: [
      { label: "Default", price: 5.50 },
    ],
  },
  {
    id: 4,
    category: "Drinks & Desserts",
    name: "Mango Smoothie",
    emoji: "🟦",
    desc: "Fresh mango smoothie with a...",
    sizes: [
      { label: "Regular", price: 4.50 },
      { label: "Large", price: 5.75 },
    ],
  },
  {
    id: 5,
    category: "Pizza & Pasta",
    name: "Creamy Alfredo Pasta",
    emoji: "🟦",
    desc: "Penne pasta in creamy alfredo sauc...",
    sizes: [
      { label: "Small", price: 8.50 },
      { label: "Medium", price: 11.50 },
      { label: "Large", price: 14.50 },
    ],
  },
  {
    id: 6,
    category: "Pizza & Pasta",
    name: "Margherita Pizza",
    emoji: "🟦",
    desc: "Classic tomato, mozzarella, and basi...",
    sizes: [
      { label: "Small", price: 8.00 },
      { label: "Medium", price: 11.00 },
      { label: "Large", price: 14.00 },
    ],
  },
  {
    id: 7,
    category: "Rice Bowls",
    name: "Chicken Biryani Bowl",
    emoji: "🟦",
    desc: "Layered rice bowl with chicken, spices, and...",
    sizes: [
      { label: "Small", price: 9.00 },
      { label: "Medium", price: 12.00 },
      { label: "Large", price: 15.00 },
    ],
  },
  {
    id: 8,
    category: "Rice Bowls",
    name: "Thai Basil Rice Bowl",
    emoji: "🟦",
    desc: "Fragrant basil rice bowl with vegetable...",
    sizes: [
      { label: "Small", price: 8.00 },
      { label: "Medium", price: 10.50 },
      { label: "Large", price: 13.00 },
    ],
  },
  {
    id: 9,
    category: "Starters",
    name: "Crispy Veg Spring Rolls",
    emoji: "🟦",
    desc: "Crisp vegetable rolls served with sweet...",
    sizes: [
      { label: "Default", price: 7.50 },
    ],
  },
  {
    id: 10,
    category: "Starters",
    name: "Garlic Bread",
    emoji: "🟦",
    desc: "Toasted bread with garlic butter and...",
    sizes: [
      { label: "Default", price: 5.00 },
    ],
  },
  {
    id: 11,
    category: "Starters",
    name: "Loaded Nachos",
    emoji: "🟦",
    desc: "Tortilla chips layered with salsa, beans,...",
    sizes: [
      { label: "Default", price: 8.50 },
    ],
  },
  {
    id: 12,
    category: "Starters",
    name: "Spicy Chicken Wings",
    emoji: "🟦",
    desc: "Juicy wings tossed in a bold house hot...",
    sizes: [
      { label: "Default", price: 9.50 },
    ],
  },
].map(item => new MenuItem(item));

const CATEGORIES = [...new Set(MENU.map(item => item.category))];
