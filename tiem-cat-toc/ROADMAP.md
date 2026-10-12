# Lộ trình mở rộng: sandbox quản lý tiệm

File này ghi trạng thái triển khai để có thể tiếp tục đúng chỗ. `[x]` là đã xong và đã kiểm thử, `[~]` là đang làm, `[ ]` là chưa làm.

## 1. Khảo sát (đã xong)

- Stack: Vite 7 + React 19 + TypeScript, test bằng Vitest (logic) và Playwright (`tests/e2e.mjs`). Không có backend. Đồ họa vẽ hoàn toàn bằng SVG/Canvas, âm thanh tổng hợp bằng WebAudio (`src/audio/sfx.ts`), không có file asset.
- 3 khách hiện có (`src/game/customers.ts`):
  - **Anh Tuấn** (`tuan`, loyal): cắt theo ảnh mẫu, chốc chốc giơ điện thoại lên kiểm tra.
  - **Chú Bảy** (`bay`, picky): tỉa nhẹ, liên tục đòi sửa bên đang dài nhất.
  - **Khoa** (`khoa`, dramatic): muốn ấn tượng nhưng giật mình khi bị cắt nhiều.
- Cắt tóc: mô hình khoảng 110 lọn tóc (`hair.ts`). Dụng cụ cơ bản: tông đơ, kéo, máy sấy. Bộ Đồ Nghề Bất Ổn có 6 dụng cụ phép (`tools.ts`, `magic.ts`, `gear.ts`) và 3 combo.
- Chaos = hư hại trên đầu + sự cố gần đây. Bộ luật sự kiện nằm trong `session.ts`. Chấm điểm và đặt tên kiểu tóc nằm trong `evaluate.ts`. Thẻ PNG vẽ bằng `card.ts`.
- Lưu trữ: `progress.ts` (localStorage) lưu số lượt, kiểu tóc đã mở, sự kiện đã gặp.

## 2. Khách hàng dữ liệu và Cậu Vàng
- [x] Mở rộng `CustomerDef`: mô tả, sở thích, phản ứng theo dụng cụ, câu thoại riêng, phản ứng soi gương, giá, tip, trọng số uy tín, điều kiện xuất hiện và quay lại, giọng đọc
- [x] Tính mức hài lòng tổng quát từ dữ liệu `wants` (3 khách cũ giữ hàm riêng)
- [x] Module hành vi tái sử dụng (`behaviors.ts`): deadline, sleepy, flex, livestream, rush, reflex, fearBald, vip, duck, dog, transform (khách ngoài hành tinh đã bỏ)
- [x] 12 khách mới (tổng 15, gồm khách bắt chước sinh động)
- [x] Cậu Vàng: hình con chó, sợ tông đơ, thích máy sấy, rũ lông làm bừa tiệm, ngửi mùi đồ ăn, kiểu lông riêng, sủa (63 test logic, 62 kiểm tra trình duyệt)

## 3. Vòng lặp ngày, tiền, lưu tiến trình
- [x] CareerState (`career.ts`): ngày, tiền, uy tín, viral, đồ nghề, vật phẩm, độ bền, lịch sử khách, khách hẹn quay lại, sự kiện
- [x] Sáng mở tiệm, hàng khách, tổng kết cuối ngày (doanh thu, chi phí, phạt)
- [x] localStorage có kiểm tra phiên bản, bản sao lưu, nút reset có xác nhận
- [x] Giữ chế độ "Cắt tự do" như bản cũ (`?mode=free`)

## 4. Shop và nâng cấp
- [x] Danh mục vật phẩm (`shop.ts`) có giá, điều kiện mở khóa, tác động gameplay
- [x] Mua thì thay đổi gameplay thật (dụng cụ mới, ít quay đầu hơn, tông đơ an toàn hơn, thêm khách, ...)

## 5. Tương tác và tình huống phát sinh
- [x] Thuốc mọc tóc + tông đơ, keo vĩnh cửu + máy sấy bão, máy tạo kiểu nghe nhầm khi Chaos cao, dụng cụ mạnh + khách nhạy cảm, độ bền thấp gây trục trặc

## 6. Danh tiếng, viral, khách quay lại, sự kiện ngày
- [x] Uy tín và viral tách riêng, đều thay đổi theo kết quả
- [x] Khách quay lại đòi sửa (mang theo mái tóc hôm trước), khách bắt chước kiểu viral
- [x] Sự kiện ngày có nguyên nhân hiển thị (chợ phiên, cắt điện, clip viral, kiểm tra vệ sinh, báo khen, đánh giá 1 sao)

