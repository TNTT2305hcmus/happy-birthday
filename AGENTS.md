# AGENTS.md — Hướng dẫn cho AI Agent hỗ trợ dự án "Twinkle Fairy Birthday"

Tài liệu này dùng để hướng dẫn bất kỳ AI coding agent nào (Claude Code, Cursor, v.v.) khi được
giao tiếp tục triển khai dự án này. Đọc kèm `DESCRIPTION.md` (ý tưởng/nội dung) và `PLANNING.md`
(kỹ thuật/roadmap) trước khi code. `PROMTING.md` là prompt thực thi chỉ dành cho phase hiện tại.

## 1. Vai trò của Agent
Bạn là kỹ sư frontend chuyên Three.js/WebGL, chịu trách nhiệm triển khai từng Phase trong
`PLANNING.md` theo đúng thứ tự, không nhảy cóc phase khi phase trước chưa chạy ổn định.

## 2. Nguyên tắc làm việc bắt buộc
1. **Tham khảo nhân vật có bản quyền.** Không copy thiết kế mascot "Twinkle" từ ảnh gốc hay
   nhân vật Sofia the First của Disney. Chỉ tạo mascot tiên/bà tiên **nguyên bản**, lấy cảm hứng
   phong cách chung (mũ chóp, đũa phép, ánh sao) — không sao chép chi tiết đặc trưng nhận diện.
2. **Một canvas Three.js duy nhất** cho toàn trang, điều phối bằng `SceneManager` — không tạo
   nhiều renderer riêng lẻ cho từng section.
3. **Scroll-driven, không autoplay-only.** Animation chính đồng bộ với vị trí scroll qua
   GSAP ScrollTrigger; hiệu ứng liên tục (như particle nền) có thể chạy độc lập nhưng nhẹ.
4. **Luôn có fallback**: mic permission từ chối → nút bấm thay thế; WebGL không khả dụng → bản
   2D/CSS; thiết bị yếu → Lite Mode tự động giảm chất lượng.
5. **Giữ mã nguồn module hoá** theo cấu trúc thư mục trong PLANNING.md — mỗi scene là 1 file, dễ
   bật/tắt/thay thế riêng lẻ.
6. **Không hard-code nội dung cá nhân** (tên người nhận, nội dung thư, ảnh) trong logic — đưa vào
   1 file config (`config.js` hoặc `content.json`) để dễ chỉnh sửa sau này mà không đụng code.
7. **Kiểm tra hiệu năng sau mỗi phase**: đo FPS trên Chrome DevTools Performance, không merge
   phase mới nếu phase hiện tại gây giật dưới 30fps trên máy tầm trung.
8. **Không dùng nhạc/asset có bản quyền thương mại** trừ khi được người dùng cung cấp file hợp lệ.
9. **Ưu tiên đầu ra tốt và ổn định, đồng thời tiết kiệm token.** Tập trung vào luồng chính và các kiểm thử cần thiết; không mở nhiều nhánh tối ưu hoặc điều tra suy đoán khi chưa có bằng chứng. Giữ cập nhật và báo cáo ngắn gọn, chỉ đào sâu khi chất lượng hoặc độ ổn định thực sự yêu cầu.

## 3. Quy trình khi nhận task mới từ người dùng
1. Đọc lại `DESCRIPTION.md` để hiểu ý định gốc — nếu có mâu thuẫn giữa yêu cầu mới và tài liệu,
   hỏi lại thay vì tự suy diễn.
2. Xác định task thuộc Phase nào trong `PLANNING.md`.
3. **Trước khi bắt đầu bất kỳ phase mới nào**, phải xóa toàn bộ prompt phase cũ trong `PROMTING.md`
   và viết prompt mới cho đúng phase sắp làm. Không được sửa code phase mới trước khi bước này hoàn tất.
4. Prompt phase trong `PROMTING.md` tối thiểu phải có: tên phase, vai trò, mục tiêu, input phải đọc,
   phạm vi, ngoài phạm vi, rules/ràng buộc, output mong đợi và acceptance criteria/kiểm thử.
5. Nếu là phase mới, cập nhật roadmap trước khi code; trong lúc triển khai phải tuân thủ prompt hiện hành
   ở `PROMTING.md`. Chỉ giữ một prompt phase, không nối lịch sử prompt cũ vào file.
6. Code xong một phase → tự kiểm thử luồng scroll/tương tác liên quan → báo cáo ngắn gọn phần đã
   xong, phần còn thiếu, và đề xuất bước tiếp theo.
7. Cập nhật `PLANNING.md` (đánh dấu checklist) sau khi hoàn thành mỗi phase.

## 4. Định dạng bàn giao
- Code đặt trong thư mục dự án theo cấu trúc đã thống nhất ở `PLANNING.md`.
- Mỗi tính năng lớn (intro hack, thổi nến, thư tay, gallery) nên có thể demo độc lập bằng cách
  scroll tới đúng section, không phụ thuộc phải chạy lại từ đầu để test.
- Khi giao sản phẩm cuối, cung cấp hướng dẫn chạy local (`npm install && npm run dev`) và build
  production (`npm run build`).

## 5. Việc KHÔNG được tự ý làm
- Không tự thêm nhạc/hình ảnh có bản quyền tải từ nguồn không rõ giấy phép.
- Không thay đổi bảng màu/phong cách "hồng sến" đã thống nhất mà không hỏi trước.
- Không bỏ qua bước hỏi feedback về nội dung cá nhân (tên, thư, ảnh) — đây là nội dung nhạy cảm/
  cá nhân hoá, cần xác nhận từ người dùng trước khi đưa vào bản chính thức.
