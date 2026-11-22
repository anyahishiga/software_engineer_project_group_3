DROP DATABASE IF EXISTS restaurant_db;
CREATE DATABASE restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_db;

CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('Admin','Staff','Customer')),
    status        VARCHAR(10)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Locked')),
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL UNIQUE
);

CREATE TABLE menu_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    category_id   INT           NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    description   VARCHAR(500)  NOT NULL DEFAULT '',
    image_url     VARCHAR(255)  NOT NULL DEFAULT '',
    available     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE menu_item_sizes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    item_id       INT           NOT NULL,
    label         VARCHAR(50)   NOT NULL,
    price         DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    sort_order    INT           NOT NULL DEFAULT 0,
    CONSTRAINT uq_item_size UNIQUE (item_id, label),
    CONSTRAINT fk_size_item FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id             INT           AUTO_INCREMENT PRIMARY KEY,
    customer_name  VARCHAR(100)  NOT NULL,
    email          VARCHAR(100)  NOT NULL,
    phone          VARCHAR(20)   NOT NULL,
    address        VARCHAR(500)  NOT NULL DEFAULT '',
    mode           VARCHAR(10)   NOT NULL CHECK (mode IN ('pickup','delivery')),
    sched_date     DATE          NOT NULL,
    sched_time     VARCHAR(5)    NOT NULL,
    subtotal       DECIMAL(12,2) NOT NULL,
    tax            DECIMAL(12,2) NOT NULL,
    total          DECIMAL(12,2) NOT NULL,
    payment        VARCHAR(10)   NOT NULL CHECK (payment IN ('bank','cash')),
    paid           TINYINT(1)    NOT NULL DEFAULT 0,
    status         VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending','Confirmed','Cooking','Ready','Delivering','Completed','Rejected')),
    reject_reason  VARCHAR(255)  NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sched_time CHECK (sched_time = 'ASAP' OR sched_time BETWEEN '10:00' AND '21:30'),
    CONSTRAINT chk_reject_reason CHECK (status <> 'Rejected' OR reject_reason IS NOT NULL)
) AUTO_INCREMENT = 1001;

CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

CREATE TABLE order_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT           NOT NULL,
    item_id       INT           NULL,
    item_name     VARCHAR(100)  NOT NULL,
    image_url     VARCHAR(255)  NOT NULL DEFAULT '',
    size_label    VARCHAR(50)   NOT NULL DEFAULT '',
    qty           INT           NOT NULL CHECK (qty > 0),
    unit_price    DECIMAL(12,2) NOT NULL,
    line_total    DECIMAL(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
    note          VARCHAR(255)  NOT NULL DEFAULT '',
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_item  FOREIGN KEY (item_id)  REFERENCES menu_items(id) ON DELETE SET NULL
);

CREATE VIEW v_daily_revenue AS
SELECT DATE(created_at) AS day,
       COUNT(*) AS num_orders,
       SUM(CASE WHEN paid = 1 THEN total ELSE 0 END) AS revenue,
       SUM(total) AS expected
FROM orders
WHERE status <> 'Rejected'
GROUP BY DATE(created_at);

CREATE VIEW v_daily_dish_stats AS
SELECT DATE(o.created_at) AS day, oi.item_name, oi.size_label,
       SUM(oi.qty) AS qty_sold, SUM(oi.line_total) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status <> 'Rejected'
GROUP BY DATE(o.created_at), oi.item_name, oi.size_label;

INSERT INTO categories (name) VALUES
('Main Dish'), ('Dessert'), ('Pasta & Pizza'), ('Starter'), ('Drink');

INSERT INTO menu_items (category_id, name, description, image_url) VALUES
(1, 'Classic Cheeseburger',        'Grilled beef patty, Cheddar cheese, pickles, lettuce and house sauce.', 'images/cheeseburger.jpg'),
(1, 'Ribeye Steak Rice Bowl',      'Juicy ribeye, black pepper sauce, butter-fried asparagus and a fried egg.', 'images/ribeye-bowl.jpg'),
(1, 'Pan-Seared Salmon Rice Bowl', 'Pan-seared salmon with lemon butter sauce, rice and roasted vegetables.', 'images/salmon-bowl.jpg'),
(2, 'Strawberry Panna Cotta',      'Silky milk dessert topped with sweet and sour strawberry sauce.', 'images/panna-cotta.jpg'),
(3, 'Creamy Alfredo Pasta',        'Penne pasta, Parmesan and mushrooms in a rich cream sauce.', 'images/alfredo-pasta.jpg'),
(3, 'Margherita Pizza',            'Tomato, fresh mozzarella, basil and extra virgin olive oil.', 'images/margherita-pizza.jpg'),
(4, 'Garden Burrata Salad',        'Burrata, seasonal greens, tomato and a bright citrus dressing.', 'images/burrata-salad.jpg'),
(5, 'Tropical Mango Cooler',       'Fresh mango, citrus, mint and sparkling water.', 'images/mango-cooler.jpg');

INSERT INTO menu_item_sizes (item_id, label, price) VALUES
(1, 'Default', 85000),
(2, 'Default', 95000),
(3, 'Default', 110000),
(4, 'Default', 35000),
(5, 'Default', 89000),
(6, 'Default', 99000),
(7, 'Default', 69000),
(8, 'Default', 42000);

CREATE USER IF NOT EXISTS 'restaurant_app'@'%' IDENTIFIED BY 'Restaurant@123';
GRANT SELECT, INSERT, UPDATE, DELETE ON restaurant_db.* TO 'restaurant_app'@'%';
FLUSH PRIVILEGES;