# Tiệm Cắt Tóc Bất Ổn

Game hài mô phỏng tiệm cắt tóc bình dân, chơi ngay trên trình duyệt (máy tính và điện thoại).
Bạn cắt tóc cho khách bằng chuột hoặc ngón tay. Mỗi thao tác thay đổi mái tóc thật, và các tai nạn xảy ra vì chính những thao tác đó.

## Chạy game

```bash
cd tiem-cat-toc
npm install
npm run dev        # mở địa chỉ Vite in ra, ví dụ http://localhost:5173/
npm run build      # bản tĩnh trong dist/ (đường dẫn tương đối, đặt ở thư mục con nào cũng chạy)
```

Không cần backend, không cần API key. Toàn bộ đồ họa vẽ bằng SVG/Canvas, âm thanh tổng hợp bằng WebAudio.

## Cách chơi

1. Đọc yêu cầu của khách. Yêu cầu nào cũng có một chỗ mâu thuẫn.
2. Chọn dụng cụ rồi kéo trên tóc (phím tắt 1 / 2 / 3):
   - **Tông đơ**: chạm vào lọn nào là lọn đó bị cạo ngắn. Đứng yên một chỗ thì da đầu lộ ra (vòng tròn đỏ dần lên để cảnh báo).
   - **Kéo**: kéo một đường thì tóc bị cắt đúng theo đường đó. Bấm một cái thì cắt một nhát.
   - **Máy sấy**: tóc bị thổi về phía ngược với vòi sấy và bung xù ra. Tóc có keo gặp máy sấy sẽ dựng đứng.
3. Bấm **Xong!** để khách soi gương. Hết 75 giây khách cũng tự soi.
4. Xem kết quả: tên kiểu tóc, phản ứng của khách, Chaos, điểm, và thẻ ảnh để tải về hoặc chia sẻ.

### Ba khách hàng

| Khách | Yêu cầu | Lối chơi |
|---|---|---|
| **Anh Tuấn** (Chung Thủy Với Ảnh Mẫu) | "Cắt giống ảnh… nhưng đừng ngắn quá." | Chốc chốc anh giơ điện thoại lên, viền xanh hiện ra cho thấy hình dáng trong ảnh. Câu anh nói phụ thuộc vào mái tóc lúc đó. Hai bên cần tông đơ, phía trên cần kéo. |
| **Chú Bảy** (Khó Tính) | "Tỉa nhẹ thôi nhé." | Mỗi lần bạn cắt, chú chỉ ra (và tô sáng) bên đang dài nhất rồi bắt sửa. Chiều chú thì tóc cứ ngắn dần. Lờ đi thì chú mất kiên nhẫn. Phải tự quyết khi nào dừng. |
| **Khoa** (Muốn Đổi Đời) | "Kiểu tóc khiến người yêu cũ hối hận. Nhưng đừng thay đổi gì nhiều." | Cắt nhiều và nhanh làm Khoa hoảng (thanh Độ hoảng), rồi giật mình sau một tiếng "Ơ ơ…". Tóc đầy keo, nên máy sấy là đường thoát. |

## Hệ thống hài (quan hệ nhân quả)

**Chaos (0–100)** = hư hại đang thấy trên đầu (trọc, lệch, ngắn quá, tóc bị thổi lệch) + sự cố gần đây (nguội dần sau 5 giây yên ổn). Chaos có giới hạn trên và dưới, và mỗi sự cố có trần riêng.
Mức Chaos quyết định câu khách nói, xác suất khách quay đầu, và ở mức ≥ 92 khách đòi về (được năn nỉ đúng 1 lần).

Các sự kiện đều có điều kiện kích hoạt cụ thể (`src/game/session.ts`, mảng `RULES` và `endStroke`):

