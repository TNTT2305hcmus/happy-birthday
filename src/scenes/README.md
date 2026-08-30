# Scene modules

Các scene Three.js (`IntroHack`, `HeroScene`, `CakeScene`, `LetterScene`, `GalleryScene`,
`OutroScene`) được thêm theo từng phase. Tất cả dùng chung renderer/canvas do `SceneManager`
quản lý; không tạo renderer riêng trong scene.

`HeroScene` hiện cung cấp environment dùng chung của mốc 2.1: gradient sky, bộ ánh sáng và
star-particle. Scene tuân theo lifecycle `mount`, `update`, `resize`, `setQualityMode`, `dispose`
của `SceneManager` để các phase sau có thể gắn/tháo module mà không tạo thêm canvas.

`FairyMascot` là model procedural nguyên bản của mốc 2.2. Từ mốc 2.3, `HeroScene` nhận progress
từ GSAP ScrollTrigger, nội suy pointer parallax và điều khiển cánh/đũa; `MagicTrail` giữ glitter
động trong một draw call riêng với ngân sách Full/Lite.

`CakeScene` là model procedural của mốc 3.1: bánh ba tầng, kem trang trí, đĩa, topper sao, năm nến
và bộ ánh sáng pastel. Scene giữ sẵn tham chiếu `candles`/`flames` cho tương tác ở 3.2, có placement
desktop/mobile riêng và chỉ hiển thị khi ScrollTrigger của section Cake active.

Từ mốc 3.2, `CakeScene` điều khiển flicker, tắt lần lượt từng flame, giảm ánh sáng nến và phát khói qua
`CandleSmoke` một draw call. `cakeEvents` là bridge nhỏ để nút React hiện tại và mic ở 3.3 cùng gọi một
luồng tương tác, tránh nhân đôi state giữa DOM và Three.js.
