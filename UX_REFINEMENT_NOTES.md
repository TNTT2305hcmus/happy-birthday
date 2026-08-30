# UX refinement notes — Twinkle Fairy Birthday

Tài liệu này ghi lại các quyết định UI/UX và animation cần giữ xuyên suốt quá trình hoàn thiện MVP.
Các mục chưa được gắn vào một phase cụ thể là backlog polish, không phải cam kết triển khai ngay trong
Phase 3.7.

## 1. Màn hình desktop mục tiêu

Màn hình ưu tiên số một là **MacBook Air M2 13.6 inch**. Tấm nền có độ phân giải vật lý
2560×1664 ở 224 ppi, nhưng responsive của website phải dựa trên **CSS viewport**, không dựa vào số inch
hay pixel vật lý.

Baseline kiểm thử:

- `1470×956`: khung logic gần với chế độ hiển thị mặc định/toàn màn hình trên máy mục tiêu.
- `1470×850`: khung an toàn chính khi trình duyệt và thanh công cụ chiếm bớt chiều cao.
- `1440×900`: viewport regression đang dùng, tiếp tục duy trì.
- Mobile vẫn được hỗ trợ nhưng không chi phối art direction và nhịp kể chuyện của bản MVP.

Ở `1470×850`, mỗi trạng thái tương tác chính phải nhìn được trọn vẹn mà không cần cuộn chỉ để tìm
nút đang dùng. Không được có tràn ngang. Với Cake, người xem phải đồng thời nhận biết được bánh, toàn bộ
nến/ngọn lửa, ô điều ước và thao tác thổi chính. Nội dung giải thích phụ có thể rút gọn hoặc ưu tiên thấp
hơn khi chiều cao viewport hạn chế.

## 2. Quy tắc responsive cho desktop thấp

- Không chỉ dùng breakpoint theo `width`; bổ sung layout theo `height`/aspect ratio cho compact desktop.
- Dùng `svh`/`dvh` và safe area khi phù hợp; không giả định `100vh` luôn là vùng nhìn hữu dụng.
- Kích thước panel, khoảng cách dọc và typography phải co theo chiều cao trước khi làm nội dung chính
  tràn khỏi khung.
- Framing 3D được quyết định bằng camera, scale và vùng an toàn của UI. Không phóng model chỉ vì còn
  khoảng trống theo chiều ngang.
- Mỗi section có vùng dành cho HTML UI và vùng dành cho 3D rõ ràng; model không che thao tác chính.

## 3. Cake section — điểm cần tỉa sau MVP

Trạng thái sau Phase 3.7:

- Đã thêm compact-height cho viewport desktop thấp, thu Cake và đưa toàn bộ thao tác chính vào khung
  an toàn 1470×850; đây là baseline bắt buộc cho các phase tiếp theo.
- Mascot ăn mừng vẫn là một instance riêng, chỉ xuất hiện sau khi hoàn tất nên chưa tạo cảm giác cô tiên
  đã dẫn người xem từ Hero tới nghi thức. Phần này tiếp tục thuộc backlog liên kết toàn hành trình.

Hướng polish:

- Thu nhỏ Cake và điều chỉnh camera để bánh là tâm điểm nhưng không lấn át form/thao tác.
- Tạo bố cục compact-height cho panel: giảm padding/gap, rút gọn copy phụ và giữ CTA chính trong khung.
- Choreography ăn mừng phải bắt đầu từ vị trí có quan hệ với hành trình trước đó; tránh pop-in cạnh bánh.
- Ánh sáng, trail và hướng chuyển động của mascot cần dẫn mắt từ điều ước sang nến rồi lên ngôi sao.

## 4. Mascot xuyên suốt câu chuyện

Đích đến sau khi đủ các section là một mascot có tính liên tục:

- Cô tiên ở Hero tiếp tục bay theo tiến trình cuộn và đóng vai trò người dẫn chuyện.
- Vị trí/tư thế được điều phối bởi một narrative controller hoặc shared mascot state trên canvas dùng
  chung, thay vì mỗi scene tự tạo một cô tiên không liên quan.
- Khi chuyển section, mascot có đường bay vào/ra và trạng thái bàn giao rõ ràng; Cake, Letter, Gallery
  và Outro có thể dùng các pose/nhịp khác nhau của cùng một nhân vật.
- Chuyển động chính vẫn scroll-driven; idle animation chỉ bổ trợ nhẹ.
- `prefers-reduced-motion` dùng chuyển trạng thái ngắn hoặc pose tĩnh, không làm mất vai trò dẫn chuyện.

Việc hợp nhất mascot nên thực hiện khi các section MVP đã tồn tại, vì lúc đó mới có đủ điểm đầu/cuối để
thiết kế đường bay và camera xuyên suốt mà không phải làm lại nhiều lần.

## 5. Backlog polish toàn trải nghiệm

- Camera choreography và scale nhất quán giữa Hero, Cake, Letter, Gallery, Outro.
- Transition giữa section có nguyên nhân thị giác: trail, ánh sáng, hướng bay hoặc vật thể dẫn đường.
- Nhịp scroll, khoảng dừng để đọc và thời điểm mở tương tác.
- Hệ thống depth/layer để HTML và 3D có liên hệ thay vì giống hai lớp đặt chồng.
- Performance pass trên Safari/macOS thật, đặc biệt DPR cao, resize và thanh trình duyệt thay đổi chiều cao.
- Kiểm thử full journey ở viewport mục tiêu trước khi polish cuối và trước bàn giao.

## 6. Tiêu chí không đổi từ thời điểm này

Mọi phase mới và mọi lần nghiệm thu desktop đều phải chạy qua baseline MacBook Air M2 ở trên. Một tính
năng chạy đúng nhưng bị cắt, che hoặc buộc người xem tìm thao tác chính ở `1470×850` chưa được xem là đạt
UI/UX desktop.

## 7. Quy ước ảnh feedback

- Không lưu thêm ảnh feedback WebGL desktop; người dùng tự chạy local để review trực quan.
- Chỉ giữ artifact hình ảnh khi phục vụ kiểm tra mobile hoặc fallback 2D.
- `ref_private_img/` và `ref_mascot_background/` là dữ liệu tham khảo riêng tư: luôn nằm ngoài Git
  và không được đưa vào build/deploy.