| Sự kiện | Kích hoạt khi | Dấu hiệu báo trước | Hậu quả |
|---|---|---|---|
| Đường Cạo Định Mệnh | Tông đơ đứng yên hoặc đi chậm trên chân tóc ≥ 0,5 s | Vòng đỏ quanh tông đơ, chân tóc đỏ lên | Mảng trọc. Khách im lặng 0,8 s rồi mới phát hiện. Nếu thành vệt dài thì vẽ vạch kẻ đường lên đầu |
| Mái Tóc Chạy Trốn | Đã có chỗ trọc, rồi dùng máy sấy quanh đó ≥ 0,8 s và tóc lệch hẳn sang một bên | — | Khách nghi ngờ. Kiểu tóc thành "Mái Tóc Chạy Trốn" |
| Gió Đổi Chiều | Máy sấy làm ≥ 25 % lọn tóc có keo dựng đứng | Từng lọn dựng lên kèm tiếng "pop" | Chú Bảy nổi đóa, Tuấn hoảng, Khoa sướng |
| Khách Không Chịu Ngồi Yên | Kiên nhẫn < 40 hoặc Chaos ≥ 50 (Khoa: Độ hoảng ≥ 75) | Dấu "!" + đầu rung + câu thoại, 0,75–0,95 s | Nếu dụng cụ vẫn đặt trên đầu thì đầu quay vào nó, tạo **Đường Cắt Lệch** (tông đơ cạo trọc) |
| Càng Sửa Càng Sai | ≥ 5 lần cắt vào cùng một vùng và vùng đó ngắn hơn các vùng khác 22 % | — | Chaos tăng, có câu nhận xét riêng, chú thích trên thẻ ghi số lần sửa |
| Phút Chót Toang | Mức hài lòng từng ≥ 70 rồi tụt ≥ 15 sau một nhát | — | Khách tiếc kiểu tóc lúc nãy |
| Cú Hắt Xì Định Mệnh | Nhiều tóc vụn + máy sấy chĩa vào mũi ≥ 0,6 s | "Hắt… hắt…" + mặt nhăn, 1 s | Đầu gục xuống, có thể gây đường cắt lệch (tối đa 3 lần) |
| Nhầm Dụng Cụ / Sấy Da Đầu | Tông đơ trên đầu Chú Bảy hoặc Khoa, máy sấy lên chỗ trọc | — | Mất kiên nhẫn, khách la lên |
| Khách Đòi Về / Bỏ Chạy | Chaos ≥ 92 hoặc kiên nhẫn về 0 | Khách nhổm dậy, có 3,2 s để năn nỉ | Kết thúc sớm |
| Tấm Gương Phán Xét | Kết thúc lượt | Khách lặng im nhìn gương 1,5 s | Phản ứng dựa trên tóc thật × tính cách × lỗi chính |

**Tên kiểu tóc** (`STYLE_RULES` trong `src/game/evaluate.ts`, có 23 kiểu) được suy ra từ số đo của mái tóc cuối cùng: Đường Cao Tốc Trên Đầu, Siêu Saiyan Bình Dân, Nửa Nạc Nửa Mỡ, Úp Bát Thành Công, Chó Gặm Nghệ Thuật, Mái Tóc Chạy Trốn… Bộ sưu tập các kiểu đã mở khóa được lưu trong trình duyệt để bạn có lý do cắt lại.

## Cấu trúc code

```
src/game/hair.ts       mô hình tóc (lọn tóc, hình học) + thao tác tông đơ, kéo, máy sấy
src/game/metrics.ts    đo đạc mái tóc: độ dài từng vùng, chỗ trọc, vệt trọc, keo, độ lệch, độ lởm chởm
src/game/customers.ts  dữ liệu 3 khách hàng + hàm tính mức hài lòng
src/game/session.ts    trạng thái lượt chơi, game loop, bộ luật sự kiện, Chaos, kiên nhẫn
src/game/evaluate.ts   đặt tên kiểu tóc, phản ứng cuối, chú thích, điểm
src/game/dialogue.ts   câu thoại theo tính cách × tình huống
src/game/card.ts       vẽ thẻ kết quả PNG (Canvas, tải theo nhu cầu)
src/components/        Character (SVG nhân vật), Stage, Panels, ResultPanel
src/audio/sfx.ts       âm thanh WebAudio
```

## Kiểm thử

```bash
npm test                      # 26 bài kiểm thử logic (Vitest)
npm run dev &                 # rồi:
npm run e2e                   # chơi thử tự động bằng Playwright/Chromium, chụp màn hình vào test-results/
BASE_URL=http://localhost:4173/ npm run e2e   # chạy với bản build (npm run preview)
```

Bài chơi thử tự động đi qua các kịch bản: A cắt đúng yêu cầu, B cạo quá sâu, C sửa đi sửa lại, D máy sấy + keo, E chơi lại / khách tiếp theo, khách quay đầu, tải ảnh PNG, và giao diện ở 390×844 (chạm thật), 768×1024, 1440×900.
