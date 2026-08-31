# REFINEMENT PLAN 1
### Tỉa tót lại Intro, Hero, Cake, Letter + chuẩn hoá hành vi Section

> Phase 3–5 (Gallery, Outro, Polish) dời sang sau. Phase refine plan 1 tập trung xử lý các lỗi UX/UI đang tồn đọng ở 4 section đầu, và thiết lập nguyên tắc điều hướng chung cho toàn bộ site.

---

## 1.0 — Nguyên tắc điều hướng Section (nền tảng, làm trước tiên)

**Vấn đề hiện tại:** Các section đang hiển thị cùng lúc / chồng lấn, mascot riêng của từng section đè lên nhau, cảm giác đang cuộn một trang dài thay vì đang "ở trong" một khung hình duy nhất.

**Mục tiêu:** Tạo cảm giác toàn bộ trải nghiệm diễn ra trên **1 sân khấu / 1 khung hình chính**, chỉ có góc camera và bối cảnh thay đổi theo section đang active.

**Việc cần làm:**
- Xây dựng 1 "Section Manager" (context/store) theo dõi section đang active dựa theo scroll position (dùng IntersectionObserver hoặc scroll progress theo từng section).
- Khi section N đang active:
  - Section N-1 (phía trên) → ẩn hoàn toàn (không chỉ opacity thấp, cần `visibility: hidden` / `pointer-events: none` sau khi transition xong để tránh chồng click).
  - Section N+1 (phía dưới) → ẩn hoàn toàn, chỉ "xuất hiện" khi user cuộn tới ngưỡng chuyển tiếp.
  - Chỉ section N (và tối đa 1 section liền kề trong lúc đang transition) được render tương tác.
- Transition giữa 2 section: dùng crossfade + dịch chuyển nhẹ (giống đổi góc camera) thay vì để 2 section cùng tồn tại trên viewport.
- Áp dụng logic này cho toàn bộ Intro → Hero → Cake → Letter (và các phase sau này).

**Acceptance criteria:**
- Tại bất kỳ thời điểm nào, chỉ nhìn thấy đúng 1 section (trừ lúc đang transition).
- Mascot của section này không bao giờ đè lên mascot/section khác.
- Cuộn lên/xuống mượt, không bị giật do 2 section cùng render.

---

## 1.1 — Intro (chỉnh nhỏ)

**Giữ nguyên** toàn bộ phần IntroHack hiện tại (đang là phần ổn nhất).

**Chỉnh sửa duy nhất — hiệu ứng khi đạt 100%:**
- Bỏ hiệu ứng "màn hình nứt vỡ + bắn confetti".
- Thay bằng:
  1. Đạt 100% → giữ nguyên 3 giây (màn hình vẫn hiển thị trạng thái hoàn tất).
  2. Màn hình tối dần → đen hoàn toàn trong vòng **3 giây**.
  3. Từ màn đen, sáng dần lên trong vòng **2 giây**.
  4. Khi sáng hoàn toàn → đã ở ngay section **Hero** (không còn thấy lại Intro nữa, đúng theo nguyên tắc 1.0).

**Acceptance criteria:**
- Không còn hiệu ứng nứt vỡ/confetti.
- Timing đúng: 3s giữ → 3s tối dần → 2s sáng dần → vào thẳng Hero.

---

## 1.2 — Hero (redesign)

**Lỗi hiện tại:**
- Component card bo góc và mascot cô tiên bố cục rời rạc, không liên kết thị giác.
- Chữ "Hiền Lương" bị mất dấu huyền (lỗi font/encoding).
- Ngôi sao trên mũ mascot bị lệch vị trí.

**Bố cục mới:**
- **Góc trên bên phải:** thêm 1 mascot tiên nhỏ (phụ), hướng mặt/thân vào giữa khung hình (tạo điểm nhìn hội tụ vào trung tâm).
- **Góc dưới của card bo góc:** thêm 2–3 mascot "twinkle" (ngôi sao lấp lánh) dạng tĩnh, trang trí góc.
- **Card bo góc chính:** thu nhỏ lại — chiều rộng/dài xấp xỉ bằng hoặc nhỉnh hơn một chút so với mascot cô tiên chính (không to bản như hiện tại). Nội dung bên trong chỉ gồm:
  1. Tag nhỏ: "Ngày của em bé — 17.9.2026"
  2. Dòng chính: **"Happy Birthday Ngiu Hiền Lương xinh đẹp của a"** — dùng font script/bay bổng (kiểu chữ viết tay).
  3. Dòng phụ: *"From 17/9/2023 to 17/9/2026 — for the first time we hang out together. I love u so much and be always only you."*
     - Riêng cụm **"I love u… only you"** có hiệu ứng: cuộn chữ ra/vào (marquee nhẹ hoặc reveal loop) + đổi màu gradient theo thời gian (loop vô hạn, tốc độ chậm, không gây rối mắt).
