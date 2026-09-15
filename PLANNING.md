# PLANNING.md — Kế hoạch kỹ thuật "Twinkle Fairy Birthday"

## 1. Quyết định kỹ trúc (Tech Decisions)

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Vite + React**  | Quản lý state tốt |
| 3D Engine | **Three.js r16x** | Yêu cầu đề bài, kiểm soát tốt shader/particle |
| Animation timeline | **GSAP 3 + ScrollTrigger** | Chuẩn công nghiệp cho scroll-driven storytelling |
| Postprocessing | **three/examples/jsm/postprocessing** (UnrealBloomPass) | Hiệu ứng glow lấp lánh cho ngôi sao/mascot |
| Model 3D | Low-poly procedural geometry (dựng bằng code) cho bản đầu; nâng cấp bằng .glb nếu có artist | Không cần phần mềm 3D ngoài, kiểm soát style nhất quán |
| Âm thanh | **Howler.js** | Quản lý nhiều track/sfx dễ, có fade in/out |
| Mic detect (thổi nến) | Web Audio API `getUserMedia` + `AnalyserNode` | Phát hiện volume tăng đột ngột = "thổi" |
| Font | Self-host qua `@fontsource`: Baloo 2 700–800 (tiêu đề), Quicksand 400–700 (body/UI), Caveat 500–700 (thư tay/polaroid) | Không phụ thuộc CDN, hỗ trợ tiếng Việt và đúng vibe dễ thương |
| Deploy | Static site (Vercel/Netlify) | Không cần backend |
| State đơn giản (điều ước, tên) | localStorage | Không cần DB cho scope hiện tại |

### Quyết định nội dung/UX đã chốt

- Desktop ưu tiên số một là MacBook Air M2 13.6 inch. Baseline responsive dùng CSS viewport `1470×956`, khung an toàn `1470×850` khi trình duyệt chiếm chiều cao, và regression `1440×900`; chi tiết cùng backlog liên kết mascot/scene nằm trong `UX_REFINEMENT_NOTES.md`.
- Ở viewport an toàn, trạng thái tương tác chính phải nằm gọn trong khung: không tràn ngang, không che CTA, và riêng Cake phải đồng thời thấy bánh/nến, điều ước và thao tác thổi chính.
- Luồng mở đầu là một trò bất ngờ có chủ đích: người nhận mở liên kết từ một email mồi do người
  tặng tự gửi và đi thẳng vào intro hacker **khóa đủ 10 giây**, không có nút Skip. Website không giả
  form đăng nhập, không thu thập thông tin, không tải file và không tự động gửi email.
- Landing activation chỉ được giữ như màn dự phòng/demo qua `?stage=landing`, không phải entry mặc
  định của bản deploy. Do không có thao tác trực tiếp trên trang trước intro, beep/nhạc có thể bị
  trình duyệt chặn cho tới tương tác đầu tiên của người xem; animation không phụ thuộc audio.
- Mascot là một cô tiên chibi **nguyên bản** với mũ chóp, đũa sao và bảng màu hồng/lavender; ảnh
  Twinkle/Sofia chỉ là moodboard, không sao chép tạo hình hoặc chi tiết nhận diện.
- Mốc quan hệ chính xác: bắt đầu từ **01/09/2023**. Theo chênh lệch lịch, tới 16/09/2026 là đúng
  **1.111 ngày** và tới sinh nhật 17/09/2026 là **1.112 ngày**. Hero có thể dùng `1111` như cột mốc
  ngay trước sinh nhật, kết hợp câu chữ lãng mạn kiểu “1111 ngày, only you”; ngày sinh nhật hiển thị
  thêm mốc 1.112 ngày hoặc “hơn 3 năm bên nhau” để không sai dữ liệu.
- Thư tay tạm dùng placeholder khoảng 10 câu để kiểm tra bố cục; nội dung thật sẽ được thay qua
  config sau khi người dùng cung cấp.
- Ảnh gallery `1.jpg` đến `35.jpg` đã theo đúng thứ tự thời gian. Caption, ngày tháng và đoạn cảm
  xúc dùng placeholder ở bản đầu và được quản lý bằng config để bổ sung sau.
- Âm thanh ưu tiên nhẹ nhàng, dễ thương và có quyền sử dụng rõ ràng: bản phối miễn phí phù hợp giấy
  phép hoặc giai điệu được tổng hợp riêng; không lấy bản thu thương mại không rõ quyền sử dụng.
- Prototype HTML/CSS/JS cũ không cần bảo tồn; dự án được dựng lại bằng kiến trúc mới.

## 2. Kiến trúc thư mục dự kiến
```
/src
  /scenes
    IntroHack.js        # Section 0 - hiệu ứng giả hack
    HeroScene.js         # Section 1 - bầu trời sao + mascot
    CakeScene.js          # Section 2 - bánh kem + nến + thổi nến
    LetterScene.js        # Section 3 - phong bì + thư tay
    GalleryScene.js        # Section 4 - carousel ảnh 3D
    OutroScene.js           # Section 5 - kết thúc + pháo hoa sao
  /core
    SceneManager.js       # Quản lý renderer, camera, resize, RAF loop chung
    ParticleSystem.js     # Hệ hạt sao tái sử dụng nhiều nơi
    AudioManager.js        # Howler wrapper + mic analyser
    PerformanceMonitor.js  # Auto giảm chất lượng (Lite mode)
  /components (nếu HTML overlay UI)
    WishInput, LetterText, GalleryModal, SkipButton...
  /assets
    /models /textures /audio /fonts /images
  main.js                 # Bootstrap, ScrollTrigger timeline nối các scene
  style.css
index.html
AGENTS.md / PLANNING.md / DESCRIPTION.md
```

## 3. Nguyên tắc kỹ thuật quan trọng
1. **Một WebGL renderer/canvas duy nhất** xuyên suốt trang (full-page fixed canvas), các "scene"
   thực chất là thay đổi camera position/nội dung theo scroll progress — tránh việc tạo/hủy nhiều
   canvas gây giật lag.
2. **ScrollTrigger làm nhạc trưởng**: mỗi section có 1 trigger, cập nhật animation 3D theo
   `onUpdate(progress)` thay vì animation riêng lẻ không đồng bộ với scroll.
3. **Lite Mode tự động**: đo FPS 2s đầu, nếu <40fps trên thiết bị → giảm số particle, tắt bloom,
   giảm shadow.
4. **Accessibility fallback**: nếu WebGL không khả dụng → hiển thị bản 2D/CSS thay thế (không để
   trắng trang).
5. **Mobile-first input**: mọi tương tác (thổi nến, mở thư, xem gallery) đều có phương án chạm
   (tap) thay cho hover/click chuột.
6. **Giai đoạn hack-intro** dùng CSS/2D canvas (không cần WebGL nặng) để load cực nhanh ngay khi
   vào trang, WebGL 3D chỉ init song song ở background trong lúc người dùng xem 10s intro
   (progressive loading — tránh giật khi chuyển cảnh).

## 4. Roadmap theo Phase

### Phase 0 — Xác nhận yêu cầu và dữ liệu (hiện tại)

- [x] 0.1 Đọc và đối chiếu `DESCRIPTION.md`, `PLANNING.md`, `AGENTS.md`.
- [x] 0.2 Kiểm kê repository, prototype cũ, 35 ảnh gallery và ảnh mascot tham khảo.
- [x] 0.3 Chốt luồng email mồi → intro hacker trực tiếp, khóa 10 giây và không Skip.
- [x] 0.4 Chốt mascot nguyên bản, không tái tạo nhân vật có bản quyền.
- [x] 0.5 Chốt mốc 3 năm, cách dùng mô-típ `1111`, thứ tự gallery và placeholder nội dung.
- [x] 0.6 Chốt nguyên tắc nhạc/SFX miễn phí hoặc có giấy phép rõ ràng.
- [x] 0.7 Xác nhận roadmap chi tiết và cho phép bắt đầu cài đặt Phase 1.

**Điểm feedback:** duyệt phạm vi, luồng mở đầu và các tiêu chí an toàn trước khi cài dependencies.

### Phase 1 — Nền tảng và Intro Hack (MVP hiển thị được)

- [x] 1.1 Khởi tạo Vite + React, cài Three.js, GSAP và Howler; dựng cấu trúc module.
- [x] 1.2 Tạo `content/config.js`, shell cho sáu section và cơ chế mở trực tiếp từng section để test.
- [x] 1.3 Dựng `SceneManager`: một renderer/canvas, camera, resize, lifecycle và RAF loop chung.
- [x] 1.4 Thêm kiểm tra WebGL, `prefers-reduced-motion`, fallback CSS và khung Lite Mode ban đầu.
- [x] 1.5 Dựng landing activation dự phòng/demo, không yêu cầu dữ liệu cá nhân; bản deploy mặc định
  bỏ qua landing và mở thẳng intro hacker.
