# PROMTING.md — Prompt thực thi phase hiện tại

## Phase hiện tại

**R5.4 — Auto-scroll Cake → Hero đồng bộ hành trình điều ước**

## Vai trò

Kỹ sư frontend React/Three.js phụ trách điều phối chuyển cảnh liên section. Kết nối state journey R5.3 với SectionManager để khung nhìn tự cuộn ngược từ Cake về Hero trong đúng thời gian hạt bay tới đầu đũa, đồng thời giữ SceneManager là nguồn active scene duy nhất.

## Mục tiêu

Khi chặng "topper-to-wand" bắt đầu, SectionManager khởi chạy một auto-scroll hữu hạn từ vị trí hiện tại tới tâm section Hero. Snapshot section, scene presence và animation 3D phải cập nhật liên tục theo scroll; hệ hạt vẫn hiển thị/cập nhật khi Cake thôi active và kết thúc tại đầu đũa Hero. Không thêm renderer/canvas hay hệ hạt mới. R5.4 chưa triển khai thao tác người dùng để hủy auto-scroll; phần đó thuộc R5.5.

## Input bắt buộc phải đọc

1. AGENTS.md, DESCRIPTION.md, PLANNING.md, REFINEMENT-PLAN.md.
2. SectionManager, sectionSnapshot, SceneManager, App, CakeScene, HeroScene, WishParticleConvergence, cakeEvents.
3. Verify R1, R5.1–R5.3 và browser regressions liên quan section/cake.

## Phạm vi

1. Thêm API auto-scroll có thời lượng hữu hạn vào SectionManager; đích tính từ layout thực của Hero, clamp theo document scroll range và không hard-code pixel.
2. Kích hoạt API đúng một lần khi journey chuyển sang "topper-to-wand"; truyền timing từ particle journey để scroll và đường bay dùng chung mốc thời gian.
3. Mỗi frame auto-scroll phải làm mới SectionManager snapshot, từ đó SceneManager nhận đúng scenePresence, active Cake/Hero và progress camera/scene hiện có.
4. Giữ một particle resource R5.3 hiển thị trong scene chung và tiếp tục update khi owner Cake không còn active; không để toàn bộ Cake hiện chồng lên Hero.
5. Kết thúc auto-scroll đúng vị trí Hero, chốt snapshot/state sạch và không thay đổi focus bằng logic mới trong phase này.
6. Cleanup animation hữu hạn khi SectionManager unmount; expose trạng thái tối thiểu phục vụ verify và R5.5.
7. Thêm verify R5.4 cho API/timing/target, chuyển active scene Cake → Hero, continuity của particle qua ranh giới và FPS.

## Ngoài phạm vi

- Không cho wheel/touch/keyboard hủy auto-scroll; không hoàn thiện chống kích hoạt lặp hay focus restoration của R5.5.
- Không triển khai fallback DOM/CSS hoặc reduced-motion teleport hoàn chỉnh của R5.6.
- Không reset toàn hành trình/active section theo R5.7.
- Không đổi layout/copy/mascot, threshold section hoặc nội dung cá nhân.
- Không tạo renderer, canvas, ScrollTrigger hay particle system thứ hai.

## Rules

1. Auto-scroll phải đi qua SectionManager; App chỉ nối event journey với API manager, không tự tính layout hay gọi tween riêng.
2. Target dựa trên tâm section và viewport thực; duration lấy từ timing public của WishParticleConvergence.
3. SceneManager vẫn là nơi duy nhất truyền active/presence/progress vào scene; ngoại lệ update-inactive chỉ dành cho effect hữu hạn đang chạy.
4. Particle phải sống trong root scene/world space để không bị ẩn theo Cake group, nhưng resource ownership/reset/dispose vẫn thuộc CakeScene.
5. Không làm Cake và Hero cùng tương tác; transition chỉ cho phép cùng hiện theo snapshot hiện hữu.
6. Animation scroll phải hữu hạn, không tạo loop tồn tại sau complete/unmount.
7. Giữ nguyên mic privacy, fallback hiện hành, deep-link và regression đã đạt.

## Output mong đợi

1. SectionManager có API auto-scroll tới Hero và state lifecycle rõ ràng.
2. Journey R5.3 tiếp tục qua lúc active scene chuyển Cake → Hero mà không biến mất/teleport.
3. Verify R5.4, lint, production build và regression liên quan đạt.
4. PLANNING.md đánh dấu R5.4 hoàn tất với timing/FPS và phạm vi bàn giao cho R5.5.

## Acceptance criteria

- "topper-to-wand" khởi động auto-scroll từ Cake về Hero đúng một lần; scroll kết thúc tại tâm Hero trong sai số kiểm thử.
- Trong lúc cuộn, SectionManager snapshot tiến liên tục từ Cake qua transition sang Hero; SceneManager không tự điều khiển section ngoài snapshot.
- Particle vẫn visible và được update sau khi Cake group bị ẩn; frame cuối bám đúng live "hero-wand-tip".
- Không có hai section cùng interactive, không có mascot chồng ngoài transition cho phép, không thêm renderer/canvas/particle system.
- Cleanup unmount dừng animation hữu hạn; R5.4 không cài listener hủy wheel/touch/keyboard.
- Lint, production build, verify R1/R5.1–R5.4 và browser regression đạt tối thiểu 30 FPS.
