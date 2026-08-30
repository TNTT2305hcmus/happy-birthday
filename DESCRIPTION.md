# DESCRIPTION.md — Trang Web Chúc Mừng Sinh Nhật 3D "Twinkle Fairy Birthday"

## 1. Ý tưởng tổng quan
Một trang web sinh nhật dạng **trải nghiệm kể chuyện (storytelling scroll experience)**, phong cách
"hồng sến" (dreamy pastel pink), có hoạt hình 3D bằng Three.js, lấy cảm hứng từ:
- Không khí bà tiên / cô tiên phép thuật kiểu **Sofia the First** (mũ chóp, đũa phép, ánh sao lấp
  lánh, cầu vồng, ruy băng nơ).
- Giai điệu/ý niệm **Twinkle Twinkle Little Star** — dùng làm nhạc nền, hiệu ứng "ngôi sao nhấp
  nháy" xuyên suốt, và các biến thể lời bài hát để chúc mừng sinh nhật..

## 2. Cấu trúc trang (thứ tự cuộn / scroll sections)

### Section 0 — Intro giả lập "Hack Hệ Thống" (0s → 10s)
- Ngay khi load trang: màn hình đen, hiệu ứng kiểu terminal/cybersecurity:
  - Chữ xanh lá nhấp nháy kiểu Matrix rain (Three.js/CSS), dòng lệnh chạy tự động.
  - Text lớn dần hiện: "ĐANG XÂM NHẬP HỆ THỐNG...", thanh progress bar giả, glitch effect,
    tiếng "bíp bíp" nhỏ (optional, có nút tắt âm thanh).
  - Sau đúng 10 giây, màn hình "vỡ ra" / tan biến bằng hiệu ứng particle-explosion thành hàng
    ngàn ngôi sao hồng, chuyển cảnh mượt sang Hero Section.

### Section 1 — Hero (Lời chúc mở đầu)
- Nền 3D: bầu trời đêm hồng-tím gradient, ngôi sao lấp lánh (particle system), mascot tiên bay
  lượn quanh tên người được chúc + tuổi, đũa phép rắc kim tuyến khi hover/scroll.
- Tiêu đề lớn "Chúc Mừng Sinh Nhật [Tên]" với hiệu ứng chữ lấp lánh (text shimmer/holographic).
- Nút CTA "Bắt đầu hành trình phép thuật ✨" để cuộn xuống.

### Section 2 — Điều ước & Thổi nến (Interactive)
- Model 3D bánh kem với nến 3D thực tế (Three.js geometry + flame particle/shader lửa).
- Tương tác: người dùng bấm micro/nút "Thổi nến" (hoặc dùng mic thật qua Web Audio API để detect
  thổi hơi) → nến tắt dần, khói bay lên, mascot tiên vẫy đũa phép ban điều ước, confetti 3D rơi.
- Ô nhập "Điều ước của bạn" (input text) → sau khi gửi, chữ ước bay lên trời thành ngôi sao.

### Section 3 — Thư tay (Lá thư viết tay)
- Hiệu ứng phong bì 3D mở ra (dùng Three.js xoay/scale + texture giấy da/giấy note dễ thương).
- Nội dung thư hiển thị theo kiểu chữ viết tay (font handwriting), hiệu ứng typing animation
  (chữ hiện dần như đang được viết), có mascot bà tiên ngồi cạnh "đọc thư cùng".
- Thêm nhạc nền nhẹ "Twinkle Twinkle" dùng bản public domain vì giai điệu gốc "Twinkle Twinkle" đã thuộc public domain

### Section 4 — Gallery ảnh kỷ niệm
- Bố cục 3D dạng "khung ảnh polaroid lơ lửng trong không gian" hoặc carousel 3D xoay vòng
  (giống photo carousel WebGL phổ biến hiện nay), có hiệu ứng parallax theo chuột/scroll.
- Click vào ảnh → phóng to full-screen với khung viền hoa/ruy băng hồng, có caption ngày tháng.
- Nếu chưa có ảnh thật, mình sẽ dùng placeholder theo đúng bố cục, bạn thay ảnh sau.

