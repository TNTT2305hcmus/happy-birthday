# PROMPTING.md — Prompt thực thi phase hiện tại

## Phase hiện tại

**R6.8 — Letter tại baseline 1470×956, fallback 2D và bàn giao Gallery**

## Vai trò

Kỹ sư frontend Three.js/React phụ trách hoàn thiện section Letter tại baseline `1470×956` và khi WebGL không khả dụng, không thay đổi nội dung hay mở rộng sang Gallery thật.

## Mục tiêu

Cân camera/scale và hit area của phong bì/giấy tại baseline `1470×956` của MacBook Air M2; cung cấp fallback HTML/CSS 2D có thể mở, đọc và phân trang; bảo đảm contrast/focus; khi cuộn tiếp, Letter ngừng hiển thị/tương tác và Gallery placeholder nhận focus/active state sạch.

## Input bắt buộc phải đọc

1. `AGENTS.md`, `DESCRIPTION.md`, `PLANNING.md`, `REFINEMENT-PLAN.md` mục 1.0, 1.4, 1.5.
2. `LetterScene.js`, `LetterPaperTexture.js`, `LetterInteractionSurface.jsx`, `StorySection.jsx`, `SectionManager.jsx`, runtime capability và CSS Letter.
3. Verify R6.1–R6.7 cùng browser matrices hiện có của Phase 4/R6.

## Phạm vi

1. Cân Letter chỉ tại desktop `1470×956`; giấy mở không vượt viewport và vùng bấm bám visual.
2. Tạo scroll runway `300svh` cho section Letter và một stage `sticky` cao `100svh` chứa toàn bộ visual/controls.
3. Remap scroll mở thư vào vùng Letter sở hữu hoàn toàn, từ khoảng `0.30 → 0.58`: bắt đầu sau khi Cake rời transition và hoàn tất trước khi Gallery bắt đầu transition.
4. Ở pose mở hoàn toàn tại `1470×956`, phóng giấy lớn hơn và nâng cao để mép dưới dừng tại miệng phong bì; mép trên vẫn nằm trong viewport. Page controls phải bám theo vị trí giấy mới.
5. Tạo fallback Letter 2D bằng HTML/CSS, chỉ nhìn thấy khi WebGL unavailable. Fallback vẫn mở/đóng, đọc đủ nội dung, phân trang, reset và dùng click/tap/keyboard.
6. Fallback dùng cùng config và quy tắc trang rõ ràng; không tạo card phụ bên cạnh phong bì.
7. Chuẩn hóa màu chữ/nền giấy đạt contrast đọc được, focus-visible rõ, touch target tối thiểu 44px và disabled state không click xuyên.
8. Khi section Letter mất active state để sang Gallery: mọi hit area/page control bị vô hiệu hóa, scene/fallback không chặn pointer; SectionManager tiếp tục là nguồn active/focus duy nhất.
9. Thêm verify R6.8 cho sticky runway, pose giấy mở, ngưỡng progress, fallback, baseline `1470×956`, focus/contrast và handoff Letter → Gallery; chạy regression R6.1–R6.7, Phase 4 liên quan, lint/build.

## Ngoài phạm vi

- Không dựng Gallery 3D/modal hoặc chỉnh nội dung Gallery; chỉ kiểm tra placeholder hiện có nhận bàn giao.
- Không tối ưu hoặc nghiệm thu compact-height, tablet hay mobile trong R6.8; giữ nguyên baseline đã có, các viewport này dời sang backlog sau delivery.
- Không thay graph/layer, typing/pagination WebGL hoặc mapping mở thư trừ sửa lỗi bắt buộc.
- Không làm browser matrix/FPS cuối của Gate R6; thuộc R6.9. Không chạy headless visual QA nếu người dùng chưa yêu cầu lại.
- Không thêm asset, thư viện, card nội dung hoặc dữ liệu cá nhân.
- Không triển khai R6.9/R7 hay các mục R5 đang hoãn.

## Rules / ràng buộc

1. Vẫn đúng một WebGL canvas; fallback là DOM/CSS và không khởi tạo renderer/RAF.
2. WebGL và fallback lấy nội dung từ cùng config, không sao chép câu thư vào component/CSS.
3. Chỉ một bộ điều khiển Letter được tương tác: WebGL controls ẩn/vô hiệu khi fallback; fallback controls không hiện trong chế độ WebGL.
4. Section inactive phải `pointer-events: none`, inert và không giữ focus theo hợp đồng SectionManager hiện có.
5. Focus ring không phụ thuộc màu sắc đơn độc; reduced motion bỏ transition dài nhưng không bỏ trạng thái mở/đóng.
6. Không hard-code viewport theo thiết bị cụ thể ngoài breakpoint/layout token có lý do.

## Output mong đợi

1. Letter nằm gọn và cân tại `1470×956`; hit areas theo đúng paper/envelope.
2. `?webgl=off&section=letter` có fallback 2D hoàn chỉnh, không màn hình trống.
3. Contrast, keyboard focus và touch target đạt; không có click xuyên.
4. Cuộn Letter → Gallery ẩn/vô hiệu Letter và kích hoạt Gallery placeholder sạch.

## Acceptance criteria / kiểm thử

- Có fallback phong bì + giấy cùng nội dung config; mở/đóng và Previous/Next hoạt động bằng button semantic.
- Fallback chỉ display khi `data-webgl='unavailable'`; controls WebGL không nhận pointer/focus trong fallback.
- Touch target ≥44px, focus-visible rõ; text ink/paper dùng palette contrast cao.
- Tại `1470×956`, Letter dùng scale/position desktop ổn định và không thêm horizontal overflow.
- Tại progress `0.58`, Letter vẫn là section active, `openProgress` có thể đạt 100% và typing bắt đầu trước transition sang Gallery.
- Pose mở có giấy lớn hơn, mép dưới thẳng hàng với miệng phong bì trong sai số hình học nhỏ và mép trên không bị crop tại `1470×956`.
- Cuộn ngược xuống dưới `0.30` đóng thư hoàn toàn trước khi Cake transition chồng vào Letter.
- Letter inactive không tương tác; Gallery là section kế tiếp và nhận active/focus qua SectionManager.
- Reduced motion không có animation mở/đổi trang kéo dài.
- Có `verify:refinement-r6.8`; R6.1–R6.8, Phase 4 liên quan, lint và build đạt.

## Điều kiện dừng

Sau khi R6.8 đạt, cập nhật `PLANNING.md`, báo cáo ngắn gọn và không tự triển khai R6.9.
