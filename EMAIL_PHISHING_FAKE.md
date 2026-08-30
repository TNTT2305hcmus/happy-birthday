# Mẫu email mồi giả lập — Twinkle Fairy Birthday

> Mục đích: tạo cảm giác bí ẩn và hơi đáng ngờ để dẫn người nhận vào màn hình hacker giả lập
> của trang sinh nhật. Đây chỉ là trò bất ngờ vô hại: không giả mạo tổ chức có thật, không yêu cầu
> đăng nhập, không thu thập dữ liệu và không đính kèm tệp.

## Biến cần thay trước khi gửi

- `[TÊN NGƯỜI NHẬN]`: Chu Thị Hiền Lương
- `[LINK TRẢI NGHIỆM]`: URL production sau khi deploy
- `[TÊN HIỂN THỊ NGƯỜI GỬI]`: một tên bí ẩn nhưng không giả danh cá nhân/tổ chức có thật
- `[THỜI GIAN]`: thời điểm dự kiến người nhận mở email

## Phương án chính — Thông báo bí ẩn

**Tên hiển thị người gửi:** The Only One Project  
**Tiêu đề:** Có một dữ liệu chỉ dành cho bạn  
**Dòng xem trước:** Quyền truy cập sẽ được mở trong thời gian giới hạn.

---

Chào **[TÊN NGƯỜI NHẬN]**,

Hệ thống vừa hoàn tất việc tổng hợp một gói dữ liệu được đánh dấu:

> **ONLY YOU — 1111**

Gói dữ liệu này chỉ có một người nhận được chỉ định và không thể chuyển quyền truy cập.

Trạng thái hiện tại: **ĐANG CHỜ XÁC NHẬN**  
Thời gian ghi nhận: **[THỜI GIAN]**

Để xem nội dung đã được mở khóa cho bạn, hãy dùng liên kết bên dưới:

### [MỞ DỮ LIỆU DÀNH CHO TÔI]([LINK TRẢI NGHIỆM])

Sau khi mở, vui lòng giữ nguyên màn hình trong ít nhất 10 giây để quá trình kiểm tra hoàn tất.

Nếu bạn không phải **[TÊN NGƯỜI NHẬN]**, hãy đóng email này.

— **The Only One Project**

---

## Phương án phụ — Ngắn và đáng ngờ hơn

**Tên hiển thị người gửi:** 1111 Archive  
**Tiêu đề:** `[ACTION REQUIRED]` Hồ sơ 1111 đang chờ bạn  
**Dòng xem trước:** Một liên kết. Một người nhận. Mười giây để xác nhận.

---

**[TÊN NGƯỜI NHẬN]**, hồ sơ của bạn đã sẵn sàng.

Mã tham chiếu: `ONLY-YOU-1111`  
Quyền truy cập: `ONE-TIME EXPERIENCE`

### [KIỂM TRA HỒ SƠ]([LINK TRẢI NGHIỆM])

Không đóng màn hình trong quá trình xác nhận.

— **1111 Archive**

---

## Phương án nhẹ nhàng — Ít gây hoảng hơn

**Tên hiển thị người gửi:** A Little Star  
**Tiêu đề:** Một ngôi sao đang chờ được mở khóa ✦  
**Dòng xem trước:** Chỉ [TÊN NGƯỜI NHẬN] mới xem được nội dung này.

---

Chào **[TÊN NGƯỜI NHẬN]**,

Một thông điệp mang mã `1111` vừa được gửi đến đúng người.

Nó sẽ không tự mở. Bạn cần tự mình kích hoạt tại đây:

### [MỞ KHÓA THÔNG ĐIỆP]([LINK TRẢI NGHIỆM])

Khi màn hình bắt đầu thay đổi, hãy chờ 10 giây và đừng rời mắt nhé.

— **A Little Star**

---

## Khuyến nghị sử dụng

1. Dùng **Phương án chính** để cân bằng giữa bí ẩn và cảm giác “có chuyện gì đó đang xảy ra”.
2. Chỉ gửi từ địa chỉ email cá nhân của bạn; tên hiển thị có thể đổi nhưng không giả danh ngân hàng,
   Google, Microsoft, trường học, cơ quan nhà nước hoặc dịch vụ có thật.
3. Không thêm form đăng nhập, yêu cầu mật khẩu, mã OTP, số điện thoại hoặc thông tin cá nhân.
4. Không dùng URL rút gọn hoặc tên miền bắt chước dịch vụ thật. Nên dùng đúng domain deploy của dự án.
5. Không đính kèm file thực thi, tài liệu có macro hoặc bất kỳ file tải xuống nào.
6. Gửi thử cho chính bạn trước để kiểm tra subject, preview, CTA và URL trên cả máy tính lẫn điện thoại.
7. Chỉ gửi khi bạn có mặt để giám sát trực tiếp như kế hoạch.

## Checklist trước khi gửi thật

- [ ] Đã thay toàn bộ biến trong dấu `[]`.
- [ ] Link production mở thẳng đúng màn Terminal hacker; `?stage=landing` chỉ dùng khi cần demo landing.
- [ ] CTA hoạt động trên trình duyệt của người nhận.
- [ ] Không có yêu cầu nhập dữ liệu hoặc tải file.
- [ ] Intro tự kết thúc sau đúng 10 giây và chuyển sang Hero.
- [ ] Âm lượng mở đầu đã được kiểm tra ở mức vừa phải.
- [ ] Người gửi có mặt để dừng trò bất ngờ nếu người nhận không thoải mái.