### Section 5 (đề xuất thêm) — Kết / Lời nhắn cuối + nút chia sẻ
- Mascot tiên bay lên trời cùng pháo hoa ngôi sao, dòng chữ cảm ơn đã "mở khóa" trang web,
  nút chia sẻ (copy link) hoặc nút "Gửi lại lời chúc" cho người được tặng.

## 3. Phong cách hình ảnh (Art Direction)
- **Bảng màu:** Hồng pastel (#FFD9EC, #FF9ECF), tím lavender (#C9B6FF), vàng kim nhũ (#FFD98A),
  trắng kem — độ tương phản vừa đủ để chữ dễ đọc.
- **Typography:** Font tròn dễ thương cho tiêu đề (kiểu "Baloo 2", "Quicksand", "Fredoka") + font
  handwriting cho phần thư tay ("Caveat", "Dancing Script").
- **Chất liệu 3D:** shader lấp lánh (fresnel/sparkle), bloom postprocessing (glow ánh sao), particle
  hệ thống dày cho không khí "ma thuật".
- Tham khảo phong cách website hiện đại: scroll-driven animation (giống Awwwards showcase),
  cursor-follow particle, glassmorphism cho các card thông tin, micro-interactions mượt (GSAP).

## 4. Công nghệ dự kiến
- **Three.js** (dựng scene 3D, particle, model mascot).
- **GSAP + ScrollTrigger** cho animation theo scroll.
- **React + Vite** (hoặc HTML/JS thuần nếu bạn muốn nhẹ, cần bạn chọn — xem PLANNING.md).
- **Howler.js / Web Audio API** cho nhạc nền + hiệu ứng thổi nến qua mic.
- **@react-three/fiber + drei** nếu dùng React, giúp code Three.js gọn hơn.

## 5. Nội dung cần bạn cung cấp thêm (feedback giúp mình)
1. Tên người được chúc, tuổi, ngày sinh nhật (để hiển thị).
- Chu Thị Hiền Lương
- Tuổi: 21
- Ngày sinh: 17/09/2005
- Ngày bắt đầu quen: 01/09/2023
- Số ngày quen: 1111 ngày tính tới 16/09/2026; tới sinh nhật 17/09/2026 là 1112 ngày
2. Nội dung lá thư tay (đoạn văn cụ thể).
3. Ảnh thật cho phần gallery 
- Nắm trong folder ref_private_img, gồm 35 tấm và có thể bổ sung thêm, dạng hành trình quen nhau từ trước tới nay.
4. Bạn có model 3D mascot riêng (.glb) không, hay để mình tự dựng bằng shape 3D đơn giản (low-poly cute style)?
- Ưu tiên sử dụng mascot bà tiên trong sophia và twinkle
5. Có cần nhạc nền thật không, hay chỉ hiệu ứng âm thanh (beep, tiếng chuông sao)?
- Có nhạc twinkle, các âm thanh hỗ trợ cần thiết.
6. Trang chạy 1 lần cho 1 người, hay cần tùy biến (nhập tên) mỗi lần mở?
- Trang deploy cho 1 người duy nhất.
7. Có cần responsive tốt trên mobile (thao tác chạm thay vì hover) không? (Mặc định: có)
- Có, nhưng khả năng sẽ không ưu tiên điện thoại

Bổ sung:
- Có cơ chế khóa màn hình không, để lúc mà bấm vào hiện ra màn hình Hacker thì sẽ làm bạn hơi hoảng, xong được chúc mừng sinh nhật, như v sẽ oke hơn là người xem có thể tắt.

## 6. Rủi ro/giới hạn kỹ thuật cần lưu ý
- Hiệu ứng particle 3D + shader dày đặc có thể nặng trên máy yếu/điện thoại cũ → cần chế độ
  "Lite mode" tự động giảm số lượng hạt khi phát hiện thiết bị yếu.
- Tính năng detect thổi nến qua microphone cần xin quyền truy cập mic — sẽ có fallback bằng nút
  bấm thường nếu người dùng từ chối quyền hoặc trên trình duyệt không hỗ trợ.
- Nhạc có bản quyền: sẽ dùng bản phối "Twinkle Twinkle Little Star" public domain 

---
*File này dùng để bạn xem và phản hồi. Sau khi bạn xác nhận/chỉnh sửa, mình sẽ cập nhật
PLANNING.md và bắt đầu triển khai theo từng phase.*
