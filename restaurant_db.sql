USE master;
GO

IF DB_ID('restaurant_db') IS NOT NULL
BEGIN
    ALTER DATABASE restaurant_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE restaurant_db;
END
GO

CREATE DATABASE restaurant_db;
GO

USE restaurant_db;
GO

CREATE TABLE users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('Admin','Staff','Customer')),
    status        VARCHAR(10)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Locked')),
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE categories (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL UNIQUE
);
GO

CREATE TABLE menu_items (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    category_id   INT           NOT NULL,
    name          NVARCHAR(100) NOT NULL,
    description   NVARCHAR(500) NOT NULL DEFAULT N'',
    image_url     NVARCHAR(255) NOT NULL DEFAULT N'',
    available     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES categories(id)
);
GO

CREATE TABLE menu_item_sizes (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    item_id       INT           NOT NULL,
    label         NVARCHAR(50)  NOT NULL,
    price         DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    sort_order    INT           NOT NULL DEFAULT 0,
    CONSTRAINT uq_item_size UNIQUE (item_id, label),
    CONSTRAINT fk_size_item FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);
GO

CREATE TABLE orders (
    id             INT           PRIMARY KEY,
    customer_name  NVARCHAR(100) NOT NULL,
    email          VARCHAR(100)  NOT NULL,
    phone          VARCHAR(20)   NOT NULL,
    address        NVARCHAR(500) NOT NULL DEFAULT N'',
    mode           VARCHAR(10)   NOT NULL CHECK (mode IN ('pickup','delivery')),
    sched_date     DATE          NOT NULL,
    sched_time     VARCHAR(5)    NOT NULL,
    subtotal       DECIMAL(12,2) NOT NULL,
    tax            DECIMAL(12,2) NOT NULL,
    total          DECIMAL(12,2) NOT NULL,
    payment        VARCHAR(10)   NOT NULL CHECK (payment IN ('bank','cash')),
    paid           BIT           NOT NULL DEFAULT 0,
    status         VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending','Confirmed','Cooking','Ready','Delivering','Completed','Rejected')),
    reject_reason  NVARCHAR(255) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT chk_sched_time CHECK (sched_time = 'ASAP' OR sched_time BETWEEN '10:00' AND '21:30'),
    CONSTRAINT chk_reject_reason CHECK (status <> 'Rejected' OR reject_reason IS NOT NULL)
);
GO

CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
GO

CREATE TABLE order_items (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    order_id      INT           NOT NULL,
    item_id       INT           NULL,
    item_name     NVARCHAR(100) NOT NULL,
    image_url     NVARCHAR(255) NOT NULL DEFAULT N'',
    size_label    NVARCHAR(50)  NOT NULL DEFAULT N'',
    qty           INT           NOT NULL CHECK (qty > 0),
    unit_price    DECIMAL(12,2) NOT NULL,
    line_total    AS (qty * unit_price) PERSISTED,
    note          NVARCHAR(255) NOT NULL DEFAULT N'',
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_item  FOREIGN KEY (item_id)  REFERENCES menu_items(id) ON DELETE SET NULL
);
GO

CREATE VIEW v_daily_revenue AS
SELECT CAST(created_at AS DATE) AS day,
       COUNT(*) AS num_orders,
       SUM(CASE WHEN paid = 1 THEN total ELSE 0 END) AS revenue,
       SUM(total) AS expected
FROM orders
WHERE status <> 'Rejected'
GROUP BY CAST(created_at AS DATE);
GO

CREATE VIEW v_daily_dish_stats AS
SELECT CAST(o.created_at AS DATE) AS day, oi.item_name, oi.size_label,
       SUM(oi.qty) AS qty_sold, SUM(oi.line_total) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status <> 'Rejected'
GROUP BY CAST(o.created_at AS DATE), oi.item_name, oi.size_label;
GO

INSERT INTO categories (name) VALUES
(N'Main Dish'), (N'Dessert'), (N'Pasta & Pizza'), (N'Starter'), (N'Drink');

INSERT INTO menu_items (category_id, name, description, image_url) VALUES
(1, N'Classic Cheeseburger',        N'Grilled beef patty, Cheddar cheese, pickles, lettuce and house sauce.', N'images/cheeseburger.jpg'),
(1, N'Ribeye Steak Rice Bowl',      N'Juicy ribeye, black pepper sauce, butter-fried asparagus and a fried egg.', N'images/ribeye-bowl.jpg'),
(1, N'Pan-Seared Salmon Rice Bowl', N'Pan-seared salmon with lemon butter sauce, rice and roasted vegetables.', N'images/salmon-bowl.jpg'),
(2, N'Strawberry Panna Cotta',      N'Silky milk dessert topped with sweet and sour strawberry sauce.', N'images/panna-cotta.jpg'),
(3, N'Creamy Alfredo Pasta',        N'Penne pasta, Parmesan and mushrooms in a rich cream sauce.', N'images/alfredo-pasta.jpg'),
(3, N'Margherita Pizza',            N'Tomato, fresh mozzarella, basil and extra virgin olive oil.', N'images/margherita-pizza.jpg'),
(4, N'Garden Burrata Salad',        N'Burrata, seasonal greens, tomato and a bright citrus dressing.', N'images/burrata-salad.jpg'),
(5, N'Tropical Mango Cooler',       N'Fresh mango, citrus, mint and sparkling water.', N'images/mango-cooler.jpg');

INSERT INTO menu_item_sizes (item_id, label, price) VALUES
(1, N'Default', 85000),
(2, N'Default', 95000),
(3, N'Default', 110000),
(4, N'Default', 35000),
(5, N'Default', 89000),
(6, N'Default', 99000),
(7, N'Default', 69000),
(8, N'Default', 42000);
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'restaurant_app')
    CREATE LOGIN restaurant_app WITH PASSWORD = 'Restaurant@123', CHECK_POLICY = OFF;
GO

CREATE USER restaurant_app FOR LOGIN restaurant_app;
ALTER ROLE db_datareader ADD MEMBER restaurant_app;
ALTER ROLE db_datawriter ADD MEMBER restaurant_app;
GO
