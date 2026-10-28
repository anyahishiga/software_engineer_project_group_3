# Restaurant Order Management System (ROMS)

**Version:** 1.1  
**Last Updated:** October 28, 2026

## 1. Overview

The **Restaurant Order Management System (ROMS)** is a web-based application designed to simplify restaurant operations by allowing customers to browse menus, customize food orders, manage shopping carts, schedule pickups or deliveries, and complete payments.

The system also provides order tracking, customer order history, menu administration, and user role management to support restaurant staff and administrators.

## 2. Features

### 2.1. Menu Browsing and Search

- Display food items with names, descriptions, categories, sizes, prices, and images.
- Organize menu items into categories:
  - Burgers & Wraps
  - Drinks & Desserts
  - Pizza & Pasta
  - Rice Bowls
  - Starters
- Search for food items by keyword.
- Display available items for ordering.

### 2.2. Shopping Cart

- Add food items to the shopping cart.
- Select item sizes when multiple sizes and prices are available.
- Increase or decrease item quantities.
- Add special instructions to individual items.
- Edit or remove items from the cart.
- Review selected items before checkout.

### 2.3. Order Placement and Scheduling

- Place orders through the checkout process.
- Choose between **Pickup** and **Delivery**.
- Schedule an order by selecting a date and time.
- Support scheduled orders between 10:00 AM and 9:30 PM, as configured by the system.
- Collect customer information, including first name, email, and phone number.
- Collect billing address and require acceptance of the terms and conditions.
- Calculate order totals, taxes, and item prices.
- Generate a unique order number for order identification and tracking.

### 2.4. Customer Dashboard and Order Management

- Allow customers to view their order history.
- Display order numbers, customer names, item quantities, order types, scheduled times, payment methods, payment statuses, and total amounts.
- Allow staff to review incoming orders and accept or reject them.
- Allow kitchen staff to update food preparation statuses.

### 2.5. Payment and Invoicing

The system supports two payment methods:

- **VietQR Bank Transfer:** Generate a QR code containing the configured bank account information, exact payment amount, and order-specific transfer reference (e.g., `RP1001`).
- **Cash Payment:** Record the payment as unpaid until the customer pays upon receiving the order.

Customers can scan the VietQR code using a supported banking application or e-wallet.

### 2.6. Menu Administration

Administrators can:

- Add, update, and discontinue menu items.
- Manage food categories.
- Update item names, descriptions, images, and prices.

### 2.7. User Account and Role Management

- Allow customers to create an account during checkout.
- Support three user roles: Customer, Employee, and Administrator.
- Allow administrators to create, update, and deactivate employee accounts.
- Apply role-based access to system functions.

## 3. User Roles

| Role | Responsibilities |
|---|---|
| Customer | Browse menus, manage the cart, place orders, make payments, and view order history. |
| Employee | Review incoming orders, accept or reject orders, and update order processing statuses according to assigned responsibilities. |
| Administrator | Manage menus, categories, and employee accounts, and access authorized administrative functions. |

## 4. Non-Functional Requirements

### Performance
- Target a response time of no more than 3 seconds for ordinary operations.
- Display toast notifications for success and error messages.
- Automatically dismiss toast notifications after approximately 2.2 seconds.
- Navigate between major screens without reloading the entire page where supported by the implementation.

### Security
- Protect customer information and transaction data against unauthorized access.
- Validate required fields and email formats before processing checkout submissions.
- Restrict administrative functions according to user roles.

### Usability and Compatibility
- Use a grid-based layout to display food items.
- Provide a responsive interface for desktop and mobile devices.
- Use clear modals for item customization, ordering, and scheduling.

### Maintainability
- Organize application logic into separate functional modules.
- Separate business logic, data, views, modals, and application control.
- Follow object-oriented programming principles where appropriate.

## 5. Project Structure

The application is intended to separate its main responsibilities into the following modules:

```text
Restaurant-Order-Management-System/
├── index.html
├── css/
│   └── style.css
├── javascript/
│   ├── Models.js
│   ├── Data.js
│   ├── Views.js
│   ├── Modals.js
│   └── App.js
└── README.md
```

*Note: Update this structure to match the actual repository if your folders or filenames differ.*

| File | Responsibility |
|---|---|
| `index.html` | Main application page and HTML structure. |
| `style.css` | Styling, responsive layout, and visual components. |
| `Models.js` | Business models and application data structures. |
| `Data.js` | Menu data, categories, and related data definitions. |
| `Views.js` | Rendering and updating user interface components. |
| `Modals.js` | Modal dialogs for item details, editing, and checkout interactions. |
| `App.js` | Main application logic and event handling. |

## 6. Installation and Usage

### Prerequisites

- A modern web browser.
- A code editor such as Visual Studio Code.
- A local development server, such as the Live Server extension for Visual Studio Code, if required by the project's module loading configuration.

### Getting Started

1. Clone or download the repository.
2. Open the project folder in Visual Studio Code.
3. Verify that the project files and directory structure are correct.
4. Start the project using Live Server or another suitable local web server.
5. Open the local URL provided by the server in your browser.

For a simple static version without module-loading requirements, opening `index.html` directly may also work.

## 7. Payment Configuration

VietQR payments require valid bank account configuration, including the bank identifier, account number, and transfer reference format.

Before using the system for real transactions:

- Configure the correct bank account information.
- Verify that the generated QR code contains the correct amount and transfer reference.
- Implement payment verification before marking bank transfers as paid.
- Do not store banking credentials or other secrets directly in publicly accessible source files.

## 8. Current Scope and Limitations

This README describes the system's intended functionality based on version 1.1 of the requirements specification.

Actual capabilities depend on the implemented source code. Features such as persistent database storage, authentication, authorization, payment gateway integration, and automatic bank transfer verification should not be considered production-ready unless they have been implemented and tested.

## 9. Future Improvements

Potential enhancements include:

- Database integration for persistent menu, user, and order data.
- Real-time order status updates.
- Automated payment verification.
- Sales reports and order statistics for administrators.
- Inventory management and low-stock notifications.
- Improved authentication and access control.

## 10. Authors

- Kiệt
- Phát
- Huy

---

**Project:** Restaurant Order Management System  
**Version:** 1.1  
**Documentation Date:** October 28, 2026
