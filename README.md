# 🍽️ Restaurant Order Management System — Group 03

Hệ thống đặt món trực tuyến và quản lý đơn hàng cho nhà hàng: khách xem thực đơn và đặt món (không cần đăng nhập), nhân viên xử lý đơn trong bếp, quản trị viên quản lý thực đơn, tài khoản nhân viên và xem báo cáo doanh thu.

![Trang chủ](docs/images/ui-home.jpg)

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vai trò người dùng](#2-vai-trò-người-dùng)
3. [Yêu cầu chức năng](#3-yêu-cầu-chức-năng)
4. [Yêu cầu phi chức năng](#4-yêu-cầu-phi-chức-năng)
5. [Sơ đồ luồng dữ liệu (DFD)](#5-sơ-đồ-luồng-dữ-liệu-dfd)
6. [Use Case](#6-use-case)
7. [Class Diagram](#7-class-diagram)
8. [Mô hình dữ liệu](#8-mô-hình-dữ-liệu)
9. [Thiết kế giao diện](#9-thiết-kế-giao-diện)
10. [Cấu trúc mã nguồn](#10-cấu-trúc-mã-nguồn)
11. [Thành viên nhóm](#11-thành-viên-nhóm)

---

## 1. Tổng quan

| Hạng mục | Nội dung |
|---|---|
| Loại ứng dụng | Single Page Application (SPA), không tải lại trang khi chuyển màn hình |
| Thực đơn | Món Á – Âu, chia theo danh mục: Main Dish, Dessert, Pasta & Pizza, Starter, Drink |
| Hình thức nhận món | Pickup (đến lấy) hoặc Delivery (giao hàng), có thể hẹn ngày giờ |
| Thanh toán | Tiền mặt hoặc chuyển khoản VietQR |
| Giờ mở cửa | 10:00 – 22:30 hằng ngày (theo giao diện) |
| Thuế | 10% (giá hiển thị chưa gồm thuế) |
| Đơn vị tiền tệ | VND (₫) |

## 2. Vai trò người dùng

| Vai trò | Quyền hạn |
|---|---|
| **Customer** (khách) | Xem/tìm món, quản lý giỏ hàng, đặt món, thanh toán, theo dõi đơn. Không cần đăng nhập. |
| **Staff** (nhân viên) | Đăng nhập; xem Staff Dashboard; xác nhận/từ chối đơn; cập nhật trạng thái chế biến. |
| **Admin** (quản trị) | Có toàn bộ quyền của Staff, cộng thêm: quản lý thực đơn, quản lý tài khoản nhân viên, xem thống kê doanh thu. |
| **Payment Gateway** | Tác nhân bên ngoài xử lý chuyển khoản VietQR. |

Khi mở website, hệ thống hiển thị màn hình chào với hai lựa chọn **Customer** và **Staff**. Chọn Staff sẽ yêu cầu tên đăng nhập và mật khẩu, sau đó chuyển tới giao diện Staff hoặc Admin tương ứng.

![Đăng nhập nhân viên](docs/images/ui-staff-login.png)

## 3. Yêu cầu chức năng

### 3.1 Truy cập hệ thống và chọn vai trò

| ID | Mô tả |
|---|---|
| SA.RS 1.1.1 | Hiển thị màn hình chào với hai lựa chọn "Customer" và "Staff". |
| SA.RS 1.1.2 | Chọn "Customer": vào thẳng giao diện xem thực đơn và đặt món, không cần đăng nhập. |
| SA.RS 1.1.3 | Chọn "Staff": yêu cầu Username/Password, phân quyền theo tài khoản và đưa tới giao diện Staff hoặc Admin. |

### 3.2 Xem và tìm kiếm món

| ID | Mô tả |
|---|---|
| V.SD 1.2.1 | Khách xem được danh sách món của nhà hàng. |
| V.SD 1.2.2 | Mỗi món gồm: tên, danh mục, mô tả chi tiết, size và giá bán. |
| V.SD 1.2.3 | Duyệt món theo tab danh mục. |
| V.SD 1.2.4 | Tìm nhanh bằng thanh tìm kiếm; hệ thống lọc theo từ khóa. |
| V.SD 1.2.5 | Chỉ cho phép đặt các món đang phục vụ và còn hàng. |

### 3.3 Chọn món và giỏ hàng

| ID | Mô tả |
|---|---|
| SD.MC 1.3.1 | Chọn món và thêm vào giỏ qua hộp thoại chi tiết (modal). |
| SD.MC 1.3.2 | Bắt buộc chọn Size nếu món có nhiều mức giá (Small, Medium, Large). |
| SD.MC 1.3.3 | Tăng/giảm số lượng bằng nút +/−. |
| SD.MC 1.3.4 | Thêm ghi chú đặc biệt cho từng món (ví dụ "no lettuce"). |
| SD.MC 1.3.5 | Xem giỏ, sửa (Edit) hoặc xóa (Remove) món. |

### 3.4 Đặt hàng và hẹn giờ

| ID | Mô tả |
|---|---|
| PO.S 1.4.1 | Đặt hàng (Checkout) sau khi chọn món. |
| PO.S 1.4.2 | Chọn Pickup hoặc Delivery. |
| PO.S 1.4.3 | Hẹn ngày và giờ nhận trong khung 10:00 – 21:30, hoặc nhận ngay (ASAP). |
| PO.S 1.4.4 | Bắt buộc nhập Email, Số điện thoại, Tên (First name). |
| PO.S 1.4.5 | Thông tin thanh toán: bắt buộc có địa chỉ và đồng ý Terms & Conditions. |
| PO.S 1.4.6 | Ghi lại danh sách món, số lượng, đơn giá, tổng tiền, thuế và thời điểm tạo đơn. |
| PO.S 1.4.7 | Sinh mã đơn duy nhất, tăng dần (ví dụ 1001, 1002). |

### 3.5 Customer Dashboard

| ID | Mô tả |
|---|---|
| CD 1.5.1 | Có Customer Dashboard (Guest Order Tracking) để theo dõi lịch sử đơn. |
| CD 1.5.2 | Hiển thị: Order ID, tên khách, số món, loại đơn, giờ nhận, phương thức thanh toán (kèm trạng thái), tổng tiền. |

### 3.6 Staff Dashboard và xử lý đơn

| ID | Mô tả |
|---|---|
| SD.OM 1.6.1 | Sau khi đăng nhập, nhân viên chỉ thấy Staff Dashboard; ẩn hoàn toàn chức năng đặt món. |
| SD.OM 1.6.2 | Xem danh sách đơn để xác nhận hoặc từ chối; từ chối phải ghi lý do. |
| SD.OM 1.6.3 | Liệt kê chi tiết các món cần chế biến và hiển thị rõ Pickup hay Delivery. |
| SD.OM 1.6.4 | Bếp cập nhật trạng thái chế biến (đang làm, xong). |
| SD.OM 1.6.5 | Tự động sắp xếp ưu tiên theo khung giờ nhận. |

### 3.7 Thanh toán và hóa đơn

| ID | Mô tả |
|---|---|
| P.I 1.7.1 | Tính tổng đơn từ số lượng, đơn giá và thuế. |
| P.I 1.7.2 | Hỗ trợ hai phương thức: "Bank transfer (VietQR)" và "Cash payment". |
| P.I 1.7.3 | Chọn tiền mặt: trạng thái "Unpaid", hướng dẫn khách trả khi nhận món. |
| P.I 1.7.4 | Chọn chuyển khoản: tự sinh mã VietQR chứa thông tin tài khoản, số tiền chính xác và cú pháp nội dung chuyển khoản (ví dụ RP1001). |
| P.I 1.7.5 | Khách quét QR bằng app ngân hàng hoặc ví điện tử để hoàn tất. |

### 3.8 Quản lý thực đơn (Admin)

| ID | Mô tả |
|---|---|
| MM 1.8.1 | Quản lý danh mục món. |
| MM 1.8.2 | Cập nhật tên, mô tả, hình ảnh và giá bán của món. |

### 3.9 Tài khoản và phân quyền

| ID | Mô tả |
|---|---|
| AM.P 1.9.1 | Phân quyền theo vai trò (Customer, Staff, Admin). |
| AM.P 1.9.2 | Admin tạo, cập nhật và khóa tài khoản nhân viên. |

### 3.10 Thống kê và doanh thu (Admin)

| ID | Mô tả |
|---|---|
| S.RM 1.10.1 | Phải đăng nhập bằng tài khoản Admin để vào khu thống kê. |
| S.RM 1.10.2 | Báo cáo doanh thu: tổng doanh thu thu được trong ngày. |
| S.RM 1.10.3 | Thống kê món: số lượng từng món đã bán/đặt trong ngày, giúp theo dõi nguyên liệu tiêu hao. |

## 4. Yêu cầu phi chức năng

### 4.1 Hiệu năng và tương tác

| ID | Mô tả |
|---|---|
| P.I 2.1.1 | Phản hồi thao tác thông thường trong tối đa 3 giây. |
| P.I 2.1.2 | Dùng thông báo nổi (Toast) cho thành công/lỗi, tự ẩn sau 2.2 giây. |
| P.I 2.1.3 | Chuyển màn hình (Order, Cart, Checkout, Dashboard) mượt, không tải lại trang. |
| P.I 2.1.4 | Staff Dashboard tự cập nhật/làm mới liên tục để bếp không bỏ sót đơn gấp. |

### 4.2 Bảo mật

| ID | Mô tả |
|---|---|
| SEC 2.2.1 | **RBAC**: phân quyền chặt theo vai trò; các route Staff/Admin không truy cập được bằng cách sửa URL khi chưa xác thực. |
| SEC 2.2.2 | **Băm mật khẩu**: không lưu hoặc truyền mật khẩu dạng thô; dùng hàm băm mạnh (bcrypt hoặc SHA-256 có salt). |
| SEC 2.2.3 | **Kiểm tra dữ liệu đầu vào** ở cả client và server (email, số điện thoại, tên, địa chỉ). |
| SEC 2.2.4 | **Chống XSS**: escape và làm sạch mọi văn bản người dùng nhập (tên, địa chỉ, ghi chú món) trước khi render. |
| SEC 2.2.5 | **Toàn vẹn giao dịch**: tổng tiền, thuế, đơn giá được tính lại và xác minh phía server hoặc trạng thái an toàn, chống sửa giá qua DevTools/localStorage. |
| SEC 2.2.6 | **Bảo mật mã VietQR**: payload chứa số tiền cuối cùng và mã đơn duy nhất, tránh nhầm hoặc chiếm đoạt thanh toán. |
| SEC 2.2.7 | **Phiên đăng nhập**: dùng token an toàn, tự hết hạn khi không hoạt động. |
| SEC 2.2.8 | **Rate limiting**: giới hạn tần suất đăng nhập và checkout để chống brute-force và spam đơn. |

### 4.3 Khả dụng và tương thích

| ID | Mô tả |
|---|---|
| UC 2.3.1 | Hiển thị món dạng lưới (Grid). |
| UC 2.3.2 | Giao diện responsive cho máy tính và thiết bị di động. |
| UC 2.3.3 | Chọn món, đặt hàng, ghi chú, hẹn giờ qua các hộp thoại (Modal) rõ ràng. |

### 4.4 Khả năng bảo trì và tổ chức mã nguồn

| ID | Mô tả |
|---|---|
| M.SCS 2.4.1 | Tổ chức thành các thành phần chức năng rõ ràng theo mô hình hướng đối tượng (OOP). |
| M.SCS 2.4.2 | Tách rõ logic nghiệp vụ (`Models.js`), dữ liệu (`Data.js`), giao diện (`Views.js`), hộp thoại (`Modals.js`) và controller chính (`App.js`). |
| SCM 2.5.1 | Quản lý mã nguồn bằng Git; dùng `.gitignore` loại `node_modules/`, biến môi trường, file tạm. |
| SCM 2.5.2 | Khóa phiên bản thư viện bằng `package.json` và `package-lock.json`. |
| SCM 2.5.3 | Tách backend: logic server, routing, API nằm trong `backend/server.js`. |
| SCM 2.5.4 | Tách CSS theo vai trò: `customer.css` (cửa hàng) và `admin_staff.css` (quản trị nội bộ). |
| SCM 2.5.5 | JavaScript phía client chia module độc lập trong `function/` (khởi tạo, model/localStorage, nghiệp vụ, render UI, tiện ích). |
| SCM 2.5.6 | Ảnh tĩnh để trong `images/`; `index.html` ở thư mục gốc làm điểm vào SPA. |

## 5. Sơ đồ luồng dữ liệu (DFD)

### 5.1 Level 0 (Context)

Hệ thống tương tác với ba tác nhân ngoài:

- **Customer**: gửi yêu cầu xem menu, đặt món, thanh toán; nhận thông tin và trạng thái đơn.
- **Staff**: gửi yêu cầu xác nhận đơn, cập nhật trạng thái chế biến, phục vụ, thanh toán.
- **Admin**: gửi yêu cầu quản lý menu, tài khoản và báo cáo.

![DFD Level 0](docs/images/dfd-level0.png)

### 5.2 Level 1

![DFD Level 1](docs/images/dfd-level1.png)

| Tiến trình | Mô tả |
|---|---|
| **1.0 Manage Menu** | Nhận yêu cầu tìm món từ khách và trả danh sách món. Nhận thay đổi menu từ Admin (thêm, sửa, xóa) và ghi vào D2 Menu. Đọc D2 Menu và gửi thông tin món đã chọn cho 2.0. |
| **2.0 Create Order** | Nhận lựa chọn món và chi tiết đơn từ khách cùng Item Info từ 1.0, tạo đơn mới và ghi vào D3 Orders. |
| **3.0 Process Order** | Đọc đơn từ D3 Orders, gửi danh sách cho nhân viên; nhận cập nhật từ nhân viên, ghi trạng thái mới lại D3 Orders, gửi trạng thái cho khách; chuyển đơn đã xác nhận sang 4.0. |
| **4.0 Handle Payment** | Nhận đơn đã xác nhận từ 3.0, ghi thông tin thanh toán vào D3 Orders và trả trạng thái thanh toán cho khách. |
| **5.0 Manage Accounts & Reports** | Nhận đăng nhập của Staff/Admin và yêu cầu quản trị; đọc/ghi D1 User (tài khoản nhân viên); đọc D3 Orders để tạo báo cáo doanh thu cho Admin. |

**Kho dữ liệu:** `D1 User` (tài khoản), `D2 Menu` (thực đơn), `D3 Orders` (đơn hàng).

## 6. Use Case

![Use Case Diagram](docs/images/usecase.png)

### 6.1 Tác nhân

| ID | Tác nhân |
|---|---|
| A.1 | Customer |
| A.2 | Staff |
| A.3 | Administrator |
| A.4 | Payment Gateway |

### 6.2 Các use case chính

| ID | Use case | Mô tả |
|---|---|---|
| MUC.C 4.2.1 | View Menu | Xem thực đơn; mở rộng: Filter by Category, Search for Food Item. |
| MUC.C 4.2.2 | Add Item to Cart | Thêm món vào giỏ; mở rộng: Select Sizes, Add Notes. |
| MUC.C 4.2.3 | Edit Cart Item | Sửa số lượng, size, ghi chú của món trong giỏ. |
| MUC.C 4.2.4 | Remove Cart Item | Xóa món khỏi giỏ. |
| MUC.C 4.2.5 | Place Order (Check Out) | Bắt buộc (`include`): Select Order Type (Pickup/Delivery), Add Customer Information, Make Payment. Tùy chọn (`extend`): Schedule Order (Date, Time). |
| MUC.C 4.2.6 | Make Payment | Chọn Cash Payment hoặc VietQR Bank Transfer (qua tác nhân Payment Gateway). |
| MUC.S 4.2.7 | Log In to the System | Đăng nhập bằng tài khoản được cấp (Admin kế thừa mọi use case của Staff). |
| MUC.S 4.2.8 | View Staff Dashboard | Theo dõi đơn đến và hàng đợi bếp. |
| MUC.S 4.2.9 | Process Order | Xử lý đơn; mở rộng: Confirm Order, Reject Order. |
| MUC.S 4.2.10 | Update Food Preparation Status | Cập nhật tiến độ chế biến. |
| MUC.A 4.2.11 | Manage Menu | Thêm, sửa, xóa món, giá và danh mục. |
| MUC.A 4.2.12 | Manage Staff Accounts | Tạo, sửa, vô hiệu hóa tài khoản nhân viên. |
| MUC.A 4.2.13 | View Reports and Analytics | Xem doanh thu và thống kê tiêu thụ món. |

## 7. Class Diagram

![Class Diagram](docs/images/class-diagram.png)

| Lớp | Mô tả |
|---|---|
| **User** (lớp cha) | `User_Id, User_name, Password_Hash, Full_Name, Role, Email, Phone, Status, Created_At`; phương thức `Login()`, `Logout()`, `Update_Profile()`. Một User tạo 0..* Order (quan hệ "Creates"). |
| **Employee**, **Admin** | Kế thừa User. Employee (`Employee_Id, Position, Shift`): `Manage_Menu()`, `Update_Order_Status()`. Admin (`Admin_Level, Permissions`): `Manage_Employee()`, `Manage_System_Settings()`, `View_Revenue_Reports()`. |
| **Customer** | `Customer_Id, Full_Name, Address`; `View_Menu()`, `Place_Order()`, `View_Order_History()`. Một Customer có 0..* Order. |
| **Order** | `Order_Id, Customer_Id, Customer_Phone, Order_Type, Order_Status, Schedule_Date, Schedule_Time, Subtotal, Discount_Amount, Delivery_Fee, Total_Amount, Billing_Address, Note, Create_At`; `Calculate_Total()`, `Update_Order_Status()`. |
| **Order_Item** | Một dòng món: `Order_Item_Id, Order_Id, Item_Id, Size_Label, Quantity, Unit_Price, Line_Total`; `Calculate_Line_Total()`. Order *includes* 1..* Order_Item (composition). |
| **Category** | `Category_Id, Category_Name, Description, Status`; `Add_Category()`, `Update_Category()`. Category *contains* 0..* Menu_Item. |
| **Menu_Item** | `Item_Id, Category_Id, Item_name, Description, Image_Url, Price, Availability_Status, Create_At, Update_At`; `Update_Item_Info()`, `Change_Availability_Status()`. Được 0..* Order_Item tham chiếu. |
| **Payment** | `Payment_Id, Order_Id, Payment_Method, Amount, Payment_Status, Transaction_Reference, Paid_At, Created_At`; `Process_Payment()`, `Verify_Transaction()`. Mỗi Order có tối đa 1 Payment. |
| **Delivery_Info** | `Delivery_Id, Order_Id, Recipient_Name, Delivery_Address, Delivery_Note`; `Update_Delivery_Address()`. Mỗi Order có tối đa 1 Delivery_Info. |
| **Order_Status_History** | `History_Id, Order_id, Old_Status, Changed_By, Changed_At, Note`; `Record_Status_Change()`. Một Order có 0..* bản ghi lịch sử. |

## 8. Mô hình dữ liệu

Gồm 5 thực thể: `USERS`, `CATEGORIES`, `MENU_ITEMS`, `ORDERS`, `ORDER_ITEMS`. Khóa chính và khóa ngoại đều là `varchar(50)`.

![ERD](docs/images/data-model.png)

**Quan hệ:** Users 1 — 0..* Orders · Categories 1 — 0..* Menu_items · Orders 1 — 1..* Order_items · Menu_items 1 — 0..* Order_items.

### USERS
Tài khoản Admin, Staff và Customer.

| Thuộc tính | Kiểu | Khóa | Mô tả |
|---|---|---|---|
| userID | varchar(50) | PK | Mã người dùng |
| role | varchar(20) | | Admin / Staff / Customer |
| username | varchar(50) | | Tên đăng nhập |
| password | varchar(255) | | Mật khẩu (lưu dạng băm) |
| name | varchar(100) | | Họ tên |
| phone | varchar(15) | | Số điện thoại |
| email | varchar(100) | | Email |
| status | varchar(20) | | active / locked |
| created_at | timestamp | | Thời điểm tạo |

### CATEGORIES
| Thuộc tính | Kiểu | Khóa | Mô tả |
|---|---|---|---|
| cateID | varchar(50) | PK | Mã danh mục |
| name | varchar(100) | | Tên danh mục |
| description | text | | Mô tả |
| status | varchar(20) | | Trạng thái |

### MENU_ITEMS
| Thuộc tính | Kiểu | Khóa | Mô tả |
|---|---|---|---|
| menuitemID | varchar(50) | PK | Mã món |
| categoryID | varchar(50) | FK | → CATEGORIES.cateID |
| name | varchar(100) | | Tên món |
| description | text | | Mô tả |
| sizes | text | | Danh sách size |
| image_url | varchar(255) | | URL ảnh |
| price | decimal | | Đơn giá hiện tại |
| available | boolean | | Còn phục vụ / hết món |

### ORDERS
| Thuộc tính | Kiểu | Khóa | Mô tả |
|---|---|---|---|
| orderID | varchar(50) | PK | Mã đơn |
| userID | varchar(50) | FK | → USERS.userID (người đặt) |
| type | varchar(20) | | Pickup / Delivery |
| schedule | varchar(100) | | Lịch nhận (ngày, giờ) |
| tax | decimal | | Tiền thuế |
| address | text | | Địa chỉ giao (khi Delivery) |
| total | decimal | | Tổng tiền |
| payment | varchar(50) | | Cash / VietQR |
| status | varchar(50) | | Pending, Processing, Completed, Cancelled… |
| created_at | timestamp | | Thời điểm tạo đơn |
| customer_name | varchar(100) | | Tên khách |
| customer_phone | varchar(15) | | SĐT khách |
| reject_reason | text | | Lý do từ chối (khi bị từ chối) |

### ORDER_ITEMS
| Thuộc tính | Kiểu | Khóa | Mô tả |
|---|---|---|---|
| orderItemID | varchar(50) | PK | Mã dòng chi tiết |
| orderID | varchar(50) | FK | → ORDERS.orderID |
| menuitemID | varchar(50) | FK | → MENU_ITEMS.menuitemID |
| size | varchar(20) | | Size đã chọn |
| qty | integer | | Số lượng |
| price | decimal | | Đơn giá tại thời điểm đặt (giữ lịch sử giá) |
| note | varchar(255) | | Ghi chú món |

## 9. Thiết kế giao diện

### 9.1 Nguyên tắc chung (SPA)

- **Không tải lại trang**: mọi chuyển đổi Menu, Cart, Checkout đều xử lý bằng DOM (JS).
- **Bố cục hai cột (desktop)**: cột trái là Menu/Form, cột phải là giỏ hàng cố định (sticky); màn hình nhỏ tự gộp thành một cột (responsive).
- **Toast**: thanh thông báo tối màu hiện từ đáy màn hình, tự ẩn sau 2.2 giây.
- **Modal**: thao tác phức tạp (chọn size, chọn ngày giờ nhận) hiển thị trong hộp thoại có lớp phủ mờ.

### 9.2 Giao diện khách hàng

- **Thanh điều hướng**: logo, các tab Order Online, Cart, Checkout, Guest Order Tracking.
- **Order Online**: tab danh mục, thanh công cụ (chọn Delivery/Pickup, chọn lịch, tìm kiếm); món hiển thị dạng thẻ (ảnh, tên, giá, mô tả, nút +).
- **Cart**: chi tiết món, tách rõ Subtotal, Tax, Total; có nút Edit và Remove.
- **Checkout**: 4 bước (Contact, Pickup/Delivery details, Payment, Billing address). Hiện khung mã VietQR ngay khi chọn chuyển khoản; ô nhập sai hoặc thiếu viền đỏ.
- **Guest Order Tracking**: bảng Order ID, giờ nhận, loại đơn, thanh toán, trạng thái.

![Thực đơn](docs/images/ui-menu.png)

![Checkout](docs/images/ui-checkout.png)

### 9.3 Staff Dashboard

- Ẩn toàn bộ thanh điều hướng đặt món.
- Danh sách đơn theo thứ tự ưu tiên; đơn **ASAP** hoặc giờ nhận gần nhất được nổi bật và đẩy lên đầu.
- Thẻ **Delivery / Pickup** cạnh mỗi đơn.
- Nút cập nhật trạng thái (Pending → Cooking → Ready/Completed); xác nhận hoặc từ chối đơn, đánh dấu đã thanh toán.

![Staff Dashboard](docs/images/ui-staff-dashboard.jpg)

### 9.4 Admin Dashboard

Có đầy đủ tính năng của Staff Dashboard, thêm ba tab:

**Orders** — theo dõi và xử lý đơn (giống Staff).

![Admin - Đơn hàng](docs/images/ui-admin-orders.jpg)

**Menu Management** — bảng thêm/sửa món, đánh dấu còn/hết món (món hết bị ẩn với khách nhưng vẫn giữ trong đơn cũ).

![Admin - Thực đơn](docs/images/ui-admin-menu.jpg)

**Analytics** — doanh thu thu được trong ngày (chỉ đơn đã thanh toán), tổng giá trị đơn, số đơn (không tính đơn bị từ chối), và biểu đồ số lượng món bán chạy.

![Admin - Thống kê](docs/images/ui-admin-analytics.jpg)

**Staff Accounts** — bảng tài khoản nhân viên: đổi mật khẩu, khóa/mở khóa (tài khoản bị khóa không đăng nhập được).

![Admin - Tài khoản](docs/images/ui-admin-accounts.jpg)



## Ghi chú về tính nhất quán của tài liệu

Một số chi tiết trong tài liệu đặc tả chưa khớp với giao diện thực tế; nhóm nên thống nhất trước khi nộp:

- **Danh mục món**: đặc tả ghi "Burgers & Wraps", "Drinks & Desserts", "Pizza & Pasta", "Rice Bowls", "Starters"; giao diện dùng Main Dish, Dessert, Pasta & Pizza, Starter, Drink.
- **Giờ hoạt động**: đặc tả cho hẹn giờ 10:00 – 21:30, giao diện ghi mở cửa 10:00 – 22:30.
- **Mô hình dữ liệu và Class Diagram**: ERD chỉ có 5 bảng, trong khi Class Diagram có thêm Payment, Delivery_Info, Order_Status_History, Customer, Employee, Admin. ERD có `tax`, `payment` trong ORDERS nhưng chưa có bảng riêng cho các lớp này.