- **Mascot cô tiên chính (bên phải):** giữ nguyên toàn bộ pose/model hiện tại.
  - Fix riêng: chỉnh lại vị trí ngôi sao trên mũ cho thẳng tâm/đúng trục với chóp mũ.
- **Fix font:** đảm bảo font chữ dùng cho "Hiền Lương" và toàn bộ tiếng Việt có dấu hỗ trợ đủ bộ dấu (kiểm tra lại font-family, đặc biệt ký tự "ề" — dấu huyền + ê).

**Acceptance criteria:**
- "Hiền Lương" hiển thị đủ dấu.
- Ngôi sao trên mũ mascot chính thẳng hàng.
- Card mới nhỏ gọn, đúng 3 nội dung yêu cầu, không thừa thông tin cũ (tuổi mới/bên nhau/ngày của chúng mình chuyển đi nơi khác hoặc bỏ khỏi Hero — cần thống nhất, xem ghi chú bên dưới).
- Layout tổng thể có điểm nhấn thị giác hội tụ: 2 mascot phụ (trên phải, dưới) + mascot chính đều hướng/liên kết vào trung tâm.
- Bỏ 3 stat block (tuổi mới / Bên nhau / Ngày chúng mình). Có thể dời sang Gallery/Outro để Hero gọn gàng.
- Bỏ nút bắt đầu hành trình vì mục tiêu là để người dùng cuộn và cảm nhận.

---

## 1.3 — Cake

**Lỗi hiện tại:**
- Bánh xuất hiện quá sớm khi chưa cuộn hết vào section (trigger animation sai ngưỡng scroll).
- Ngôi sao chính trên bánh bị đặt lệch vị trí.
- Bố cục: card nhập liệu bên trái, bánh bên phải — cần đảo lại.
- Sau khi thổi nến: đang bắn confetti + xuất hiện thêm 1 mascot cô tiên phụ — không cần thiết, cần bỏ.

**Thay đổi bố cục:**
- Đảo vị trí: **card nhập liệu điều ước → bên phải**, **bánh → bên trái**.
- Fix trigger: bánh chỉ bắt đầu animation xuất hiện khi section Cake đã vào viewport đủ ngưỡng (ví dụ ≥ 60–80% section visible), không xuất hiện sớm khi mới chạm mép trên.
- Fix vị trí ngôi sao chính trên bánh cho đúng tâm/thẳng trục với tầng bánh trên cùng.

**Rút gọn nội dung card nhập liệu, chỉ còn:**
1. Tiêu đề: "Một điều ước nhỏ"
2. Ô nhập liệu + nút "Gửi điều ước"
3. Nút "Thổi nến bằng microphone"
   - **Bỏ** nút "Thổi nến bằng nút bấm".
   - **Thay bằng:** tương tác click trực tiếp vào từng ngọn lửa nến trên bánh (mỗi lần click tắt 1 ngọn nến) — đây là cách thứ 2 để thổi nến song song với microphone.

**Hiệu ứng sau khi gửi điều ước + thổi hết nến:**
- **Bỏ** hiệu ứng bắn confetti.
- **Bỏ** mascot cô tiên phụ xuất hiện.
- **Thay bằng chuỗi hiệu ứng mới:**
  1. Nội dung vừa gõ trong ô điều ước biến thành các hạt/ngôi sao nhỏ bay lên.
  2. Các ngôi sao nhỏ bay tới hội tụ vào **ngôi sao chính trên bánh**.
  3. Từ ngôi sao chính trên bánh, tiếp tục bay thẳng lên tới **ngôi sao trên đũa phép của mascot cô tiên chính ở Hero**.
  4. Trong lúc hiệu ứng bay diễn ra, màn hình **tự động scroll** ngược lên để theo dõi đường bay (từ Cake trở về hướng Hero), tạo cảm giác điều ước "gửi ngược" lên cho cô tiên.

**Acceptance criteria:**
- Bánh chỉ hiện khi cuộn đủ vào section, không hiện sớm.
- Ngôi sao chính trên bánh thẳng vị trí.
- Bố cục: bánh trái – card phải.
- Card chỉ còn 3 thành phần yêu cầu, nút thổi nến bằng nút bấm đã bị thay bằng click vào lửa nến.
- Không còn confetti, không còn mascot phụ xuất hiện.
- Hiệu ứng bay sao + auto-scroll hoạt động đúng trình tự: ô nhập → sao chính trên bánh → đũa phép cô tiên ở Hero.

---

## 1.4 — Letter