- [x] 1.6 Dựng terminal, Matrix rain, dòng lệnh giả, progress, glitch và SFX cho intro.
- [x] 1.7 Khóa input/scroll trong 10 giây progress và 3 giây giữ trạng thái 100%, không Skip; vẫn
  bảo đảm trang tự phục hồi khi animation hoặc WebGL khởi tạo lỗi.
- [x] 1.8 Dựng chuyển cảnh “vỡ” thành sao hồng sang Hero, đồng thời preload WebGL trong nền.
- [x] 1.9 Kiểm thử timing, refresh, resize, keyboard/touch và đo FPS của Phase 1.
  - [x] 1.9a Lint, production build và script `verify:phase1` đạt.
  - [x] 1.9b Kiểm tra trực quan trước/sau 10 giây, refresh, desktop 1440×900 và mobile 390×844 đạt.
  - [x] 1.9c Wheel/touch/phím điều hướng có lớp khóa; WebGL lỗi dùng fallback và watchdog vẫn kết thúc intro.
  - [x] 1.9d Đo FPS trên Chrome thật bằng `?experience=off&debug=performance`: **60 FPS**, đạt
    ngưỡng không dưới 30 FPS.

**Điểm feedback:** demo độc lập landing + intro 10 giây + chuyển cảnh; duyệt mức độ “giống bị hack”.

### Phase 2 — Hero và mascot

- [x] 2.1 Dựng bầu trời gradient hồng-tím, ánh sáng và hệ sao/particle dùng chung.
  - [x] Gradient shader và bộ ánh sáng được đóng gói trong `HeroScene`, dùng renderer/canvas chung.
  - [x] `ParticleSystem` dùng một draw call, 1.400 sao ở Full và 420 sao ở Lite; hỗ trợ reduced motion.
  - [x] Palette được cân lại theo art direction pastel: lavender sáng → hồng phấn → kem, sao trắng/vàng ấm.
- [x] 2.2 Dựng mascot tiên chibi nguyên bản bằng procedural low-poly geometry.
  - [x] Tạo hình module hóa gồm gương mặt, tóc, mũ chóp, váy, bốn cánh và đũa sao; không dùng texture/model ngoài.
  - [x] Tách node cánh và đũa để sẵn sàng cho chuyển động ở 2.3; có responsive placement và dispose tài nguyên.
- [x] 2.3 Thêm chuyển động bay, vẫy đũa và trail kim tuyến theo scroll/pointer.
  - [x] ScrollTrigger truyền progress/active-state của Hero vào scene; pointer tạo parallax có nội suy.
  - [x] Mascot bay lơ lửng, đập cánh và vẫy cả tay/đũa; reduced motion giữ chuyển động tối giản.
  - [x] `MagicTrail` bám đầu đũa bằng một draw call động, tự giảm từ 96 xuống 32 hạt ở Lite Mode.
- [x] 2.4 Dựng Hero overlay: tên, tuổi, mốc 3 năm, mô-típ “1111 / only you” và shimmer.
  - [x] Overlay riêng thay shell Phase 1, chừa vùng 3D cho mascot và lấy toàn bộ nội dung cá nhân từ config.
  - [x] Hiển thị chính xác tuổi 21, mốc 1.111/1.112 ngày, hơn 3 năm và “Only you, only us”.
  - [x] Tên dùng shimmer lavender–hồng–vàng; reduced motion dùng trạng thái gradient tĩnh.
- [x] 2.5 Tích hợp CTA cùng timeline ScrollTrigger dẫn sang section bánh sinh nhật.
  - [x] Một timeline ScrollTrigger điều phối đồng thời progress 3D và chuyển động vào/ra của Hero overlay.
  - [x] CTA cuộn/focus tới Cake, tôn trọng reduced motion; demo Hero tự chuyển sang `?section=cake`.
- [x] 2.6 Hoàn thiện bản Hero fallback 2D và đo FPS trên chế độ thường/Lite.
  - [x] Mascot fallback nguyên bản được dựng bằng HTML/CSS, có bố cục desktop/mobile và tắt chuyển động khi người dùng bật reduced motion.
  - [x] `PerformanceMonitor` lấy mẫu trong 2 giây, tự chuyển xuống Lite khi dưới 40 FPS; query `quality=full|lite` hỗ trợ kiểm thử độc lập.
  - [x] Edge headless 1440×900 đạt **53 FPS ở Full** và **52 FPS ở Lite**, đều vượt ngưỡng tối thiểu 30 FPS; ảnh kiểm thử fallback desktop/mobile và diagnostics hai quality đã được lưu.
  - [x] Lint, production build, `verify:phase2.6` và `verify:phase2.6:browser` đạt.

**Điểm feedback:** duyệt tạo hình mascot, chuyển động, câu chữ Hero và mật độ hiệu ứng.

### Phase 3 — Điều ước và thổi nến

- [x] 3.1 Dựng bánh, nến, vật liệu, ánh sáng và bố cục camera.
  - [x] `CakeScene` procedural gồm ba tầng bánh, icing/drip, rosette, đĩa vàng và topper ngôi sao; không dùng model/texture bên ngoài.
  - [x] Năm nến có thân sọc, tim nến và flame placeholder; giữ sẵn tham chiếu `candles`/`flames` cho animation ở 3.2.
  - [x] Ánh sáng key/fill/rim pastel, contact shadow nhẹ và placement desktop/tablet/mobile chạy trên renderer/canvas dùng chung.
  - [x] ScrollTrigger bật/tắt Cake theo section, tránh chồng mascot Hero; section Cake có thể mở độc lập bằng `?section=cake`.
  - [x] Edge headless đạt **47 FPS ở Full** và **52 FPS ở Lite**; lint, production build và `verify:phase3.1` đạt.
- [x] 3.2 Dựng flame animation, tắt nến, khói và tương tác nút thủ công trước.
  - [x] Năm flame flicker độc lập, có glow chung và tắt tuần tự bằng hiệu ứng nghiêng/co nhỏ; reduced motion dùng chuỗi ngắn, không flicker liên tục.
  - [x] `CakeControls` cung cấp nút thổi thủ công, trạng thái `aria-live`, số nến còn sáng và trạng thái hoàn tất; toàn bộ copy lấy từ config.
  - [x] `cakeEvents` nối DOM với Three.js để nút thủ công và mic ở 3.3 dùng chung một luồng trạng thái.
  - [x] `CandleSmoke` phát khói sau từng nến bằng một draw call, ngân sách 80 hạt Full / 36 hạt Lite.
  - [x] Edge headless bấm nút thật và đo **59 FPS** trong chuỗi tắt nến/khói; lint, production build, regression 3.1 và `verify:phase3.2` đạt.
- [x] 3.3 Tích hợp `getUserMedia` + `AnalyserNode`, hiệu chỉnh ngưỡng phát hiện hơi thổi.
  - [x] `MicrophoneBlowDetector` xin quyền mic sau thao tác bấm, phân tích RMS tại thiết bị và dừng toàn bộ track/audio context sau khi phát hiện hoặc unmount.
  - [x] Lấy mẫu tiếng nền 1,2 giây, tự cắt ngưỡng trong khoảng an toàn và yêu cầu vượt ngưỡng liên tiếp để giảm kích hoạt nhầm.
  - [x] UI hiển thị trạng thái xin quyền/hiệu chỉnh/lắng nghe và meter tín hiệu; luồng mic dùng chung event tắt nến với nút thủ công.
  - [x] Edge headless với microphone giả lập đi qua luồng xin quyền → hiệu chỉnh → lắng nghe ở **60 FPS**; lint, production build, regression 3.2 và verify:phase3.3 đạt.
- [x] 3.4 Thêm fallback đầy đủ khi mic bị từ chối, timeout hoặc trình duyệt không hỗ trợ.
  - [x] Phân loại riêng denied, timeout, unsupported, không tìm thấy thiết bị, thiết bị đang bận, security và lỗi chưa xác định; nội dung lấy từ config.
  - [x] Timeout xin quyền sau 8 giây, cho phép thử lại và dùng generation token để đóng stream trả về muộn hoặc khi component unmount.
  - [x] Nút thủ công luôn khả dụng cùng thông báo role=status; Edge headless kiểm thử quyền denied đạt 60 FPS.
  - [x] Lint, production build, regression 3.2–3.3 và verify:phase3.4 đạt.
- [x] 3.5 Dựng form điều ước, lưu localStorage và animation biến lời ước thành ngôi sao.
  - [x] Form điều ước hiển thị phía trên cụm thổi nến, giới hạn 180 ký tự, có bộ đếm, trạng thái hỗ trợ screen reader và toàn bộ copy/khóa lưu nằm trong config.
  - [x] Chuẩn hóa lời ước, lưu/khôi phục localStorage an toàn và vẫn tiếp tục hiệu ứng khi storage bị chặn.
  - [x] Người xem phải “Giữ điều ước” để mở khóa mic/nút thổi; chữ DOM và ngôi sao 3D chỉ bay sau khi ngọn nến cuối cùng tắt, reduced motion dùng hành trình rút gọn.
  - [x] Edge headless xác nhận form đứng trước nút thổi, khóa/mở đúng thứ tự và sao chỉ bay sau khi nến tắt ở 60 FPS; lint, production build và verify:phase3.5 đạt.
