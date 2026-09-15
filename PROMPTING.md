# PROMPTING.md — Prompt thực thi phase hiện tại

## Phase hiện tại

**R6.6 — Typing chỉ sau khi thư mở hoàn toàn**

## Vai trò

Kỹ sư frontend Three.js phụ trách bổ sung state machine typing cho nội dung `CanvasTexture` trên tờ giấy WebGL của Letter, bảo đảm animation bám lifecycle hiện có, có quy tắc restart xác định và giữ trải nghiệm accessibility/reduced motion đúng chuẩn.

## Mục tiêu

Chỉ bắt đầu gõ nội dung lá thư trên chính `letter-paper-text` sau khi `openProgress` thật sự đạt trạng thái mở hoàn toàn. Nội dung xuất hiện theo đúng thứ tự đọc, không đổi layout trong lúc gõ. Khi thư rời trạng thái mở hoàn toàn, phiên typing hiện tại phải bị hủy và reset; lần mở hoàn toàn kế tiếp luôn bắt đầu một phiên mới từ đầu. Với `prefers-reduced-motion`, toàn bộ nội dung hiển thị tức thì khi thư đạt 100%.

## Input bắt buộc phải đọc

1. `AGENTS.md`, `DESCRIPTION.md`, `PLANNING.md` và `REFINEMENT-PLAN.md` mục 1.4.
2. `src/scenes/LetterScene.js`, `src/scenes/LetterPaperTexture.js` và `src/scenes/letterEvents.js`.
3. `src/components/LetterInteractionSurface.jsx`, `src/components/letterContentModel.js`, `src/components/StorySection.jsx` và cấu hình nội dung Letter.
4. Verify R6.1–R6.5 và các verify Phase 4 liên quan để giữ nguyên hợp đồng đã nghiệm thu.

## Phạm vi

1. Mở rộng renderer `CanvasTexture` để có thể vẽ một phần nội dung theo số grapheme đã reveal, nhưng phải tính layout từ toàn bộ nội dung trước để chữ không reflow hoặc nhảy vị trí khi đang gõ.
2. Reveal lần lượt theo thứ tự: salutation → các câu nội dung → sign-off → signature. Giữ nguyên nguồn nội dung từ config và cách fallback cho thư rỗng của R6.5.
3. Dùng grapheme thay vì cắt theo UTF-16 code unit để không làm vỡ dấu tiếng Việt hoặc ký tự emoji; ưu tiên `Intl.Segmenter`, có fallback an toàn khi API không tồn tại.
4. Thêm state machine hữu hạn, tối thiểu gồm `idle`, `typing` và `complete`, do `LetterScene` sở hữu. Tiến độ typing được cập nhật từ `update({ delta, reducedMotion })` hiện có; không tạo RAF, interval hoặc timeout riêng.
5. Chỉ chuyển `idle → typing` tại cạnh mở khi `openProgress >= 0.999`. Dao động số thực quanh ngưỡng không được tạo nhiều phiên typing.
6. Quy tắc đóng/mở lại:
   - Khi progress giảm xuống dưới ngưỡng reset có hysteresis (khuyến nghị `<= 0.98`), hủy phiên đang gõ hoặc phiên đã hoàn tất, xóa phần chữ đã reveal và đưa state về `idle`.
   - Khi đạt lại `>= 0.999`, luôn bắt đầu gõ lại từ đầu bằng một generation/session mới.
   - Scroll, click, Enter và Space đều phải đi qua cùng một state machine; không tạo nhánh hành vi riêng theo nguồn mở thư.
7. Với reduced motion, tại `openProgress >= 0.999` render toàn bộ nội dung trong một lần và chuyển thẳng sang `complete`; khi đóng vẫn reset theo cùng quy tắc.
8. Chỉ redraw canvas và đặt `texture.needsUpdate` khi số grapheme hiển thị thực sự thay đổi; font-ready render không được vô tình hoàn tất hoặc restart phiên typing.
9. Giữ bản semantic của R6.5: screen reader được tiếp cận trọn nội dung ngay khi thư mở hoàn toàn, không cập nhật DOM/`aria-live` theo từng ký tự và không phải chờ visual typing kết thúc.
10. Thêm verify R6.6 và script package tương ứng; chạy regression R6.1–R6.5, Phase 4 liên quan, lint và production build.

## Ngoài phạm vi

- Không triển khai pagination, paper expansion hoặc giải pháp riêng cho thư 1/10/20 câu; thuộc R6.7.
- Không thay đổi graph/layer phong bì, depth, pose, mapping scroll/click hoặc camera đã chốt ở R6.3–R6.5.
- Không làm responsive/fallback 2D/contrast/focus tổng thể hay bàn giao sang Gallery; thuộc R6.8.
- Không thực hiện browser matrix, visual QA đầy đủ hoặc nghiệm thu FPS/Gate R6; thuộc R6.9. Giữ quyết định hiện tại là chưa chạy browser/headless visual QA nếu người dùng chưa yêu cầu lại.
- Không thêm card Letter, canvas DOM, renderer, RAF, thư viện typing, nội dung cá nhân mới hoặc asset có bản quyền.
- Không sửa các mục R5 đang tạm hoãn và không đánh dấu hoàn tất toàn bộ Gate R6.

