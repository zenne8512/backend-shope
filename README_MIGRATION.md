# HƯỚNG DẪN ĐỒNG BỘ CƠ SỞ DỮ LIỆU & FIX LỖI KHI SANG MÁY MỚI

Khi bạn chuyển dự án sang một máy tính mới, hệ thống cơ sở dữ liệu SQL Server và Prisma Client cần được thiết lập lại để nhận dạng cấu trúc bảng mới (đã gộp 5 bảng phụ vào bảng `products`). 

Dưới đây là các bước chi tiết để bạn tự sửa lỗi này trên máy mới:

---

## BƯỚC 1: Cấu hình kết nối Cơ sở dữ liệu
1. Mở thư mục **shoppi-backend**.
2. Tìm và mở file `.env`.
3. Cập nhật lại chuỗi kết nối `DATABASE_URL` cho đúng với SQL Server trên máy mới của bạn (tên server, cổng, username, password và tên database):
   ```env
   DATABASE_URL="sqlserver://<TÊN_SERVER_HOẶC_IP>:<PORT>;database=<TÊN_DB>;user=<USER>;password=<PASSWORD>;encrypt=true;trustServerCertificate=true;"
   ```

---

## BƯỚC 2: Cập nhật cấu trúc bảng (Migration)
Do cấu trúc bảng đã được gộp gọn nhẹ hơn, bạn cần đồng bộ schema này vào database trên máy mới:
1. Mở terminal tại thư mục **shoppi-backend**.
2. Chạy lệnh sau để xóa cấu trúc cũ (nếu có) và đồng bộ cấu trúc mới:
   ```bash
   npx prisma db push --force-reset
   ```

---

## BƯỚC 3: Tạo lại Prisma Client
Lệnh này cực kỳ quan trọng, nó giúp tạo lại thư viện Client trên máy mới để code Node.js nhận dạng được các trường mới như `price`, `stock`, `image_url` trực tiếp trong bảng `products`:
1. Chạy lệnh:
   ```bash
   npx prisma generate
   ```

---

## BƯỚC 4: Seed (nạp) lại dữ liệu mẫu
Sau khi cấu trúc bảng đã sẵn sàng, bạn cần nạp lại 50 sản phẩm mẫu vào database mới:
1. Chạy lệnh:
   ```bash
   node src/db-seed.js
   ```
   *Màn hình hiển thị: `✅ Đã seed thành công 50 sản phẩm...` là hoàn tất.*

---

## BƯỚC 5: Khởi động lại Server Backend
1. Chạy lệnh để bật API Server:
   ```bash
   npm run dev
   ```
   *Đảm bảo server chạy thành công trên cổng 5000 (`Server is running on port 5000`).*

---

## BƯỚC 6: Xóa cache giỏ hàng & Đăng nhập lại trên trình duyệt
Do cơ sở dữ liệu trên máy mới có ID sản phẩm và ID người dùng thay đổi, trình duyệt máy mới hoặc trình duyệt cũ lưu cache (localStorage) cũ sẽ bị lệch dữ liệu dẫn đến lỗi đồng bộ:
1. Mở trang web trên trình duyệt.
2. Nhấn **F12** -> Chọn tab **Application** (hoặc **Storage**) -> Chọn **Local Storage** -> Click chuột phải chọn **Clear** (Xóa sạch) để dọn giỏ hàng cũ và token cũ.
3. Đăng nhập lại tài khoản Admin (Mã PIN mặc định: `2026`) để hệ thống đồng bộ mới hoàn toàn.