- [x] 3.6 Thêm confetti, mascot phản hồi và trạng thái hoàn tất có thể reset để demo riêng.
  - [x] Confetti 3D dùng một InstancedMesh với 180 mảnh ở Full / 72 mảnh ở Lite; có CSS fallback khi WebGL không khả dụng.
  - [x] Tái sử dụng FairyMascot nguyên bản trong CakeScene, bay vào cạnh bánh, đập cánh và vẫy đũa khi điều ước được giải phóng.
  - [x] Nút “Thử lại nghi thức” reset năm flame, smoke, sao, confetti, mascot, mic và UI; giữ lời ước đã lưu dưới dạng bản nháp để demo lại độc lập.
  - [x] Edge headless đạt 45 FPS desktop Full, 44 FPS mobile Lite và 53 FPS ở lần chụp kiểm tra; lint, production build, regression 3.2/3.5 và verify:phase3.6 đạt.
- [x] 3.7 Kiểm thử mic/nút/touch, quyền riêng tư, resize và hiệu năng Phase 3.
  - [x] Nghiệm thu UI tại `1470×956`, `1470×850` và regression `1440×900` ở DPR 2: panel cùng form/trạng thái/nút mic/nút thủ công đều nằm trong viewport, không tràn ngang; tại khung an toàn panel kết thúc ở y=693/850.
  - [x] Thêm compact-height cho desktop rộng: thu gọn typography/padding, xếp mic và nút thủ công cùng hàng, giữ touch target 48px; Cake giảm scale từ 0.88 xuống 0.76 trên laptop thấp để thấy trọn bánh và nến.
  - [x] Edge/CDP xác nhận tap thật đi qua `touchstart → touchend → click`, mobile 390×844 không tràn ngang và hai thao tác chính cao khoảng 61px.
  - [x] Quyền riêng tư đạt: không gọi `getUserMedia` trước thao tác, chỉ xin đúng một lần sau khi người dùng chọn mic, chỉ yêu cầu audio; denied hiện fallback và nút thủ công vẫn dùng được.
  - [x] Celebration đạt 52 FPS, mic monitoring đạt 57 FPS ở ma trận browser; lint, production build, regression 3.1–3.6, `verify:phase3.7` và `verify:phase3.7:browser` đạt.

**Điểm feedback:** demo độc lập luồng thổi nến và gửi điều ước; duyệt độ nhạy mic/hiệu ứng ăn mừng.

### Phase 4 — Lá thư tay

- [x] 4.1 Dựng phong bì, giấy và chất liệu 3D phù hợp art direction.
  - [x] `LetterScene` procedural gồm thân phong bì hồng, nếp gấp lavender, giấy kem, viền vàng và con dấu sao; không dùng texture/asset bên ngoài.
  - [x] Chất liệu giấy dùng grain sinh bằng code, kết hợp roughness cao; bộ key/fill/rim light giữ palette hồng–lavender–vàng kem.
  - [x] Tách sẵn node giấy và nắp phong bì cho animation ở 4.2; có placement desktop/tablet/mobile và chỉ hiện khi section Letter active.
  - [x] Scene dùng renderer/canvas chung, có lifecycle đầy đủ và script `verify:phase4.1`.
  - [x] Edge headless 1440×900 Full đạt **51 FPS**; kiểm tra trực quan xác nhận card trái và model phải không che nhau.
- [x] 4.2 Animation mở phong bì theo scroll, có thao tác tap/click để demo trực tiếp.
  - [x] Scroll progress điều khiển tuần tự con dấu thu nhỏ, nắp lật quanh bản lề và giấy trượt lên; khi cuộn tiếp sau thao tác tay, scroll giành lại quyền điều khiển.
  - [x] Nút mở/đóng hỗ trợ click, tap, keyboard, `aria-expanded` và thông báo `aria-live`; WebGL fallback vẫn giữ điều khiển DOM hoạt động.
  - [x] `prefers-reduced-motion` chuyển ngay giữa trạng thái đóng/mở, không chạy nội suy dài.
  - [x] Event bridge dùng chung một state animation cho ScrollTrigger và điều khiển trực tiếp, tránh nhân đôi logic giữa React và Three.js.
  - [x] Edge headless click thật xác nhận `aria-expanded` và scene state chuyển tới `open`; Full 1440×900 đạt **50 FPS**.
- [x] 4.3 Nạp placeholder khoảng 10 câu từ config, kiểm thử nhiều độ dài nội dung.
  - [x] Hiển thị đủ 10 câu placeholder từ content/config.js, kèm lời mở đầu, chữ ký và nhãn bản nháp cũng được quản lý bằng config.
  - [x] Chuẩn hóa dữ liệu câu an toàn, phân loại nội dung ngắn/vừa/dài và giữ vùng đọc cuộn độc lập để nội dung dài không đẩy vỡ card.
  - [x] Kiểm thử cấu trúc với nội dung 1, 10 và 20 câu; nội dung rỗng có fallback, vùng đọc chỉ nhận focus sau khi phong bì mở.
- [x] 4.4 Dựng typing/handwriting effect và phiên bản tức thời cho prefers-reduced-motion.
  - [x] Mỗi câu dùng ink-reveal theo nhịp riêng được tính từ độ dài, giới hạn tổng thời gian khoảng 11 giây và tự chạy lại khi mở thư lần nữa.
  - [x] Nội dung đầy đủ vẫn có sẵn trong DOM cho công nghệ hỗ trợ; vùng đọc tự trở về đầu khi mở lại.
  - [x] prefers-reduced-motion bỏ toàn bộ reveal/transition và hiển thị tức thời lời chào, nội dung cùng chữ ký.
- [x] 4.5 Hoàn thiện bố cục desktop/mobile, contrast, scrolling nội dung dài và đo FPS.
  - [x] Thêm compact-height riêng cho Letter tại desktop thấp; trạng thái mở nằm trọn các viewport 1470×956, 1470×850 và 1440×900.
  - [x] Mobile 390×844 không tràn ngang, nút mở thư nằm trong viewport; nội dung dài cuộn độc lập với touch/overscroll và scrollbar rõ ràng.
  - [x] Màu chữ chính đạt contrast trên 7:1, copy phụ đạt tối thiểu 4.5:1 trên nền giấy sáng.
  - [x] Edge headless đạt 60 FPS ở cả ba viewport desktop và mobile; reduced-motion xác nhận không chạy handwriting animation.

**Điểm feedback:** duyệt phong bì, font, tốc độ viết và diện tích dành cho thư thật.

### Phase R — Refinement Pass 1: Intro, Hero, Cake, Letter và điều phối section

**Nguồn yêu cầu:** REFINEMENT-PLAN.md.

**Trạng thái và thứ tự:** Phase R là gate bắt buộc sau Phase 4 và trước Phase 5. Thực hiện tuần tự
R0 → R1 → R2 → R3 → R4 → R5 → R6 → R7; không bắt đầu Gallery, Outro, âm thanh hoặc bàn giao cho tới
khi R7 đạt. Các Phase 1–4 đã hoàn thành được giữ làm baseline regression, không sửa lại checklist lịch sử.

**Quy tắc khi refinement xung đột với baseline:**

- Vẫn chỉ có một renderer/canvas Three.js và một nguồn trạng thái section; không giải quyết chồng lấn bằng
  cách tạo thêm renderer hoặc timeline độc lập.
- Nút “thổi bằng nút” có thể bỏ khỏi UI chính, nhưng click/tap vào ngọn nến phải trở thành fallback thủ công
  đầy đủ; WebGL fallback và keyboard vẫn cần một điều khiển tương đương khi không thể hit-test ngọn nến.
- Auto-scroll Cake → Hero chỉ chạy trong nghi thức gửi điều ước, có thể bị người dùng ngắt bằng wheel/touch/
  keyboard; reduced motion dùng chuyển trạng thái ngắn, không ép camera chạy ngược một quãng dài.
- Mascot phụ và “twinkle” trang trí phải là thiết kế nguyên bản theo hệ hình hiện tại, không sao chép mascot
  Twinkle hoặc nhân vật Disney từ ảnh tham khảo.
- Nội dung cá nhân mới tiếp tục đi qua content/config.js. Nội dung trong REFINEMENT-PLAN.md được xem là bản
  copy đã yêu cầu cho prototype refinement, nhưng vẫn cần duyệt lại trước Phase 7.

#### Phase R0 — Đóng băng baseline và lập bản đồ regression

- [x] R0.1 Chụp lại trạng thái kỹ thuật của Intro/Hero/Cake/Letter: trigger, scene active, DOM overlay, fallback,
  reduced motion, Lite Mode và các script verify đang có.