## 7–8. Lồng tiếng (đã gỡ bỏ)
- Đã có pipeline TTS (eSpeak NG, 1109 câu) và VoiceManager, nhưng **gỡ bỏ theo yêu cầu**. Game chỉ còn thoại dạng chữ và hiệu ứng âm thanh tổng hợp bằng WebAudio. Code cũ vẫn nằm trong lịch sử Git (commit `5e60171`) nếu cần khôi phục.

## 9–10. Giao diện, cân bằng, kiểm thử toàn luồng
- [x] Shop, tổng kết ngày, HUD tiền/uy tín/viral, cài đặt âm lượng
- [x] E2E: chơi 3 ngày, lưu/tải lại, mua đồ, Cậu Vàng, cài đặt âm thanh (`tests/e2e-career.mjs`)

## 11. Khách khác biệt + Gương Thần (đã xong)
- [x] Hộp sọ riêng cho từng khách, tóc mọc theo hộp sọ; renderer mặt/thân dữ liệu hóa (`look.face`, `look.body`)
- [x] Bỏ Khách X-79; save cũ được làm sạch khi tải
- [x] Gương Thần Biến Hình: 6 phong cách hư cấu, Bé Ba Hóa Thân thay chỗ khách cũ, mua trong shop

## 12. Bản cập nhật 4 giai đoạn (đã xong)
- [x] GĐ1: phiếu yêu cầu cho mọi khách, đường viền bật/tắt, chấm theo vùng, rung/quay chậm/“Chuẩn!”, nhạc nền theo Chaos, hướng dẫn lần đầu
- [x] GĐ2: chất tóc xoăn/mỏng/cứng ảnh hưởng hình vẽ và dụng cụ; kiểu tóc mang vào (rẽ ngôi, mullet, bát úp)
- [x] GĐ3: nhiệm vụ trong ngày, khách trùm cuối tuần nhiều bước, đồ mua hiện trong tiệm, Album Gương Thần
- [x] GĐ4: thử thách hằng ngày + bảng xếp hạng trên máy, xem lại 5 giây + tải video, đo và giảm tải hiệu năng

## 13. Sáng tạo của người chơi
- [x] ~~A. Xưởng Tạo Kiểu~~ (đã bỏ theo yêu cầu; cọ nhuộm, cạo hình, chụp ảnh, cuốn mẫu chuyển vào tiệm thật)
- [x] Sáng tạo vào vòng chơi chính: Cọ Nhuộm / Khuôn Cạo bán trong shop (+ nâng cấp), khách chấm phần nghệ thuật, Xưởng sau giờ đóng cửa, cuốn mẫu (khách đặt theo mẫu của bạn), tường tác phẩm, chụp ảnh từ màn kết quả
- [x] Cấp tiệm (5 cấp, mở đồ nghề/mẫu/khách/giá) và 9 mẫu có sẵn để vẽ theo (hướng dẫn trên đầu, % giống mẫu); khách chỉ đặt mẫu sau khi tiệm mua đồ nghề sáng tạo (từ hôm sau)
- [x] C. Thách bạn bè bằng link (mẫu nén vào link, chấm % giống mẫu)
- [x] D. Tiệm của riêng bạn (tên, màu tường, biển hiệu, kéo thả đồ trang trí, tiệm lớn dần theo cấp). Chưa làm: tự tạo phong cách Gương Thần.

## 14. Bản cập nhật 4 giai đoạn thứ hai (đã xong)
- [x] GĐ1: Khách tùy thợ (9 gu, chấm theo Thích/Ghét); kiểu hợp gu tự vào cuốn mẫu, hôm sau có khách đặt lại
- [x] GĐ2: 6 khách mới mở theo cấp; 3 câu chuyện nhiều ngày; Cuộc thi tóc của phường hằng tuần (cúp)
- [x] GĐ3: Tiệm của riêng bạn, tiệm lớn dần theo cấp, kệ cúp, link thách bạn bè
- [x] GĐ4: Ngày 1–2 dễ thở + mẹo buổi sáng, báo cáo tuần, cân bằng kinh tế bằng mô phỏng 14 ngày

## Việc tiếp theo nếu làm tiếp
- [ ] Cân bằng kinh tế bằng người chơi thật (hiện mới cân chỉnh bằng mô phỏng)
- [ ] Con Dấu Phán Quyết, Pháo Hoa Tạo Kiểu
