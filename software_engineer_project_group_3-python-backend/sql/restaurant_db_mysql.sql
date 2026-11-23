
CREATE DATABASE restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_db;

CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('Admin','Staff','Customer')),
    status        VARCHAR(10)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Locked')),
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    full_name     VARCHAR(100)  NULL,
    phone         VARCHAR(20)   NULL,
    email         VARCHAR(100)  NULL
);

CREATE TABLE categories (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL UNIQUE,
    description   TEXT          NULL,
    status        VARCHAR(20)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive'))
);

CREATE TABLE menu_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    category_id   INT           NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    description   VARCHAR(500)  NOT NULL DEFAULT '',
    image_url     VARCHAR(255)  NOT NULL DEFAULT '',
    available     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
   
    user_id         INT           NULL,
   
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_fee    DECIMAL(12,2) NOT NULL DEFAULT 0,
    note            VARCHAR(500)  NOT NULL DEFAULT '',
 
    paid_at         DATETIME      NULL,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
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


CREATE TABLE order_status_history (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT           NOT NULL,
    old_status    VARCHAR(20)   NULL,            -- NULL ở dòng đầu tiên (lúc tạo đơn)
    new_status    VARCHAR(20)   NOT NULL,
    changed_by    VARCHAR(50)   NULL,           
    changed_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note          VARCHAR(255)  NULL,            
    CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_osh_order ON order_status_history(order_id);

CREATE TRIGGER trg_orders_ai_history
AFTER INSERT ON orders
FOR EACH ROW
INSERT INTO order_status_history (order_id, old_status, new_status, note)
VALUES (NEW.id, NULL, NEW.status, NULL);


CREATE TRIGGER trg_orders_au_history
AFTER UPDATE ON orders
FOR EACH ROW
INSERT INTO order_status_history (order_id, old_status, new_status, note)
SELECT NEW.id, OLD.status, NEW.status, NEW.reject_reason
FROM DUAL
WHERE NOT (NEW.status <=> OLD.status);

CREATE TRIGGER trg_orders_bi_paid_at
BEFORE INSERT ON orders
FOR EACH ROW
SET NEW.paid_at = IF(NEW.paid = 1 AND NEW.paid_at IS NULL, NOW(), NEW.paid_at);

CREATE TRIGGER trg_orders_bu_paid_at
BEFORE UPDATE ON orders
FOR EACH ROW
SET NEW.paid_at = IF(NEW.paid = 1 AND OLD.paid = 0 AND NEW.paid_at IS NULL, NOW(), NEW.paid_at);


CREATE VIEW v_daily_revenue AS
SELECT d.day,
       COALESCE(o.num_orders, 0) AS num_orders,
       COALESCE(p.revenue, 0)    AS revenue,
       COALESCE(o.expected, 0)   AS expected
FROM (SELECT DATE(created_at) AS day FROM orders
      UNION
      SELECT DATE(paid_at) FROM orders WHERE paid_at IS NOT NULL) d
LEFT JOIN (SELECT DATE(created_at) AS day, COUNT(*) AS num_orders, SUM(total) AS expected
           FROM orders
           WHERE status <> 'Rejected'
           GROUP BY DATE(created_at)) o ON o.day = d.day
LEFT JOIN (SELECT DATE(paid_at) AS day, SUM(total) AS revenue
           FROM orders
           WHERE paid = 1 AND paid_at IS NOT NULL AND status <> 'Rejected'
           GROUP BY DATE(paid_at)) p ON p.day = d.day;

CREATE VIEW v_daily_dish_stats AS
SELECT DATE(o.created_at) AS day, oi.item_name, oi.size_label,
       SUM(oi.qty) AS qty_sold, SUM(oi.line_total) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status <> 'Rejected'
GROUP BY DATE(o.created_at), oi.item_name, oi.size_label;

-- [CHANGED] 5 danh mục theo đặc tả V.SD 1.2.3 (cũ: Main Dish, Dessert, Pasta & Pizza, Starter, Drink)
INSERT INTO categories (name, description) VALUES
('Burgers & Wraps',   'Burgers, wraps and sandwiches'),
('Rice Bowls',        'Rice bowls with steak, salmon and more'),
('Drinks & Desserts', 'Refreshing drinks and sweet desserts'),
('Pizza & Pasta',     'Pizza and pasta made to order'),
('Starters',          'Salads and light starters');

-- [CHANGED] category_id đổi theo 5 danh mục mới ở trên
INSERT INTO menu_items (category_id, name, description, image_url) VALUES
(1, 'Classic Cheeseburger',        'Grilled beef patty, Cheddar cheese, pickles, lettuce and house sauce.', 'images/cheeseburger.jpg'),
(2, 'Ribeye Steak Rice Bowl',      'Juicy ribeye, black pepper sauce, butter-fried asparagus and a fried egg.', 'images/ribeye-bowl.jpg'),
(2, 'Pan-Seared Salmon Rice Bowl', 'Pan-seared salmon with lemon butter sauce, rice and roasted vegetables.', 'images/salmon-bowl.jpg'),
(3, 'Strawberry Panna Cotta',      'Silky milk dessert topped with sweet and sour strawberry sauce.', 'images/panna-cotta.jpg'),
(4, 'Creamy Alfredo Pasta',        'Penne pasta, Parmesan and mushrooms in a rich cream sauce.', 'images/alfredo-pasta.jpg'),
(4, 'Margherita Pizza',            'Tomato, fresh mozzarella, basil and extra virgin olive oil.', 'images/margherita-pizza.jpg'),
(5, 'Garden Burrata Salad',        'Burrata, seasonal greens, tomato and a bright citrus dressing.', 'images/burrata-salad.jpg'),
(3, 'Tropical Mango Cooler',       'Fresh mango, citrus, mint and sparkling water.', 'images/mango-cooler.jpg');

INSERT INTO menu_item_sizes (item_id, label, price) VALUES
(1, 'Default', 85000),
(2, 'Default', 95000),
(3, 'Default', 110000),
(4, 'Default', 35000),
(5, 'Default', 89000),
(6, 'Default', 99000),
(7, 'Default', 69000),
(8, 'Default', 42000);


CREATE VIEW v_payment AS
SELECT o.id                                         AS payment_id,      -- mỗi đơn có tối đa 1 thanh toán nên dùng mã đơn
       o.id                                         AS order_id,
       CASE o.payment WHEN 'bank' THEN 'VietQR' ELSE 'Cash' END AS payment_method,
       o.total                                      AS amount,
       CASE WHEN o.paid = 1 THEN 'Paid' ELSE 'Unpaid' END       AS payment_status,
       CAST(NULL AS CHAR(100))                      AS transaction_reference,  -- chưa lưu mã giao dịch ngân hàng
       o.paid_at,
       o.created_at
FROM orders o;

CREATE VIEW v_delivery_info AS
SELECT o.id            AS delivery_id,
       o.id            AS order_id,
       o.customer_name AS recipient_name,
       o.address       AS delivery_address,
       o.note          AS delivery_note
FROM orders o
WHERE o.mode = 'delivery';                        


CREATE VIEW erd_users AS
SELECT CAST(user_id AS CHAR(50)) AS userID,
       role,
       username,
       password_hash             AS `password`,
       full_name                 AS `name`,
       phone,
       email,
       status,
       created_at
FROM users;

CREATE VIEW erd_categories AS
SELECT CAST(id AS CHAR(50)) AS cateID,
       name,
       description,
       status
FROM categories;

CREATE VIEW erd_menu_items AS
SELECT CAST(mi.id AS CHAR(50))          AS menuitemID,
       CAST(mi.category_id AS CHAR(50)) AS categoryID,
       mi.name,
       mi.description,
       (SELECT GROUP_CONCAT(s.label ORDER BY s.sort_order, s.id SEPARATOR ', ')
          FROM menu_item_sizes s WHERE s.item_id = mi.id) AS sizes,   -- các size gộp thành 1 chuỗi
       mi.image_url,
       (SELECT MIN(s.price)
          FROM menu_item_sizes s WHERE s.item_id = mi.id) AS price,   -- món nhiều size: lấy giá thấp nhất
       mi.available
FROM menu_items mi;

CREATE VIEW erd_orders AS
SELECT CAST(id AS CHAR(50))      AS orderID,
       CAST(user_id AS CHAR(50)) AS userID,
       CASE mode WHEN 'pickup' THEN 'Pickup' ELSE 'Delivery' END AS `type`,
       CONCAT(DATE_FORMAT(sched_date, '%d.%m.%Y'), ' ', sched_time) AS `schedule`,
       tax,
       address,
       total,
       CASE payment WHEN 'bank' THEN 'VietQR' ELSE 'Cash' END AS payment,
       CASE WHEN status IN ('Confirmed','Cooking','Ready','Delivering') THEN 'Processing'
            WHEN status = 'Rejected' THEN 'Cancelled'
            ELSE status END      AS status,                -- Pending / Processing / Completed / Cancelled như ERD
       created_at,
       customer_name,
       phone                     AS customer_phone,
       reject_reason
FROM orders;

CREATE VIEW erd_order_items AS
SELECT CAST(id AS CHAR(50))       AS orderItemID,
       CAST(order_id AS CHAR(50)) AS orderID,
       CAST(item_id AS CHAR(50))  AS menuitemID,
       size_label                 AS `size`,
       qty,
       unit_price                 AS price,
       note
FROM order_items;

CREATE USER IF NOT EXISTS 'restaurant_app'@'%' IDENTIFIED BY 'Restaurant@123';
GRANT SELECT, INSERT, UPDATE, DELETE ON restaurant_db.* TO 'restaurant_app'@'%';
FLUSH PRIVILEGES;