- [x] R0.2 Lập ma trận ánh xạ từng yêu cầu REFINEMENT-PLAN 1.0–1.5 sang R1–R7; ghi rõ file/module dự kiến sửa.
- [x] R0.3 Bổ sung bộ smoke test full journey Intro → Hero → Cake → Letter để phát hiện section/mascot chồng lấn
  trước khi thay kiến trúc.
- [x] R0.4 Chốt baseline viewport 1470×956, 1470×850, 1440×900 và 390×844; lưu số FPS và lỗi console ban đầu.
  - [x] Full journey 1470×850: Intro lock đạt, hoàn tất sau 14.827 ms; Hero/Cake/Letter đều 60 FPS.
  - [x] Browser matrix đạt 59–61 FPS, không tràn ngang, không runtime exception; ghi nhận favicon.ico 404
    không chặn và overlap DOM tại ranh giới section làm baseline cho R1.
  - [x] Lint, production build, verify:refinement-r0 và toàn bộ regression Phase 1–4 đạt.

**Gate R0:** chưa thay đổi UI; lint, build và regression Phase 1–4 vẫn đạt, có báo cáo baseline để so sánh.

#### Phase R1 — Section Manager và sân khấu một khung hình

- [x] R1.1 Tách xác định active section khỏi App.jsx thành một SectionManager/context có một nguồn trạng thái
  duy nhất cho Intro, Hero, Cake và Letter.
- [x] R1.2 Chuẩn hóa ngưỡng enter/active/leave và chiều cuộn cho từng section; chỉ cho phép active section cùng
  tối đa một section liền kề tồn tại trong khoảng transition.
- [x] R1.3 Sau transition, section không active phải dùng visibility hidden, pointer-events none và trạng thái
  accessibility phù hợp; focus không được nằm lại trong section đã ẩn.
- [x] R1.4 Nối SectionManager với SceneManager để chỉ scene 3D cần thiết được visible/update; loại bỏ logic
  Hero/Cake/Letter tự bật tắt lẫn nhau rải rác trong App.jsx.
- [x] R1.5 Dựng crossfade + dịch chuyển nhẹ giữa section, đồng bộ DOM và camera/scene progress; reduced motion
  dùng cut/fade ngắn.
- [x] R1.6 Giữ demo trực tiếp qua query section, WebGL fallback và refresh giữa hành trình hoạt động độc lập.
- [x] R1.7 Kiểm thử cuộn lên/xuống nhanh, wheel/touch/keyboard, resize giữa transition và lịch sử focus.

**Gate R1:** ngoài transition chỉ thấy và tương tác đúng một section; không có hai mascot/scene chồng nhau,
không click xuyên section ẩn, không giật do nhiều scene cùng update.

#### Phase R2 — Refinement Intro và chuyển cảnh sang Hero

- [x] R2.1 Giữ nguyên terminal, Matrix rain, lock input 10 giây và trạng thái hoàn tất hiện tại.
- [x] R2.2 Gỡ shatter/fragments, star burst và confetti khỏi chuyển cảnh Intro.
- [x] R2.3 Dựng timeline mới: đạt 100% → giữ 3 giây → tối dần tới đen trong 3 giây → sáng dần vào Hero trong
  2 giây.
- [x] R2.4 Bàn giao active section cho SectionManager tại màn đen, bảo đảm Intro không xuất hiện lại hoặc nhận
  pointer/focus sau khi Hero sáng hoàn toàn.
- [x] R2.5 Thêm watchdog/fallback cho lỗi animation và phiên bản reduced motion vẫn giữ đúng thứ tự trạng thái.
- [x] R2.6 Kiểm thử timing bằng clock, refresh, tab background/foreground và entry mặc định lẫn stage landing.
  - [x] Clock model đạt đúng biên 2.999/3.000/4.999/5.000 ms; listener visibilitychange/pageshow bắt kịp
  wall-clock khi tab trở lại và không phụ thuộc CSS animationend.
  - [x] Edge headless 1470×850: entry mặc định đạt fade 3.007s → 2.033s; stage landing đạt 3.053s → 1.996s;
  mô phỏng foreground phục hồi trong 4ms và kết thúc chỉ Hero có thể tương tác.
  - [x] Landing không còn chờ AudioContext unlock; browser chặn audio không thể làm treo animation.
  - [x] Lint, production build, regression Phase 1/R1 và verify:refinement-r2 đạt.

**Gate R2:** không còn hiệu ứng nứt vỡ/confetti; timing 3s giữ → 3s tối → 2s sáng đạt sai số kiểm thử cho phép,
kết thúc ở Hero duy nhất.

#### Phase R3 — Hero redesign

- [x] R3.1 Chuyển toàn bộ copy Hero mới vào config: tag ngày, tiêu đề script “Happy Birthday Ngiu Hiền Lương
  xinh đẹp của a” và dòng thời gian/only-you; xác nhận UTF-8 và glyph tiếng Việt, đặc biệt chữ “Hiền”.
- [x] R3.2 Thu gọn card chính và chỉ giữ ba nhóm nội dung đã duyệt; bỏ ba stat block và bỏ CTA bắt đầu hành trình.
- [x] R3.3 Dựng typography script/bay bổng, line wrapping và contrast cho desktop/mobile/fallback.
- [x] R3.4 Tạo loop reveal/marquee chậm cùng gradient cho cụm “I love u… only you”; reduced motion hiển thị tĩnh.
  - [x] Copy Hero mới nằm hoàn toàn trong content/config.js; headline giữ đúng UTF-8 “Hiền Lương”.
  - [x] Dancing Script self-host/OFL có subset Vietnamese; Quicksand là fallback đầy đủ dấu, không dùng CDN.
  - [x] Card chỉ còn tag ngày, headline và timeline/only-you; DOM không còn stat, milestone hoặc CTA cũ.
  - [x] Edge headless đạt 61 FPS tại 1470×850, 61 FPS reduced-motion tại 1440×900 và 60 FPS tại
  390×844; WebGL fallback 390×844 cũng giữ card/text trong khung. Mọi case không tràn ngang và reduced
  motion hiển thị tĩnh.
- [x] R3.5 Cân lại thứ bậc nội dung và tăng chất lãng mạn trước khi thêm vật thể trang trí.
  - [x] Giữ tag ngày sinh nhật làm thông tin phụ; thay câu timeline khô bằng một câu cảm xúc lấy từ config,
    ưu tiên mô-típ “1.111 ngày được bên em bé” nhưng phải ghi rõ đây là cột mốc 16/09/2026, không làm sai mốc
    1.112 ngày tại sinh nhật 17/09/2026.
  - [x] Tăng kích thước/contrast của “I love u… only you” để trở thành điểm nhấn thị giác thứ hai sau headline;
    vẫn giữ reveal/gradient chậm và trạng thái tĩnh cho reduced motion.
  - [x] Thêm một trái tim nhỏ pulse cạnh tên trong headline và sparkle nhẹ cạnh tag; không animate toàn bộ chữ,
    không làm thay đổi semantic text hoặc khiến screen reader đọc icon trang trí.
  - [x] Lint, production build và verify R3.5 đạt; Edge headless ghi nhận 61 FPS tại 1470×850, 60 FPS ở
    reduced-motion 1440×900 và 61 FPS tại 390×844; fallback mobile không tràn ngang hoặc vượt khung.
- [x] R3.6 Hoàn thiện mascot chính làm neo thị giác cho nửa phải.
  - [x] Giữ pose/model hiện tại; sửa ngôi sao trên mũ thẳng tâm với chóp mũ ở mọi animation, breakpoint và scale.
  - [x] Thêm halo mềm vàng–hồng phía sau mascot bằng một lớp/draw call nhẹ; halo không được làm giảm contrast card.
  - [x] Cân lại vị trí/scale mascot và dải gradient blend ở vùng giữa card–mascot để hai nửa Hero hòa vào nhau,
    đồng thời chừa vùng thở rõ quanh headline.
  - [x] Halo dùng đúng một draw call và đi cùng transform mascot; phép đo ổn định 2 giây trên Edge headless đạt
    54 FPS tại 1470×850, 60 FPS reduced-motion, 57 FPS mobile và 57 FPS fallback mobile; lint, build và
    regression 2.2–2.3 đạt.
- [x] R3.7 Làm đầy khoảng trống bên phải bằng một bộ trang trí tĩnh có giới hạn, nghiệm thu bố cục trước khi animate.
  - [x] Gỡ garland “HAPPY BIRTHDAY” theo feedback; giữ khoảng thở phía trên mascot cho phép thuật.
  - [x] Bố trí 3–4 bóng bay/lồng đèn tim với kích thước và độ sâu khác nhau trong khoảng card–mascot; không xếp đều,
    không che mặt, đũa phép, headline hoặc love line.
  - [x] Gỡ cụm hoa/lá low-poly dưới mascot và bản CSS fallback theo feedback; giữ chân mascot thoáng.
  - [x] Nghiệm thu Edge headless đạt 57 FPS desktop Full, 60 FPS reduced motion, 57 FPS mobile và 43 FPS fallback
    mobile; lint, production build, structural verify và browser regression đều đạt.
