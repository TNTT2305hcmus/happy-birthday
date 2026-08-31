# Refinement Pass 1 — Baseline R0

Ngày lập baseline: 31/08/2026  
Phạm vi: Intro, Hero, Cake, Letter trước khi triển khai SectionManager.

## 1. Mục đích

Tài liệu này đóng băng hành vi hiện tại để các phase R1–R7 có thể sửa từng nhóm lỗi mà không làm mất
những luồng đã hoạt động. Baseline không khẳng định UI hiện tại là đúng; các lỗi chồng section, trigger sớm
và bố cục cần redesign được ghi nhận có chủ đích.

## 2. Kiểm kê điều phối hiện tại

| Khu vực | Nguồn trạng thái/trigger hiện tại | DOM overlay | Scene/WebGL | Fallback và reduced motion |
|---|---|---|---|---|
| Intro | ExperienceGate giữ stage landing/hacker/transition/complete; HackIntro tự chạy clock 10s + hold 3s | Fixed overlay, khóa scroll/wheel/touch/keyboard | WebGL preload phía sau; StarBurstTransition dùng canvas 2D riêng cho chuyển cảnh | Watchdog kết thúc transition; reduced motion chỉ rút animation CSS/particle |
| Hero | ScrollTrigger trong App.jsx, start top bottom, end bottom top | HeroOverlay luôn tồn tại trong section, chưa có visibility/inert theo active section | HeroScene.setActive trực tiếp từ trigger; timeline DOM riêng | HeroFallbackFairy khi WebGL unavailable; reduced motion bỏ scrub timeline |
| Cake | ScrollTrigger trong App.jsx, start top 55%, end bottom top | CakeControls luôn tồn tại trong section | CakeScene tự active và chủ động tắt Hero; celebration có confetti + mascot riêng | Mic có fallback nút thủ công; CSS celebration fallback; Lite budgets |
| Letter | ScrollTrigger trong App.jsx, start top 55%, end bottom top | LetterControls + letter preview luôn tồn tại trong section | LetterScene tự active, tắt Hero/Cake và phục hồi dựa trên trigger khác | DOM open control hoạt động khi WebGL fallback; reduced motion mở tức thì |

## 3. Vòng đời renderer và scene

- SceneManager tạo đúng một WebGLRenderer, một Scene và một PerspectiveCamera.
- HeroScene, CakeScene và LetterScene cùng được mount vào SceneManager khi WebGL khởi tạo.
- SceneManager gọi update trên toàn bộ scene module mỗi frame; từng module tự return khi isActive false.
- Active state chưa có object/controller trung tâm. App.jsx giữ ba ScrollTrigger và viết quy tắc ưu tiên bằng
  các nhánh điều kiện Hero ↔ Cake ↔ Letter.
- Intro không thuộc cùng active-section state. ExperienceGate là fixed overlay độc lập và biến mất sau
  StarBurstTransition.
- Cleanup hiện có: kill ba trigger + Hero timeline, dispose SceneManager, gỡ runtime attributes.

## 4. Baseline lỗi/nợ kỹ thuật đã biết

1. Không có activeSection duy nhất cho DOM và WebGL.
2. Hero trigger phủ từ khi Hero vừa chạm đáy viewport tới khi rời đỉnh, trong khi Cake/Letter bắt đầu tại
   top 55%; vùng trigger có thể giao nhau và phải được giải quyết thủ công.
3. Section DOM không active vẫn nằm trong document flow, accessibility tree và có thể chứa control nhận focus.
4. Không có inert/aria-hidden/visibility contract dùng chung sau transition.
5. Camera vẫn là camera chung nhưng chưa có choreography hoặc transition state chung giữa section.
6. Intro transition hiện còn shatter, star burst và flash; đây là baseline cần thay tại R2.
7. Cake còn nút thổi thủ công, confetti và mascot celebration; đây là baseline cần thay tại R4–R5.
8. Letter còn card/preview DOM bên trái phong bì; đây là baseline cần rebuild tại R6.
9. Trình duyệt yêu cầu favicon.ico nhưng dự án chưa có asset này, tạo một log 404 không chặn; R7 phải đưa
   browser matrix về zero-console thay vì tiếp tục bỏ qua.

## 5. Ma trận file dự kiến theo phase refinement

