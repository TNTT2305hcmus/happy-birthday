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
- [ ] 4.3 Nạp placeholder khoảng 10 câu từ config, kiểm thử nhiều độ dài nội dung.
- [ ] 4.4 Dựng typing/handwriting effect và phiên bản tức thời cho `prefers-reduced-motion`.
- [ ] 4.5 Hoàn thiện bố cục desktop/mobile, contrast, scrolling nội dung dài và đo FPS.

**Điểm feedback:** duyệt phong bì, font, tốc độ viết và diện tích dành cho thư thật.

### Phase 5 — Gallery ảnh

- [ ] 5.1 Tạo pipeline tối ưu 35 ảnh: thumbnail/WebP dùng trên scene, giữ bản gốc cho modal khi cần.
- [ ] 5.2 Khai báo thứ tự, caption, ngày và đoạn cảm xúc trong config; dùng placeholder ở bản đầu.
- [ ] 5.3 Dựng carousel/polaroid 3D theo đúng thứ tự `1 → 35`, đồng bộ với scroll.
- [ ] 5.4 Thêm parallax pointer/touch, lazy loading và quản lý texture để tránh đầy bộ nhớ GPU.
- [ ] 5.5 Dựng modal toàn màn hình, điều hướng trước/sau, keyboard, swipe và focus management.
- [ ] 5.6 Kiểm thử đủ 35 ảnh, nhiều tỉ lệ khung, Lite Mode và khả năng bổ sung ảnh sau này.

**Điểm feedback:** duyệt nhịp kể chuyện, kiểu khung, số ảnh hiện đồng thời và template caption.

### Phase 6 — Outro, âm thanh và polish

- [ ] 6.1 Chọn/tạo bản Twinkle nhẹ nhàng có quyền sử dụng rõ ràng; chuẩn bị beep, sparkle và celebration SFX.
- [ ] 6.2 Hoàn thiện `AudioManager`: mute/unmute, volume, fade, pause khi tab ẩn và lưu lựa chọn.
- [ ] 6.3 Dựng Outro: mascot bay lên, pháo hoa sao, lời nhắn cuối và copy link.
- [ ] 6.4 Cân chỉnh toàn bộ timeline ScrollTrigger, transition và nhịp âm thanh xuyên suốt.
- [ ] 6.5 Performance pass: particle budget, bloom, shadow, texture, DPR và Lite Mode tự động.
- [ ] 6.6 Kiểm thử Chrome/Edge/Safari, desktop/mobile, WebGL fallback và accessibility.

**Điểm feedback:** duyệt nhạc, âm lượng, Outro và trải nghiệm hoàn chỉnh từ đầu đến cuối.

### Phase 7 — Bàn giao

- [ ] 7.1 Thay nội dung chính thức và rà soát lần cuối dữ liệu/ảnh cá nhân trước khi phát hành.
- [ ] 7.2 Build production, kiểm tra bundle, asset path, cache và lỗi console.
- [ ] 7.3 Deploy static site lên nền tảng được chọn và kiểm thử link thật từ email.
- [ ] 7.4 Viết hướng dẫn chạy local, build, deploy, thay thư/caption/ảnh/âm thanh.
- [ ] 7.5 Nghiệm thu cuối và ghi lại giới hạn còn lại nếu có.

**Điểm feedback:** duyệt bản production, quyền riêng tư của link và tài liệu bàn giao.

## 5. Rủi ro & phương án dự phòng
- **Thiết bị yếu / trình duyệt cũ không hỗ trợ WebGL2** → fallback CSS animation 2D tối giản.
- **Mic permission bị từ chối** → nút "Thổi nến" thủ công thay thế, không chặn luồng trải nghiệm.
- **Thời gian phát triển 3D chi tiết (mascot, model) tốn công** → giai đoạn đầu dùng shape đơn
  giản (sphere đầu + cone mũ chóp + đơn giản hoá) đúng phong cách "cute low-poly", có thể nâng cấp
  model sau nếu cần độ chi tiết cao hơn.