- [x] R3.8 Thêm chuyển động phép thuật chính cho mascot và đũa phép.
  - [x] Tạo một idle gesture ngắn lặp chậm: mascot vẫy đũa, đầu đũa phát sparkle rồi rắc trail kim tuyến xuống;
    trail rộng/dài hơn hiện tại nhưng phải dùng lại `MagicTrail`, có trần hạt Full/Lite và không phát liên tục dày đặc.
  - [x] Bóng bay đung đưa lệch pha rất nhẹ; reduced motion giữ tĩnh, không thay bằng loop khác.
  - [x] Mỗi vài giây chỉ cho phép một shooting-star trail chạy chéo rồi mờ hẳn; tái sử dụng pool, tạm dừng khi Hero
    không active hoặc tab bị ẩn.
  - [x] Edge headless đạt 50 FPS desktop Full, 56 FPS Lite, 59 FPS reduced motion, 54 FPS mobile và 46 FPS
    fallback mobile; lint, build, structural verify và browser regression đều đạt.
- [x] R3.9 Chuẩn hóa companion để card chính có chuyển động phụ nhưng mascot vẫn là tâm điểm duy nhất.
  - [x] Gỡ hoàn toàn tiên phụ để không tạo thêm nhân vật cạnh tranh với mascot chính.
  - [x] Giữ đúng hai trái tim có cánh chạy quỹ đạo elip chậm quanh card chính; Lite Mode và compact chỉ giữ một
    companion, reduced motion đặt companion ở pose tĩnh và toàn bộ nằm trong canvas phía sau card.
  - [x] Gỡ hoàn toàn bong bóng thoại và copy liên quan khỏi config/DOM/CSS theo feedback.
- [x] R3.10 Chuẩn hóa chiều sâu ba lớp và pointer parallax cho toàn Hero.
  - [x] Lớp xa gồm gradient/sao nền; lớp giữa gồm mascot, halo và companion; lớp gần gồm bóng bay gần và
    sparkle. Mỗi lớp có hệ số parallax riêng nhưng cùng chịu progress/active state từ SectionManager.
  - [x] Giới hạn pointer offset, nội suy mượt và reset khi pointer rời viewport; không để vật thể vượt vùng an toàn
    hoặc gây say chuyển động.
  - [x] Công bố budget cho số geometry, draw call và particle của toàn Hero; không tạo renderer/canvas hay RAF loop mới.
  - [x] R3.10 verification: lint, production build, functional parallax/lifecycle/anchor/resource tests and
    regressions 2.2/2.3, R3.6-R3.9 passed. Edge headless pointer sweep (8 seconds): Full 57 FPS,
    Lite 59 FPS, reduced motion 60 FPS, mobile 59 FPS, fallback mobile 59 FPS; no horizontal overflow
    or console errors. Desktop screenshot reviewed. Physical-device Chrome Performance profiling remains
    part of R3.12/R7; these measurements are local Edge CDP/rAF results.
  - [x] Budget: 61 resident geometries; <=80 draw submissions including transparent double-sided passes
    (conservative traversal count: 69); particles Full 1,526 / Lite 466. No extra renderer, canvas or RAF.
    Pointer translation caps far/middle/near: 2/6/10 CSS px at reference depth, vertical factor 0.65;
    compact factor 0.45, Lite factor 0.7, progressive attenuation on Hero exit. Touch/reduced motion: off.
- [ ] R3.11 Cân responsive và các chế độ suy giảm sau khi bản desktop được duyệt.
  - [ ] Nghiệm thu trước tại 1470×956, vùng an toàn 1470×850 và regression 1440×900; sau đó mới xếp lại tablet/mobile
    theo ưu tiên giữ headline, love line và mascot chính.
  - [ ] Ở compact/mobile, cho phép ẩn lần lượt shooting star, một phần bóng bay và companion thứ hai;
    không thu nhỏ tất cả tới mức khó đọc chỉ để giữ đủ trang trí.
  - [ ] WebGL fallback 2D giữ cùng quan hệ card–mascot–halo và một bộ trang trí rút gọn; Lite Mode giảm hạt/geometry,
    còn reduced motion loại loop, marquee chuyển động, sway và parallax nhưng giữ nguyên nội dung.
- [ ] R3.12 Kiểm thử và chốt Gate Hero redesign.
  - [ ] Kiểm tra screenshot/bounding tại toàn bộ viewport mục tiêu, hai chiều scroll/transition và deep-link Hero;
    không tràn ngang, không che chữ, không click xuyên section và không để focus trong phần trang trí ẩn.
  - [ ] Kiểm tra DOM/copy UTF-8, “Hiền Lương” đủ dấu, mốc 1.111/1.112 không sai, không còn stat/CTA cũ và icon
    trang trí không làm nhiễu accessibility tree.
  - [ ] Đo FPS Full/Lite trong idle, pointer parallax và chuỗi vẫy đũa/shooting star; kiểm tra giải phóng pool/listener
    khi rời Hero, lint, production build và toàn bộ regression Phase 1–R2.

**Các điểm review nhỏ của R3:** duyệt lần lượt sau R3.5 (copy), R3.6 (neo mascot), R3.7 (mật độ tĩnh),
R3.8–R3.9 (nhịp chuyển động/nhân vật phụ) và R3.11 (responsive). Không triển khai lát kế tiếp để che lỗi bố cục
của lát trước.

**Gate R3:** copy đủ dấu và đúng mốc ngày; card giữ đúng ba nhóm nội dung; nửa phải đầy nhưng có một tâm điểm chính;
trang trí không che chữ/mặt/đũa phép; sao trên mũ đúng trục; reduced motion, fallback và Lite Mode đầy đủ; Hero đạt
tối thiểu 30 FPS trên máy tầm trung.

**Điều chỉnh thứ tự theo yêu cầu người dùng (06/09/2026):** triển khai R4.1 trước; giữ R3.11 và R3.12 để làm sau.
Gate R3 vẫn mở và toàn bộ tiêu chí nghiệm thu còn nguyên.

#### Phase R4 — Cake layout, trigger và tương tác nến

- [x] R4.1 Đảo bố cục Cake: bánh bên trái, card điều ước bên phải; cập nhật camera/placement cho desktop,
  compact-height, mobile và fallback.
  - [x] Desktop dùng hai cột với vùng bánh bên trái và card bên phải; placement 3D được chiếu từ bounding box DOM
    sang world space của camera dùng chung, nên giữ đúng tâm và scale sau resize mà không tạo canvas/renderer mới.
  - [x] Tablet/mobile xếp bánh phía trên card; CSS fallback có bánh ba tầng, topper và năm nến trong cùng vùng hiển thị,
    đồng thời tiếp tục phản ánh trạng thái thổi nến/reset khi WebGL không khả dụng.
  - [x] Compact-height giữ card và bánh trong viewport tại 1280x720; ánh sáng được bù theo scale để bánh mobile
    không bị tối khi nguồn sáng co theo group.
  - [x] Lint, production build và regression Phase 3.1/3.2/3.5/3.6 đạt. Edge headless kiểm tra 1470x956,
    1470x850, 1440x900, 1280x720 Lite, 820x1180, 390x844 Lite, reduced motion và WebGL fallback desktop/mobile;
    mọi case đạt 60 FPS, không tràn ngang, giữ đúng thứ tự bánh/card và hoàn tất được thổi nến/reset.
- [x] R4.2 Chuyển ngưỡng active/reveal sang SectionManager để bánh chỉ xuất hiện khi Cake vào đủ khoảng 60–80%,
  không ló sớm từ Hero.
  - [x] SectionManager công bố `scenePresence`/`sceneSectionIds` riêng với DOM presence; Cake bắt đầu reveal ở 65%
    và đạt 100% tại 80% của transition Hero → Cake. Cuộn ngược dùng đúng cùng biên, không hysteresis.
  - [x] Phép đo section dùng offset layout không chịu CSS transform, tránh ngưỡng bị trôi theo hướng cuộn; SceneManager
    truyền `setRevealProgress` trong snapshot hiện có, không thêm RAF/timeline/canvas.
  - [x] Deep-link Cake mở model ở 100%; WebGL fallback dùng cùng `--scene-presence`; reduced motion bỏ dịch chuyển/scale
    reveal, vẫn giữ ngưỡng và trạng thái nội dung.
  - [x] Structural verify, lint, production build, regression R1 và Phase 3.1/3.2/3.5 đạt. Edge kiểm tra cuộn xuôi/ngược,
    deep-link và fallback đạt 60 FPS; browser regression R1 đạt 59–61 FPS ở desktop, intro journey, reduced motion
    và mobile; R4.1 browser matrix tiếp tục đạt 60 FPS.
