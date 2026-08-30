# Core

Các module trong thư mục này quản lý runtime dùng chung, không gắn chặt với một section giao diện cụ thể.

| File | Vai trò |
|---|---|
| `AudioManager.js` | Mở khóa Web Audio sau tương tác người dùng và phát tone/SFX tổng hợp nhẹ. |
| `MagicTrail.js` | Hệ particle động bám đầu đũa phép, tái sử dụng một draw call và đổi ngân sách Full/Lite. |
| `ParticleSystem.js` | Hệ sao shader dùng chung, tạo hình học xác định theo seed và hỗ trợ Full/Lite/reduced motion. |
| `PerformanceMonitor.js` | Lấy mẫu FPS đầu phiên và đề nghị chuyển sang Lite Mode khi thấp hơn ngưỡng. |
| `SceneManager.js` | Sở hữu renderer, scene, camera, resize, RAF loop và lifecycle của mọi scene trên canvas duy nhất. |
| `demoMode.js` | Đọc query `section` và xác định section cần mở độc lập khi phát triển. |
| `runtimeCapabilities.js` | Phát hiện WebGL2, reduced motion, giới hạn thiết bị/kết nối và áp trạng thái runtime lên phần tử `html`. |

Các scene chỉ nhận tài nguyên qua lifecycle của `SceneManager`; không module nào trong `core` tạo thêm canvas Three.js.