## Rules / ràng buộc

1. Toàn trang tiếp tục dùng đúng một WebGL renderer/canvas. Canvas 2D của Letter chỉ là nguồn dữ liệu offscreen cho `CanvasTexture` và không được gắn vào DOM.
2. `letter-paper-text` tiếp tục là mesh con của `letter-paper-group`, bám writing surface và giữ nguyên depth/layer đã nghiệm thu.
3. `openProgress`/`applyOpenPose(progress)` hiện có là nguồn sự thật cho điều kiện bắt đầu/reset; không dựa vào thời gian click, `aria-expanded` hoặc target dự đoán để bắt đầu sớm.
4. Không hard-code nội dung thư trong scene, texture renderer, test hoặc component. Config tiếp tục là nguồn duy nhất.
5. Tốc độ typing phải được khai báo bằng hằng số cấu hình kỹ thuật có tên rõ ràng, không phụ thuộc FPS và đủ chậm để nhận ra hiệu ứng nhưng không kéo dài bất hợp lý; verify phải dùng tiến độ thời gian xác định thay vì chờ thời gian thực.
6. Không phát event/announcement cho từng grapheme. Semantic content chỉ đổi trạng thái ẩn/hiện theo thư đóng/mở như hợp đồng R6.5.
7. Font-ready callback, reset, unmount và `dispose()` phải an toàn với phiên cũ; callback muộn không được render lại texture đã dispose hoặc làm thay đổi state của phiên mới.
8. Texture, material và geometry vẫn phải được dispose đúng một lần; không tăng số draw call hoặc tạo texture/canvas mới cho mỗi lần mở lại.
9. Reduced motion chỉ bỏ animation typing, không được bỏ nội dung hoặc làm thay đổi thứ tự/lifecycle của thư.

## Output mong đợi

1. Nội dung trên tờ giấy bắt đầu gõ đúng sau khi thư đạt 100%, theo thứ tự đọc và không reflow.
2. Đóng thư giữa lúc gõ hoặc sau khi gõ xong đều reset sạch; mở lại gõ từ đầu đúng một lần.
3. Reduced motion hiển thị trọn nội dung tức thì ở 100% và reset đúng khi đóng.
4. Bản semantic cung cấp toàn bộ thư khi mở mà không tạo thông báo từng ký tự hoặc khôi phục card nhìn thấy.
5. Không có timer/RAF/canvas/texture/draw call phát sinh theo mỗi phiên; lifecycle và dispose không rò rỉ.
6. Verify R6.6, regression R6.1–R6.5 và Phase 4 liên quan, lint và production build đều đạt.

## Acceptance criteria / kiểm thử

- Ở `openProgress < 0.999`, visual text chưa typing; lần đầu đạt `>= 0.999` tạo đúng một phiên và chuyển `idle → typing`.
- Tiến độ reveal dựa trên `delta`, độc lập FPS; cùng tổng thời gian cho kết quả tương đương ở bước cập nhật 30 FPS và 60 FPS.
- Dấu tiếng Việt/emoji không xuất hiện dưới dạng ký tự vỡ; layout cuối trùng layout đầy đủ của R6.5 và không dịch chuyển giữa các frame.
- Trong lúc typing, đóng xuống ngưỡng reset sẽ hủy và xóa nội dung; mở lại bắt đầu từ grapheme đầu tiên, không tiếp tục từ tiến độ cũ.
- Sau khi `complete`, đóng rồi mở lại vẫn restart đúng một lần; nhiễu progress trong khoảng hysteresis gần 100% không restart hoặc nhân đôi session.
- Reduced motion render đủ salutation, body/fallback, sign-off và signature ngay tại 100%, không đi qua chuỗi reveal kéo dài.
- `texture.needsUpdate` chỉ được bật khi frame chữ thay đổi; không tạo mới `CanvasTexture`, canvas hoặc mesh khi restart.
- Font-ready callback không phá state `idle`/`typing`/`complete`, không reveal sớm và không thao tác lên asset đã dispose.
- Semantic article chỉ được screen reader tiếp cận khi trạng thái thư là `open`, chứa trọn nội dung và không có live announcement theo ký tự.
- Interaction click/tap/Enter/Space, mapping scroll chậm, layer R6.3, mesh R6.5 và event contract không regress.
- Có `verify:refinement-r6.6`; verify R6.1–R6.6, Phase 4 liên quan, `npm run lint` và `npm run build` đạt.

## Điều kiện dừng

Chỉ triển khai R6.6 khi người dùng ra lệnh coding rõ ràng. Sau khi hoàn tất, cập nhật checklist R6.6 trong `PLANNING.md`, báo cáo ngắn gọn phần đã làm/kết quả kiểm thử và không tự chuyển sang R6.7.