| Phase | File/module chính dự kiến | Regression phải giữ |
|---|---|---|
| R1 | src/App.jsx, core/SectionManager mới, StorySection.jsx, global.css, SceneManager.js | Deep-link section, fallback, resize, Phase 2–4 |
| R2 | ExperienceGate.jsx, HackIntro.jsx, StarBurstTransition.jsx hoặc module thay thế, config.js, global.css | Intro lock/watchdog/audio-independent |
| R3 | HeroOverlay.jsx, HeroScene.js, FairyMascot.js, HeroFallbackFairy.jsx, config.js, global.css | Một canvas, Lite/reduced motion, UTF-8 |
| R4 | CakeScene.js, CakeControls.jsx, cakeEvents.js, WishInput.jsx, config.js, global.css | Mic privacy/fallback, reset, candle/smoke |
| R5 | WishStarFlight.js, CakeScene.js, HeroScene.js, SectionManager, event bridge | Wish storage, cancel scroll, resize, fallback |
| R6 | LetterScene.js, LetterControls.jsx hoặc semantic replacement, letterEvents.js, config.js, global.css | Config 1/10/20 câu, keyboard/touch, fallback |
| R7 | global.css tokens, scene lifecycle, browser/verify scripts, PLANNING.md | Toàn bộ Phase 1–4 và R1–R6 |

## 6. Inventory kiểm thử trước refinement

- Phase 1: verify:phase1.
- Hero: verify:phase2.1 đến verify:phase2.6 và verify:phase2.6:browser.
- Cake: verify:phase3.1 đến verify:phase3.7 và verify:phase3.7:browser.
- Letter: verify:phase4.1 đến verify:phase4.5 và verify:phase4.5:browser.
- R0 mới: verify:refinement-r0 kiểm tra cấu trúc tài liệu/roadmap; verify:refinement-r0:browser chạy full
  journey và browser matrix.

## 7. Browser baseline

Kết quả verify:refinement-r0:browser:

| Viewport | Intro thật | Hero FPS | Cake FPS | Letter FPS | Horizontal overflow | Console error |
|---|---:|---:|---:|---:|---|---|
| 1470×956 Full | Không | 61 | 61 | 60 | Không | 0 blocking; favicon 404 |
| 1470×850 Full | Có, 14.827 ms | 60 | 60 | 60 | Không | 0 blocking; favicon 404 |
| 1440×900 Reduced | Không | 60 | 60 | 60 | Không | 0 blocking; favicon 404 |
| 390×844 Full | Không | 61 | 60 | 59 | Không | 0 blocking; favicon 404 |

Full-journey smoke tại 1470×850 phải đi qua Intro thật, chờ gate hoàn tất, rồi lần lượt focus/scroll tới
Hero, Cake và Letter. Browser matrix còn lại được phép bỏ Intro bằng experience=off để tránh lặp clock 15 giây.

Quan sát được đóng băng cho R1:

- Intro thật có input lock và hoàn tất sau 14.827 ms tính từ lúc CDP bắt đầu quan sát; nằm trong cửa sổ
  baseline 12–19 giây.
- Khi đặt từng section vào giữa viewport, focus đi đúng Hero → Cake → Letter và không có horizontal overflow.
- Tại điểm giữa ranh giới Hero/Cake, DOM ghi nhận đồng thời hero và cake cùng visible ở cả bốn viewport.
- Riêng full journey 1470×850, sai số vị trí khoảng 0,015 px khiến lúc Cake ở giữa vẫn chạm Letter, và lúc
  Letter ở giữa vẫn chạm Gallery. Vì chưa có visibility/inert contract, các section chạm mép vẫn được tính
  visible; đây là nợ kỹ thuật R1 cần giải quyết.
- Không có runtime exception hoặc lỗi asset chặn. Mỗi profile có đúng một favicon.ico 404 đã ghi ở mục 4.

## 8. Điều kiện đóng R0

- [x] Có báo cáo baseline và ma trận file R1–R7.
- [x] Full journey smoke chạy được qua bốn section, không crash hoặc lỗi console nghiêm trọng.
- [x] Có FPS tại bốn viewport mục tiêu, tất cả tối thiểu 30 FPS.
- [x] Lint, production build và toàn bộ 19 regression Phase 1–4 đạt.
- [x] R0 không thay đổi art direction, layout hoặc hành vi sản phẩm.