- [x] R4.3 Sửa topper/ngôi sao chính thẳng tâm với tầng bánh trên cùng và công bố world anchor ổn định cho R5.
  - [x] Topper và chân đỡ cùng trục X/Z với tầng trên; chân chạm mặt bánh. Ngôi sao có một cánh hướng lên và thanh đỡ tiếp xúc tại hõm giữa hai cánh dưới; extrusion sao căn giữa độ dày trước khi xoay. CSS fallback căn giữa bằng 50% + translateX.
  - [x] `CakeScene.getTopperWorldPosition(target?)` trả tâm sao trong world space và cập nhật matrix cha khi đọc. R5 gọi sau scene update, tái sử dụng Vector3; scene ẩn vẫn có anchor, trước mount/sau dispose trả null. Không thêm renderer/RAF.
  - [x] `npm run verify:refinement-r4.3`: 80 mẫu resize/scroll/reveal/full/lite/reduced motion, reset và dispose. Lint, build, regression R4.2 và Phase 3.1 đạt.
  - [x] Đã kiểm tra ảnh desktop 1470×850; browser regression R4.1/R4.2 bằng Edge headless/CDP đạt 60–61 FPS mẫu requestAnimationFrame. Chưa thay thế phép đo Chrome DevTools Performance trên máy tầm trung.
- [x] R4.4 Rút card còn tiêu đề, ô điều ước + nút gửi và nút microphone; copy/trạng thái lỗi vẫn lấy từ config.
  - [x] Gỡ section number/icon, eyebrow, mô tả và phase note khỏi riêng card Cake; đổi tiêu đề thành “Một điều ước nhỏ”.
  - [x] Form dùng copy “Gửi điều ước”; label, hint và live status vẫn semantic nhưng không tạo thêm chrome thị giác.
  - [x] Nút microphone cùng các trạng thái requesting/calibrating/listening/error tiếp tục lấy toàn bộ copy từ config.
  - [x] Nút thổi thủ công được giữ tạm để không làm mất fallback trước khi raycast từng nến thay thế nó ở R4.5.
  - [x] Lint, production build, verify R4.2–R4.4 và regression Phase 3.4/3.5 đạt; browser matrix R4.1 tiếp tục
    đạt 60 FPS ở desktop, compact-height, tablet, mobile, reduced motion và WebGL fallback, không tràn viewport.
- [x] R4.5 Gỡ nút thổi thủ công khỏi UI chính; thêm raycast hit-area cho từng ngọn lửa để click/tap tắt từng nến,
  hỗ trợ debounce và trạng thái nến đã tắt.
  - [x] Gỡ component, handler, copy và CSS của nút thổi thủ công; trạng thái lỗi mic hướng người xem chạm trực tiếp
    từng ngọn lửa và vẫn lấy copy từ config.
  - [x] Năm hit-area riêng dùng chung geometry/material, Raycaster/Vector2 được tái sử dụng; tọa độ client chuyển
    sang NDC theo canvas rect nên độc lập DPR/resize và chỉ hoạt động khi Cake active, reveal đủ, điều ước sẵn sàng.
  - [x] Mỗi pointer gesture chỉ tắt đúng một flame; nến đã tắt/đang tắt không nhận hit lại, có debounce 220ms,
    smoke/glow/litCount cập nhật theo từng nến và mic vẫn tắt toàn bộ phần còn lại.
  - [x] Reset phục hồi đủ năm flame/hit state; dispose gỡ listener và giải phóng hit-area, không thêm canvas/renderer/RAF.
  - [x] Lint, build, verify R4.2–R4.5 và regression Phase 3.1/3.3–3.5 đạt. Edge CDP xác nhận mouse/touch,
    duplicate gesture và zero exception: 57 FPS desktop DPR 2, 60 FPS mobile DPR 2, không tràn ngang.
- [x] R4.6 Tạo keyboard/WebGL fallback tương đương cho tương tác từng nến; mic denied/timeout/unsupported không
  được chặn hoàn thành nghi thức.
  - [x] Bổ sung event kích hoạt theo chỉ số dùng chung; WebGL đi qua state machine flame hiện có, kiểm tra active,
    reveal, điều ước, biên index và trạng thái nến trước khi tắt đúng một ngọn.
  - [x] Năm button semantic hỗ trợ Tab/Enter/Space, có nhãn sáng/tắt từ config và focus ring; fallback CSS cho phép
    click/tap/keyboard trực tiếp từng nến, nến đã tắt bị disabled và reset phục hồi đủ năm nến.
  - [x] Denied được kiểm thử trực tiếp trong Edge và không khóa ba nến còn lại; regression Phase 3.4 xác nhận thêm
    timeout/unsupported cùng phân loại lỗi và cleanup stream muộn.
  - [x] Lint, production build, verify R4.2–R4.6 và browser regression R4.5 đạt. Edge CDP DPR 2 xác nhận Enter/Space,
    fallback, reset và zero exception: 61 FPS WebGL, 60 FPS fallback; R4.5 đạt 59 FPS desktop/60 FPS mobile.
- [x] R4.7 Gỡ CelebrationConfetti và CakeFairyCelebration khỏi bundle/lifecycle Cake; giữ reset demo không rò rỉ
  event, geometry hoặc audio stream.
  - [x] Gỡ import, khởi tạo, scene node, trigger/update, quality, reset và dispose của hai hiệu ứng khỏi CakeScene; xóa hai
    module nguồn không còn consumer. Production bundle và source hiện hành không còn class/tên node celebration cũ.
  - [x] Gỡ confetti DOM/CSS fallback cùng keyframe responsive/reduced-motion; vẫn giữ wishReleased, WishStarFlight,
    live status và nút reset như hợp đồng chức năng của nghi thức.
  - [x] Verify R4.7 xác nhận wish release, reset về idle/litCount = 5, cleanup listener/hit-area/scene resources và
    không nhân đôi reset sau dispose. Regression R4.2–R4.6, Phase 3.4–3.6, lint và production build đều đạt.
  - [x] Edge CDP regression R4.6 đạt 61 FPS WebGL và 60 FPS fallback; Enter/Space, mic denied không chặn flow,
    reset và zero exception tiếp tục đạt. Cake production chunk 17,93 kB trước gzip.
- [ ] R4.8 Kiểm thử trigger hai chiều, hit-test ở DPR/tỉ lệ màn hình khác nhau, mic privacy, touch target và FPS.

**Gate R4:** bánh chỉ hiện đúng ngưỡng, bố cục bánh trái/card phải, topper đúng tâm, card đúng ba thành phần,
không confetti/mascot phụ và mọi môi trường vẫn có cách tắt đủ nến.

#### Phase R5 — Hành trình điều ước Cake → Hero

- [x] R5.1 Chuẩn hóa ba anchor dùng chung: nguồn từ ô điều ước, topper sao trên bánh và đầu đũa mascot Hero;
  chuyển đổi chính xác giữa DOM, world space và screen space sau resize.
  - [x] Tạo JourneyAnchorRegistry do SceneManager sở hữu và truyền qua scene context; ba ID wish-source/cake-topper/
    hero-wand-tip dùng provider DOM/world có cleanup theo registration token, không thêm canvas, renderer hoặc RAF.
  - [x] WishInput công bố DOM hook ổn định; Cake đăng ký source + topper, Hero đăng ký đầu đũa. Getter world cập nhật
    parent matrix khi đọc, dùng được khi scene ẩn và trả null trước mount/sau dispose.
  - [x] Chuẩn hóa client ↔ NDC, world → client và client → world trên mặt phẳng Z theo canvas bounding rect/camera;
    round-trip đạt sai số dưới 1e-8 qua resize, canvas offset và không phụ thuộc DPR.
  - [x] Verify R5.1, regression R3.10/R4.3/R4.7, lint và production build đạt; resource budget Hero không đổi.
    Edge CDP regression đạt 60 FPS WebGL, 61 FPS fallback; keyboard, mic denied và reset tiếp tục đạt.
- [x] R5.2 Thay celebration cũ bằng chuỗi hạt/sao: chữ trong input tan thành hạt → hội tụ vào topper Cake.
  - [x] WishParticleConvergence dùng một draw call, budget Full/Lite 96/40 và reduced-motion; geometry/material được tái sử dụng qua launch/reset.
  - [x] Dùng wish-source/cake-topper từ JourneyAnchorRegistry, retarget mượt khi resize/transform và chốt chính xác tại topper; chưa bay sang Hero.
  - [x] Thay DOM copy bay chéo bằng dissolve tại nguồn; fallback vẫn hoàn tất callback để reset không bị kẹt.
  - [x] Gỡ WishStarFlight cũ khỏi Cake bundle; verify quỹ đạo/endpoint/reset/dispose và regression liên quan đều đạt.
  - [x] Lint, production build và Edge CDP đạt; WebGL convergence 40 FPS, fallback 60 FPS, reset đạt.
