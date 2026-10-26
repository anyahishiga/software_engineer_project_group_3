# Restaurant Order Management System

## 1. Introduction

The Restaurant Order Management System is a project designed to support restaurant operations, including menu management, order processing, food preparation, and payment management.

The system aims to make ordering more convenient for customers and help restaurant staff manage orders more efficiently. It also allows administrators to manage menu items, employee accounts, user permissions, and restaurant reports.

## 2. Project Objectives

- Manage menu items, categories, prices, and availability.
- Allow customers to search for food, manage their shopping carts, and place orders.
- Track orders throughout confirmation, food preparation, and serving or delivery.
- Manage payments and store transaction information.
- Control access based on user roles.
- Support order tracking and revenue reporting.

## 3. Main Features

### 3.1. Customer Features

- View the menu and food details.
- Search for dishes by name or keyword.
- Browse dishes by category and sort them by price.
- Add items to the shopping cart, update quantities, or remove items.
- Place orders for dine-in, takeaway, or delivery.
- Track order status.
- Make payments and view order history.

### 3.2. Waiter Features

- View order lists and order details.
- Create orders for customers.
- Confirm or reject orders.
- Update serving and delivery statuses.

### 3.3. Kitchen Staff Features

- View the list of dishes that need to be prepared.
- Check item quantities and special notes.
- Update food preparation status, including pending, preparing, and completed.

### 3.4. Cashier Features

- View invoices and order totals.
- Record cash payments.
- Check online payment results.
- Review payment status for each order.

### 3.5. Administrator Features

- Add, update, and discontinue menu items.
- Manage food categories.
- Manage employee accounts and user roles.
- Update or lock employee accounts.
- Search for orders and view revenue reports.

## 4. Order Processing Workflow

The basic workflow of the system is as follows:

1. Customers browse the menu and select their dishes.
2. The system updates the shopping cart and calculates the subtotal.
3. Customers provide the required information and submit their orders.
4. The system validates order details and checks item availability.
5. Restaurant staff confirm or reject the orders.
6. Once an order is confirmed, kitchen staff receive the order details and prepare the food.
7. Staff update the serving or delivery status.
8. The system records payment information and updates the order status.
9. Restaurant managers can search for orders and review revenue reports.

The actual workflow may vary depending on the service type and payment method.

## 5. System Actors

| Actor | Description |
|---|---|
| Customer | Browses the menu, places orders, makes payments, and tracks orders. |
| Waiter | Creates and processes orders and updates serving statuses. |
| Kitchen Staff | Views food preparation requests and updates preparation statuses. |
| Cashier | Manages invoices and records payments. |
| Administrator | Manages menu items, employee accounts, permissions, and reports. |
| Payment Gateway | Processes online payment requests and returns transaction results. |

## 6. System Design

The project covers the following analysis and design components:

- Functional Requirements: Defines the main functions of the system.
- Non-Functional Requirements: Defines performance, security, usability, and reliability requirements.
- Data Flow Diagram (DFD): Describes data flows and system processes.
- Use Case Diagram: Represents system functions and interactions between actors and the system.
- Class Diagram: Describes the main business classes and their relationships.
- Data Model: Defines the database structure, tables, and relationships.
- Interface Design: Describes the interfaces for customers and restaurant staff.

## 7. Database Design

The proposed relational database includes the following main tables:

| Table | Description |
|---|---|
| Users | Stores user accounts, contact information, and roles. |
| Categories | Stores food categories. |
| MenuItems | Stores dish information, prices, and availability status. |
| Orders | Stores general order information. |
| OrderItems | Stores ordered dishes, quantities, unit prices, and line totals. |
| Payments | Stores payment methods, amounts, and transaction statuses. |
| DeliveryInfo | Stores delivery information for delivery orders. |
| OrderStatusHistory | Stores the history of order status changes. |

Primary keys and foreign keys are used to maintain relationships and data consistency.

The unit price of each item is stored in the order details at the time the order is placed. This ensures that historical order totals remain unchanged when menu prices are updated.

## 8. Non-Functional Requirements

The system is expected to meet the following requirements:

- **Performance:** Common operations should respond within a target of three seconds under the expected workload.
- **Security:** The system should authenticate users, enforce role-based access control, and protect account information.
- **Usability:** The interface should be clear and easy to use on both computers and mobile devices.
- **Data Integrity:** Order, order detail, and payment records should remain consistent.
- **Compatibility:** The system should support common web browsers.
- **Maintainability:** The system should be organized into clear components to make future updates easier.

## 9. Project Scope

The project focuses on the main operations of restaurant order management, including menu management, order placement, order processing, payment management, user account management, and reporting.

Online payment integration will depend on the selected payment provider and the actual implementation.

## 10. Future Improvements

The system may be extended with additional features in the future, such as:

- Ingredient and inventory management.
- Promotions and discount codes.
- Notifications when order statuses change.
- Reports on the most frequently ordered dishes.
- Improved user interfaces for mobile devices.
- Additional payment methods and delivery service integrations.

## 11. Project Status

The project is currently in the requirements analysis and system design stage. The system features, database model, and user interfaces will be refined during the development process.

---

**Project Name:** Restaurant Order Management System

**Document Version:** 1.0

**Last Updated:** October 26, 2026