**Đây là section lỗi nhiều nhất, cần làm lại gần như toàn bộ layout.**

**Lỗi hiện tại:**
- Có 1 card thông tin bên cạnh phong bì thư — thừa, gây rối bố cục.
- Giấy thư (nội dung lá thư) bị lộ thẳng ra ngoài phong bì thay vì nằm gọn bên trong.
- Layer sai: giấy thư cần nằm **trên layer của phần miệng phong bì (nắp thư)**, hiện đang bị lộ ra trước/ngoài nắp thư.

**Thay đổi:**
- **Bỏ hẳn** card thông tin bên cạnh. Section Letter chỉ còn duy nhất chiếc phong bì thư (không có UI phụ nào khác).
- Tương tác mở thư:
  - Có thể **click trực tiếp vào phong bì** để mở ngay lập tức, hoặc
  - **Cuộn tiếp** để phong bì tự mở dần — khi mở bằng cách cuộn, tốc độ mở **chậm lại** (mở theo % scroll progress, không mở nhanh/giật).
- Fix z-index/layer:
  - Giấy thư phải nằm **trong lòng phong bì** (bị che bởi mép trên và 2 mép bên của phong bì khi đóng).
  - Khi mở, giấy thư trượt lên và nằm **đè lên (trên layer của) nắp thư đã mở**, không được lộ ra ngoài phong bì hay nằm dưới nắp.
- Sau khi phong bì mở hoàn toàn (100%): chữ trong thư mới bắt đầu hiệu ứng **type/gõ chữ trực tiếp trên chính tờ giấy thư** đó (không phải trên 1 card riêng bên ngoài như hiện tại).

**Acceptance criteria:**
- Không còn card phụ bên cạnh phong bì.
- Giấy thư luôn nằm đúng trong phong bì ở mọi trạng thái (đóng/đang mở/mở hoàn toàn), đúng thứ tự layer (giấy trên nắp thư khi mở).
- Mở bằng click = mở nhanh/trọn vẹn; mở bằng scroll = mở chậm theo tiến độ cuộn.
- Hiệu ứng gõ chữ chỉ chạy sau khi mở phong bì 100%, và chữ xuất hiện ngay trên bề mặt giấy thư.

---

## 1.5 — Spacing & Z-index tổng thể

**Áp dụng cho tất cả section trong Phase 2 (Intro/Hero/Cake/Letter) và làm chuẩn cho các phase sau:**
- Thêm khoảng trống (padding/margin) rõ ràng giữa các section để tránh cảm giác dồn cục khi transition.
- Rà soát lại toàn bộ mascot riêng của từng section (mascot Hero, mascot Cake nếu có, mascot Letter nếu có) — đảm bảo mỗi mascot có z-index và vùng bounding riêng, không chồng lấn với mascot của section khác kể cả trong lúc transition (áp dụng cùng nguyên tắc ẩn/hiện ở mục 2.0).
- Chuẩn hoá 1 hệ z-index dùng chung (ví dụ: background < section card < mascot chính < hiệu ứng particle/bay sao < overlay chuyển cảnh) để tránh việc mỗi section tự đặt z-index riêng gây xung đột.

**Acceptance criteria:**
- Không còn hiện tượng 2 mascot của 2 section khác nhau cùng hiển thị chồng lên nhau tại bất kỳ thời điểm nào.
- Khoảng cách giữa các section đủ để cảm nhận rõ ranh giới chuyển cảnh, nhưng không tạo cảm giác "trang dài" (vẫn giữ đúng tinh thần 2.0 — một khung hình, đổi góc camera).

---

## Thứ tự triển khai đề xuất

| Bước | Nội dung | Ghi chú |
|---|---|---|
| 1 | 1.0 — Section Manager (show/hide theo active section) | Làm nền tảng trước, các phase sau phụ thuộc vào đây |
| 2 | 1.1 — Intro (hiệu ứng tối/sáng thay confetti) | Nhỏ, độc lập, làm nhanh |
| 3 | 1.2 — Hero redesign | Bao gồm fix font + fix ngôi sao mũ |
| 4 | 1.3 — Cake (bố cục, trigger, hiệu ứng bay sao) | Phụ thuộc vị trí đũa phép ở Hero (làm sau 2.2) |
| 5 | 1.4 — Letter (làm lại toàn bộ) | Độc lập, có thể làm song song với 2.3 |
| 6 | 1.5 — Spacing & z-index rà soát toàn cục | Làm cuối, sau khi các section đã ổn định |

---

- Khi có sự chuyển giữ các section, cần có animation chuyển cảnh để giúp liên kết thị giác. 
- Khi đọc xong giấy thư, sẽ tiếp tục đợi cuộn để đến với Gallery.