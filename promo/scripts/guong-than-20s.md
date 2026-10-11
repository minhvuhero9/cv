# Kịch bản: "Gương Thần Biến Hình" — 20 s (bản nháp)

Game: **Tiệm Cắt Tóc Bất Ổn** · Định dạng: 9:16 (1080x1920) và 16:9 (1920x1080), quay riêng từng tỉ lệ.
Khách: **Tèo – Học Sinh Trốn Học** (`?mode=free&seed=4`, `pick-teo`) → Gương Thần: **Dân Chơi Tóc Dựng** (`persona-tocdung`).
Lồng tiếng: **tắt**. Nhạc: jingle tổng hợp bằng ffmpeg (sine/aevalsrc). Chữ: Inter Display Black.

| Thời gian | Hình | Chữ trên màn hình |
|---|---|---|
| 0–3 s | **Hook** – thẻ tiêu đề đỏ/kem kiểu bảng hiệu tiệm, khung "điện thoại" với cảnh Tèo vừa bị cạo một đường | **TIỆM CẮT TÓC BẤT ỔN** / *Cắt hỏng không hoàn tiền!* |
| 3–8.5 s | **Gameplay** – chọn Tông đơ, rê chậm ngang đỉnh đầu → vệt trọc "Đường Cạo Định Mệnh", Tèo hoảng ("Trọc là cô phạt em…") | *Lỡ tay một đường… TRỌC!* |
| 8.5–12.5 s | **Gương Thần** – mở bảng Gương Thần Biến Hình, chọn "Dân Chơi Tóc Dựng" → Tèo hóa thân: tóc dựng nhuộm vàng, áo da đinh tán | *Gương Thần Biến Hình!* |
| 12.5–14.5 s | **Soi gương** – bấm Xong!, "Khách nhìn vào gương…" | *Soi gương phán xét…* |
| 14.5–17.5 s | **Kết quả** – thẻ kết quả + tên kiểu tóc hài (vd. "Đường Cao Tốc Trên Đầu · Bản Dựng Đứng") | *Tên kiểu tóc cũng bất ổn!* |
| 17.5–20 s | **CTA** – thẻ kết thúc | **Chơi miễn phí ngay!** / minhvuhero9.github.io/cv/game |

Ghi chú
- Toàn bộ cảnh giữa là gameplay thật, điều khiển bằng Playwright (data-testid + toạ độ đầu qua `getScreenCTM`).
- Tên kiểu tóc do game tính theo nét cắt — có thể khác giữa lần quay dọc và ngang.
- Nếu khách nổi điên đòi về, capture tự bấm "Năn nỉ ở lại" (có thể lọt vào cuối cảnh Gương Thần).
