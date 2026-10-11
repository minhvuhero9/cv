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
- Giới hạn môi trường TTS: chỉ có CPU (4 nhân, 15 GB RAM, không GPU). huggingface.co bị chặn, nên không tải được model KhanhTTS-OmniVoice hay voice Piper tiếng Việt. Cài được eSpeak NG (giọng `vi`, `vi-vn-x-central`, `vi-vn-x-south`) từ Ubuntu.

## 2. Khách hàng dữ liệu và Cậu Vàng
- [x] Mở rộng `CustomerDef`: mô tả, sở thích, phản ứng theo dụng cụ, câu thoại riêng, phản ứng soi gương, giá, tip, trọng số uy tín, điều kiện xuất hiện và quay lại, giọng đọc
- [x] Tính mức hài lòng tổng quát từ dữ liệu `wants` (3 khách cũ giữ hàm riêng)
- [x] Module hành vi tái sử dụng (`behaviors.ts`): deadline, sleepy, flex, livestream, rush, reflex, fearBald, vip, alien, duck, dog
- [x] 12 khách mới (tổng 15, gồm khách bắt chước sinh động)
- [x] Cậu Vàng: hình con chó, sợ tông đơ, thích máy sấy, rũ lông làm bừa tiệm, ngửi mùi đồ ăn, kiểu lông riêng, sủa (63 test logic, 62 kiểm tra trình duyệt)

## 3. Vòng lặp ngày, tiền, lưu tiến trình
- [ ] CareerState: ngày, tiền, uy tín, viral, đồ nghề, vật phẩm, độ bền, lịch sử khách, khách hẹn quay lại, sự kiện
- [ ] Sáng mở tiệm, hàng khách, tổng kết cuối ngày (doanh thu, chi phí, phạt)
- [ ] localStorage có kiểm tra phiên bản, bản sao lưu, nút reset rõ ràng
- [ ] Giữ chế độ "Cắt tự do" như bản cũ

## 4. Shop và nâng cấp
- [ ] Danh mục vật phẩm có giá, điều kiện mở khóa, tác động gameplay
- [ ] Mua thì thay đổi gameplay thật (dụng cụ mới, ít quay đầu hơn, tông đơ an toàn hơn, thêm khách, ...)

## 5. Tương tác và tình huống phát sinh
- [ ] Thuốc mọc tóc + tông đơ, keo vĩnh cửu + máy sấy bão, dụng cụ mạnh + khách nhạy cảm, độ bền thấp gây trục trặc

## 6. Danh tiếng, viral, khách quay lại, sự kiện ngày
- [ ] Uy tín và viral tách riêng, đều thay đổi theo kết quả
- [ ] Khách quay lại đòi sửa (mang theo mái tóc hôm trước), khách bắt chước kiểu viral
- [ ] Sự kiện ngày có nguyên nhân hiển thị

## 7. TTS miễn phí và pipeline
- [ ] Xuất danh sách thoại từ dữ liệu, script batch tạo file, kiểm tra file, manifest, danh sách thiếu
- [ ] Hỗ trợ engine: eSpeak NG (chạy được ở đây), Piper, KhanhTTS (cần máy có HuggingFace)

## 8. Lồng tiếng trong game
- [ ] VoiceManager: hàng đợi, ưu tiên, chống lặp, âm lượng, tắt tiếng, xử lý file lỗi, autoplay

## 9–10. Giao diện, cân bằng, kiểm thử toàn luồng
- [ ] Shop, tổng kết ngày, HUD tiền/uy tín/viral, cài đặt âm lượng
- [ ] E2E: chơi 3 ngày, lưu/tải lại, mua đồ, Cậu Vàng, thoại phát được
