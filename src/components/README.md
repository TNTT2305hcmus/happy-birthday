# Components

Các module trong thư mục này là lớp giao diện React/DOM nằm trên canvas Three.js dùng chung.

| File | Vai trò |
|---|---|
| `DevSectionNav.jsx` | Thanh điều hướng dành cho phát triển, cho phép mở và kiểm thử độc lập từng section. |
| `ExperienceGate.jsx` | Điều phối landing tùy chọn, intro hacker, khóa input/scroll và transition sang nội dung chính. |
| `HackIntro.jsx` | Hiển thị terminal giả lập, progress 10 giây, trạng thái hoàn tất và các beep hỗ trợ. |
| `CakeControls.jsx` | Nút thổi nến thủ công và vùng trạng thái live phản ánh số nến còn sáng từ `CakeScene`. |
| `HeroFallbackFairy.jsx` | Mascot tiên 2D nguyên bản dựng bằng HTML/CSS khi WebGL2 không khả dụng. |
| `HeroOverlay.jsx` | Overlay Hero compact gồm tag ngày, headline script và timeline/only-you loop; mascot fallback dùng chung sân khấu. |
| `MatrixRain.jsx` | Canvas 2D vẽ hiệu ứng ký tự rơi phía sau intro hacker. |
| `PerformanceDebugHud.jsx` | Bảng chẩn đoán bật bằng `?debug=performance`, hiển thị FPS, quality và trạng thái WebGL. |
| `RuntimeNotices.jsx` | Thông báo nhẹ cho WebGL fallback và Lite Mode qua các thuộc tính runtime trên `html`. |
| `IntroHeroFadeTransition.jsx` | Fade Intro về đen, bàn giao Hero tại màn đen rồi sáng dần theo clock đơn điệu. |
| `StorySection.jsx` | Chọn giao diện Hero/Cake hoặc shell phù hợp cho từng section và cung cấp placeholder cho các phase chưa triển khai. |
| `heroOverlayModel.js` | Chuyển dữ liệu cá nhân hóa từ config thành model hiển thị đã định dạng cho Hero. |
| `storyNavigation.js` | Điều hướng CTA giữa các section, giữ query phục vụ chế độ demo và tôn trọng reduced motion. |

Nội dung cá nhân hóa không đặt trực tiếp trong các component; nguồn dữ liệu duy nhất nằm ở `src/content/config.js`.