- [x] R5.3 Tiếp tục đường bay topper Cake → sao trên đũa Hero trong renderer/canvas dùng chung, không teleport
  hoặc tạo particle system thứ hai ngoài quản lý.
  - [x] Tái sử dụng đúng một WishParticleConvergence/BufferGeometry/ShaderMaterial/draw call cho cả hai chặng; launchContinuation
    giữ nguyên seed/resource và bắt đầu toàn bộ hạt chính xác tại topper.
  - [x] CakeScene điều phối state source-to-topper → topper-to-wand → complete, đọc live cake-topper/hero-wand-tip từ
    JourneyAnchorRegistry và retarget mượt sau resize/transform; event state sẵn sàng cho R5.4 nhưng chưa tự scroll.
  - [x] Full/Lite giữ budget 96/40 hạt, reduced motion rút ngắn cả hai chặng; reset/dispose dừng sạch và dùng lại được,
    không thêm canvas, renderer, RAF hay particle system thứ hai.
  - [x] Verify R5.3, R5.1/R5.2, R4.7, Phase 3.5/3.6, lint và production build đạt. Edge headless DPR 2 xác nhận đúng
    thứ tự ba state, scroll không đổi, zero exception và 54 FPS trong hành trình.
- [x] R5.4 Điều phối auto-scroll ngược Cake → Hero qua SectionManager, đồng bộ camera, active scene và đường bay.
  - [x] `SectionManager` sở hữu tween hữu hạn Cake → Hero, cập nhật snapshot tối đa khoảng 30Hz và khôi phục trạng thái scroll sau khi hoàn tất.
  - [x] `App` điều phối lifecycle hành trình; `SceneManager` giữ Cake update khi inactive và tạm hạ DPR trong lúc chuyển cảnh.
  - [x] Particle dùng cùng một resource, bay theo tọa độ world-space từ nguồn sáng → topper → đầu đũa phép.
  - [x] Đã có verify tĩnh và browser CDP cho thứ tự stage, active section, scroll, DPR phục hồi và lỗi runtime.
  - [x] Kết quả Edge DPR 2: 37 FPS, scroll 870 → 0, đủ 3 stage, không có exception.
- [ ] R5.5 Cho phép wheel/touch/keyboard hủy auto-scroll an toàn; khóa chống kích hoạt lặp và phục hồi focus/
  scroll state sau khi hoàn thành hoặc hủy.
- [ ] R5.6 Reduced motion dùng fade/teleport có chủ đích; WebGL fallback dùng DOM/CSS nhưng giữ đúng thứ tự
  input → topper → Hero.
- [ ] R5.7 Reset nghi thức đưa mọi anchor, particle, nến, điều ước và active section về trạng thái test được.
- [ ] R5.8 Kiểm thử full journey, resize giữa flight, scroll ngược xuôi, cancel, fallback và FPS.

**Gate R5:** trình tự input → topper → đũa phép đúng, camera/scroll theo được đường bay, người dùng luôn có thể
ngắt chuyển động và không phát sinh section/mascot chồng lấn.

#### Phase R6 — Letter rebuild: phong bì duy nhất và chữ trên giấy

> Trạng thái triển khai: theo quyết định ngày 12/09/2026, R5.6–R5.8 được tạm hoãn và Gate R5 vẫn để mở;
> R6.1–R6.2 đã hoàn tất độc lập. Việc chuyển phase không được xem là nghiệm thu các mục R5 còn pending.

- [x] R6.1 Bỏ card thông tin, nút hiển thị và preview thư bên cạnh; section chỉ còn phong bì làm tâm điểm.
  - [x] StorySection dùng shell Letter rỗng, giữ lifecycle/scene binding nhưng không còn card, heading, nút,
    status hoặc preview DOM; data nội dung và event API được giữ lại cho R6.2–R6.7.
  - [x] Xóa CSS UI Letter cũ và cân lại LetterScene về giữa khung nhìn desktop/tablet/mobile.
  - [x] Verify Phase 4.1–4.5, R6.1, lint và production build đạt; Edge CDP 1470×956, 1470×850,
    1440×900 reduced-motion và 390×844 đều không overflow, đúng một canvas và đạt 60–61 FPS.
- [x] R6.2 Tạo vùng tương tác vô hình nhưng semantic bám phong bì để click/tap/Enter/Space mở thư; không làm mất
  accessibility khi bỏ UI nút nhìn thấy.
  - [x] LetterInteractionSurface dùng button HTML thật, đồng bộ aria-expanded/aria-label với letterEvents và
    chỉ enabled/tabbable khi Letter active với presence hoàn toàn.
  - [x] Hit area responsive bám phép chiếu phong bì, căn theo 50vw để không lệch bởi scrollbar; trạng thái thường
    trong suốt, có focus-visible ring và không phục hồi card/preview cũ.
  - [x] Click/tap, Enter và Space phát đúng một toggle; chuyển sang section khác tự disabled và tabIndex=-1.
  - [x] Verify Phase 4.1–4.5, R6.1/R6.2, lint và production build đạt; Edge CDP trên 1470×956, 1470×850,
    1440×900 reduced-motion và 390×844 đạt 60–61 FPS, đúng một canvas và không overflow.
- [x] R6.3 Sắp lại graph/layer và mask/clip: khi đóng giấy nằm trong lòng phong bì, bị che bởi miệng và hai mép;
  khi mở giấy trượt lên phía trên nắp đã lật mà không xuyên hoặc lộ sai cạnh.
  - [x] Tách scene graph thành back layer, paper layer, pocket occluder layer và flap layer có tên rõ; giấy là sibling
    độc lập, nằm giữa thân sau và pocket/folds theo chiều sâu thật của WebGL.
  - [x] Thu giấy vừa khoang phong bì ở pose đóng; nắp lật và dịch liên tục ra sau trước khi giấy bắt đầu đi lên,
    không đổi render order đột ngột và không dùng opacity/background giả mask.
  - [x] Verify R6.3 kiểm tra topology, bounding box pose đóng và thứ tự pose 0/25/50/75/100%; R6.1/R6.2,
    lint và production build đạt.
  - [x] Edge headless CDP 1470×956, 1470×850, 1440×900 reduced-motion và 390×844 giữ đúng một canvas,
    không overflow/lỗi runtime, interaction không regress và đạt 60–61 FPS.
- [x] R6.4 Làm chậm mapping scroll-progress của seal, flap và paper; scroll mở liên tục theo phần trăm, còn click
  chạy nhanh tới trạng thái mở hoàn toàn.
  - [x] Mapping ban đầu 4%–96% được R6.8 hiệu chỉnh thành 30%–58% trong runway Letter: bắt đầu sau khi
    Cake rời transition và đạt 100% trước khi Gallery bắt đầu transition.
  - [x] Tách khoảng tiến độ seal, flap và paper; giữ trình tự seal nhả trước, flap lật đáng kể rồi giấy mới trượt lên.
  - [x] Tách response control/scroll theo tỷ lệ 12/4; click hội tụ trên 94% sau 0,25 giây, scroll vẫn chậm và liên tục.
  - [x] Scroll nhỏ không hủy control override; scroll có chủ đích bàn giao về mapping scroll bằng easing liên tục.
  - [x] Verify R6.4, R6.1–R6.3, Phase 4.1–4.5, lint và production build đạt; bỏ browser/headless visual QA theo
    yêu cầu người dùng để người dùng tự quan sát trực quan.
- [x] R6.5 Chọn và triển khai cơ chế đặt chữ trực tiếp trên bề mặt giấy (CanvasTexture hoặc DOM projection bám
  giấy), giữ bản semantic riêng cho screen reader và nội dung từ config. **Đã chọn CanvasTexture.**
  - [x] Vẽ salutation, nội dung, sign-off và signature từ config lên texture gắn trực tiếp vào `paperGroup`.
  - [x] Giữ bản semantic riêng liên kết với nút phong bì; không khôi phục card Letter nhìn thấy.
  - [x] Chỉ hiện mesh chữ khi open progress đạt 100%, dispose đầy đủ và thêm verify R6.5.
  - [x] Verify R6.5, R6.1–R6.4, Phase 4.1–4.5, lint, diff check và production build đạt; browser/headless
    visual QA tiếp tục bỏ theo yêu cầu quan sát trực quan đã chốt ở R6.4.
- [x] R6.6 Chỉ bắt đầu typing khi open progress đạt 100%; đóng/mở lại có quy tắc restart rõ ràng, reduced motion
  hiển thị tức thì.
  - [x] CanvasTexture reveal theo grapheme trên layout cố định; texture chỉ upload khi số chữ hiển thị thay đổi.
  - [x] State idle/typing/complete dùng update loop hiện có; đóng reset bằng hysteresis và mở lại gõ từ đầu.
  - [x] Reduced motion hiển thị trọn thư ngay khi mở; semantic content không announce từng ký tự.
  - [x] Verify R6.6, regression R6.1–R6.5, Phase 4 liên quan, lint và production build đạt.
- [x] R6.7 Xử lý thư 1/10/20 câu bằng pagination, paper expansion hoặc vùng đọc phù hợp mà không đưa card phụ trở lại.
  - [x] Chọn pagination trên CanvasTexture với body 24px cố định; wrap và chia trang theo writing bounds,
    salutation ở trang đầu, sign-off/signature ở trang cuối và không mất/trùng nội dung.
  - [x] Chỉ báo trang được vẽ trên giấy; hai vùng Previous/Next semantic bám giấy, đúng biên và không tạo card phụ.
  - [x] Trang mới typing từ đầu, trang đã đọc hiện đủ khi quay lại; đóng thư reset trang 1 và reduced motion hiện tức thì.
  - [x] Verify fixture 1/10/20 câu, page state/navigation, R6.1–R6.7, Phase 4.1–4.5, lint và build đạt.
- [x] R6.8 Cân camera/scale cho baseline MacBook Air M2 `1470×956`, WebGL fallback 2D, contrast và focus;
  cuộn tiếp sau khi đọc bàn giao sạch sang Gallery placeholder.
  - [x] Theo yêu cầu rút gọn trước delivery, chỉ nghiệm thu `1470×956`; compact-height/tablet/mobile giữ baseline
    cũ và dời khỏi phạm vi tối ưu R6.8.
  - [x] Fallback HTML/CSS dùng cùng config, mở/đóng và phân trang bằng button semantic; không tạo card/renderer/RAF.
  - [x] Letter dùng runway `300svh` với stage sticky `100svh`; mapping 30%–58% cho phép phong bì đóng/mở đủ
    hai chiều và typing bắt đầu trong vùng Letter active, không còn bị Cake/Gallery cắt ngang.
  - [x] Pose mở được tăng paper travel `1.76` và scale `1.08`; tại `1470×956` mép dưới giấy khớp miệng
    phong bì, mép trên nằm trong camera và page controls được nâng theo đúng vùng giấy.
  - [x] WebGL controls bị ẩn trong fallback; section inactive reset/vô hiệu tương tác và Gallery nhận active/focus
    qua SectionManager. Màu giấy/chữ, focus ring và touch target 44px đạt verify.
  - [x] Verify R6.8 tại `1470×956`, regression Phase 4.1, lint và production build đạt; không chạy browser matrix.
- [ ] R6.9 Kiểm thử layer ở các mốc 0/25/50/75/100%, click so với scroll, keyboard/touch, long copy và FPS.

**Gate R6:** chỉ còn phong bì, giấy đúng layer ở mọi trạng thái, click mở nhanh/scroll mở chậm, chữ chỉ gõ sau
100% và xuất hiện trên chính tờ giấy.

#### Phase R7 — Spacing, z-index và nghiệm thu refinement toàn cục

- [ ] R7.1 Định nghĩa token z-index dùng chung theo thứ tự background < section surface < main mascot <
  journey particle < transition overlay < system overlay; loại bỏ magic number xung đột.
- [ ] R7.2 Chuẩn hóa section stage, transition gutter và khoảng dừng đọc để có ranh giới rõ nhưng vẫn mang cảm
  giác một khung hình/camera thay đổi.
- [ ] R7.3 Rà soát bounding, visibility và lifecycle của mọi mascot/particle qua Intro/Hero/Cake/Letter.
- [ ] R7.4 Chạy full journey hai chiều với wheel/touch/keyboard, refresh/deep-link, resize, reduced motion,
  WebGL fallback, Lite Mode và focus/accessibility.
- [ ] R7.5 Nghiệm thu browser matrix 1470×956, 1470×850, 1440×900, 390×844; không tràn ngang, lỗi console,
  click xuyên hoặc hai section cùng tương tác.
- [ ] R7.6 Đo FPS từng section và transition; tối thiểu 30 FPS trên máy tầm trung, cập nhật verify scripts và
  production build.
- [ ] R7.7 Ghi backlog polish còn lại, cập nhật tài liệu và mở gate Phase 5 chỉ sau khi toàn bộ R1–R7 đạt.

**Gate R7:** toàn bộ acceptance criteria REFINEMENT-PLAN 1.0–1.5 đạt; Phase 1–4 regression vẫn xanh và Phase 5
có thể bắt đầu mà không phải sửa lại kiến trúc section.

#### Bảng ánh xạ REFINEMENT-PLAN → roadmap

| Mục nguồn | Phase triển khai | Phạm vi |
|---|---|---|
| 1.0 Section navigation | R1 | SectionManager, active scene, transition, focus/pointer |
| 1.1 Intro | R2 | Timeline tối/sáng và bàn giao Hero |
| 1.2 Hero | R3 | Copy, card, font, mascot/trang trí, responsive |
| 1.3 Cake | R4 + R5 | Layout/interaction nến và hành trình điều ước liên section |
| 1.4 Letter | R6 | Rebuild phong bì, layer, tương tác và chữ trên giấy |
| 1.5 Spacing & z-index | R7 | Token toàn cục, regression và performance gate |

**Điểm feedback Phase R:** duyệt lần lượt sau từng gate; lỗi của phase nào được giữ trong phase đó, không gom
thành một đợt “polish” lớn ở cuối.

### Phase 5 — Gallery ảnh (tạm hoãn đến khi Phase R hoàn tất)

- [ ] 5.1 Tạo pipeline tối ưu 35 ảnh: thumbnail/WebP dùng trên scene, giữ bản gốc cho modal khi cần.
- [ ] 5.2 Khai báo thứ tự, caption, ngày và đoạn cảm xúc trong config; dùng placeholder ở bản đầu.
- [ ] 5.3 Dựng carousel/polaroid 3D theo đúng thứ tự `1 → 35`, đồng bộ với scroll.
- [ ] 5.4 Thêm parallax pointer/touch, lazy loading và quản lý texture để tránh đầy bộ nhớ GPU.
- [ ] 5.5 Dựng modal toàn màn hình, điều hướng trước/sau, keyboard, swipe và focus management.
- [ ] 5.6 Kiểm thử đủ 35 ảnh, nhiều tỉ lệ khung, Lite Mode và khả năng bổ sung ảnh sau này.

**Điểm feedback:** duyệt nhịp kể chuyện, kiểu khung, số ảnh hiện đồng thời và template caption.

### Phase 6 — Outro, âm thanh và polish (tạm hoãn)

- [ ] 6.1 Chọn/tạo bản Twinkle nhẹ nhàng có quyền sử dụng rõ ràng; chuẩn bị beep, sparkle và celebration SFX.
- [ ] 6.2 Hoàn thiện `AudioManager`: mute/unmute, volume, fade, pause khi tab ẩn và lưu lựa chọn.
- [ ] 6.3 Dựng Outro: mascot bay lên, pháo hoa sao, lời nhắn cuối và copy link.
- [ ] 6.4 Cân chỉnh toàn bộ timeline ScrollTrigger, transition và nhịp âm thanh xuyên suốt.
- [ ] 6.5 Performance pass: particle budget, bloom, shadow, texture, DPR và Lite Mode tự động.
- [ ] 6.6 Kiểm thử Chrome/Edge/Safari, desktop/mobile, WebGL fallback và accessibility.

**Điểm feedback:** duyệt nhạc, âm lượng, Outro và trải nghiệm hoàn chỉnh từ đầu đến cuối.

### Phase 7 — Bàn giao (tạm hoãn)

- [ ] 7.1 Thay nội dung chính thức và rà soát lần cuối dữ liệu/ảnh cá nhân trước khi phát hành.
- [ ] 7.2 Build production, kiểm tra bundle, asset path, cache và lỗi console.
- [ ] 7.3 Deploy static site lên nền tảng được chọn và kiểm thử link thật từ email.
- [ ] 7.4 Viết hướng dẫn chạy local, build, deploy, thay thư/caption/ảnh/âm thanh.
- [ ] 7.5 Nghiệm thu cuối và ghi lại giới hạn còn lại nếu có.

**Điểm feedback:** duyệt bản production, quyền riêng tư của link và tài liệu bàn giao.

## 5. Rủi ro & phương án dự phòng
- **Thiết bị yếu / trình duyệt cũ không hỗ trợ WebGL2** → fallback CSS animation 2D tối giản.
- **Mic permission bị từ chối** → click/tap từng ngọn nến là fallback chính; keyboard và bản 2D cung cấp
  điều khiển tương đương, không chặn luồng trải nghiệm.
- **Auto-scroll Cake → Hero gây mất kiểm soát** → chỉ kích hoạt sau nghi thức gửi điều ước, cho phép hủy ngay
  bằng wheel/touch/keyboard và dùng chuyển trạng thái rút gọn khi reduced motion.
- **Section hoặc mascot chồng lấn trong lúc refinement** → SectionManager là nguồn active state duy nhất;
  phase chưa qua gate không được đẩy thay đổi sang section kế tiếp để che lỗi.
- **Thời gian phát triển 3D chi tiết (mascot, model) tốn công** → giai đoạn đầu dùng shape đơn
  giản (sphere đầu + cone mũ chóp + đơn giản hoá) đúng phong cách "cute low-poly", có thể nâng cấp
  model sau nếu cần độ chi tiết cao hơn.
