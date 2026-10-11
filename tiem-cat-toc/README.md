# Tiệm Cắt Tóc Bất Ổn

Game hài mô phỏng tiệm cắt tóc bình dân, chơi ngay trên trình duyệt (máy tính và điện thoại).
Bạn cắt tóc cho khách bằng chuột hoặc ngón tay. Mỗi thao tác thay đổi mái tóc thật, và các tai nạn xảy ra vì chính những thao tác đó.

## Chơi online

https://minhvuhero9.github.io/cv/game/ (GitHub Pages phục vụ nhánh `main`).
Cập nhật bản online: `npm run build:pages` (build vào thư mục `game/` ở gốc repo), rồi commit và merge vào `main`.

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

## Chế độ Mở Tiệm (sandbox nhiều ngày)

Đây là chế độ mặc định. Chế độ cũ vẫn còn: thêm `?mode=free` hoặc vào ⚙️ Cài đặt chọn "Cắt tự do".

**Vòng lặp mỗi ngày:** buổi sáng xem sự kiện trong ngày (luôn ghi rõ *vì sao*) và danh sách khách → mở cửa → phục vụ từng khách theo cách của bạn → cuối ngày tổng kết tiền công, tiền boa, tiền thuê, tiền điện, tiền phạt và Uy tín/Viral → mua sắm → sang ngày mới. Mọi thứ tự lưu vào trình duyệt (có bản sao lưu). ⚙️ có nút xóa tiến trình (phải xác nhận).

**Ba chỉ số tách biệt:**
- **Uy tín:** khách hài lòng thì tăng. Ảnh hưởng giá cắt (khoảng ×0,8 đến ×1,2), quyết định khách VIP có đến không, và khi quá thấp thì bị đánh giá 1 sao (bớt khách).
- **Viral:** tăng nhờ Chaos, sự cố, combo, kiểu tóc gây sốc và người xem livestream. Nguội 20% mỗi đêm. Viral cao kéo đến KOL, người ngoài hành tinh và thêm khách.
- **Chaos:** độ hỗn loạn trong từng ca cắt (như bản cũ).

Cắt đẹp thì có uy tín và tiền boa. Thảm họa có thể thành viral nhưng mất uy tín. Làm VIP nổi giận thì uy tín rơi gấp ba.

**Hậu quả kéo sang hôm sau:**
- Khách bị cắt hỏng quay lại đòi sửa, **mang theo đúng mái tóc hôm trước**. Nếu vẫn hỏng, họ bỏ tiệm luôn.
- Khách mê tay nghề quay lại sau hai ngày.
- Một kiểu tóc viral khiến hôm sau xuất hiện "Fan Cuồng Trend" đòi y hệt kiểu đó.
- Cậu Vàng rũ lông làm tiệm bừa bộn → hôm sau đoàn kiểm tra vệ sinh đến (bị phạt nếu không có Máy Hút).
- Máy móc mòn theo số lần dùng; dưới 25% thì bắt đầu trục trặc.

**Sự kiện theo ngày (có nguyên nhân):** chợ phiên (cứ 3 ngày), cắt điện luân phiên (ngày chia hết cho 4; máy dùng điện nghỉ trừ khi có máy phát), clip viral, kiểm tra vệ sinh, báo phường khen (uy tín ≥ 70), đánh giá 1 sao (uy tín < 30), biển neon.

### 15 khách hàng

| Khách | Điểm khác biệt khi chơi |
|---|---|
| Anh Tuấn, Chú Bảy, Khoa | Như bản gốc: ảnh mẫu, đòi sửa liên tục, giật mình |
| Chị Linh (văn phòng) | Chỉ có 50 giây; ghét đồ phép, thích lược |
| Cụ Tư (ngủ gật) | Đầu gục dần khi tiệm yên tĩnh; bật máy lúc cụ ngủ = cụ giật mình. Đến tiệm đã hói sẵn đỉnh đầu |
| Tí Sún (thích thể hiện) | Muốn mào gà; tạo dáng định kỳ (đầu xoay); mê súng tóc, máy sấy bão |
| Na Bông (KOL livestream) | Bộ đếm người xem: sự cố và combo kéo người xem, nhạt nhẽo thì mất người xem; viral ×2,5 |
| Anh Hai Hỏa Tốc (shipper) | 40 giây, điện thoại reo rồi quay đầu; càng xong sớm càng được nhiều điểm |
| Thầy Long (võ sư) | Giật mình (gió bão, tiếng súng, hắt xì…) là ra đòn: dụng cụ văng khỏi tay 4 giây, máy mòn thêm |
| Anh Phúc (sợ hói) | Đến tiệm đã hói; thêm chỗ trọc là hoảng loạn; muốn che chỗ hói (thổi, chải hoặc cho mọc lại bằng phép) |
| Chị Diễm (VIP) | Trả 500.000đ, uy tín ×3; mỗi sự cố làm chị mất kiên nhẫn gấp đôi |
| Khách X-79 (ngoài hành tinh) | Tóc phản trọng lực (bay *về phía* máy sấy); thích tia súng; cần biển neon và Viral ≥ 45 |
| Tèo (trốn học) | Muốn thay đổi càng nhiều càng tốt nhưng cấm trọc; thấy người quen là thụp đầu |
| **Cậu Vàng** (chó) | Hình chó riêng. Sợ tông đơ và máy hút (run, rên ư ử); sợ quá thì rũ lông bay khắp tiệm. Mê máy sấy (bình tĩnh lại). Ngửi mùi đồ ăn ngày chợ phiên là quay đầu, xúc xích chữa được. Có kiểu lông riêng (Sư Tử Mini, Cún Bông Gòn, Chó Cỏ Hạng Sang…), tiếng sủa và lời bà Hai |
| Fan Cuồng Trend | Chỉ xuất hiện khi có kiểu tóc viral; đòi đúng kiểu đó |

### Cửa hàng (mua là đổi gameplay)

Đồ nghề phép (Gậy Như Ý, Súng Tóc 3000, Lược Rồng), máy móc (Máy Sấy Bão, Nồi Cơm Điện, Máy Hút, **Máy Tạo Kiểu Tự Động**), vật phẩm hỗn loạn (**Thuốc Mọc Tóc Siêu Tốc**, **Keo Tóc Vĩnh Cửu**, Xúc Xích), nâng cấp (Ghế Massage: khách bớt quay đầu một nửa; Tông Đơ Nhật: 0,85 giây mới trọc; Điều Hòa; Ghế Chờ: +1 khách; Máy Phát Điện), trang trí (Góc Sống Ảo: viral +30%, giá +10%; Bằng Khen: uy tín +15%; Cây Phong Thủy: Chaos −15%), đặc biệt (Biển Cho Phép Thú Cưng → Cậu Vàng; Biển Neon → khách X-79, +2 viral/ngày) và bảo dưỡng máy.

**Tương tác phát sinh:**
- Thuốc mọc tóc + tông đơ → "Mọc Nhanh Hơn Cắt".
- Keo vĩnh cửu + Máy Sấy Bão → "Ăng-ten Bê Tông".
- Máy tạo kiểu tự động khi tiệm đang ồn (Chaos ≥ 50) → nghe nhầm, cắt theo yêu cầu của khách khác.
- Dụng cụ mạnh + khách nhạy cảm → phản ứng riêng theo dữ liệu (VIP, Linh, Phúc, Cậu Vàng…).
- Máy mòn → trục trặc.
- Cùng 3 combo của Bộ Đồ Nghề.

### Thêm nội dung bằng dữ liệu

- **Khách mới:** thêm một mục vào `CUSTOMERS` (`src/game/customers.ts`): ngoại hình, tóc, `wants` (mức hài lòng tính từ dữ liệu bằng `fromWants`), `behaviors` (tái sử dụng module trong `behaviors.ts`), `toolReactions`, `lines`, `mirror`, `pay`, `repWeight`/`viralWeight`, `appear` (điều kiện xuất hiện), `returns`, `voice`. Sau đó chạy `npm run voice` để lồng tiếng.
- **Vật phẩm mới:** thêm vào `SHOP` (`src/game/shop.ts`). Nếu vật phẩm cho dụng cụ mới thì thêm vào `TOOLS` (`tools.ts`) và xử lý trong `gear.ts`; nâng cấp thì đọc qua `s.ctx.items` trong `session.ts`.
- **Thoại:** xem `VOICE.md`.

## Lồng tiếng

1109 câu thoại tiếng Việt cho 15 khách và người dẫn, đã tạo bằng eSpeak NG chạy local, miễn phí. Chi tiết engine, giấy phép, giới hạn và cách thay bằng KhanhTTS/Piper nằm trong [`VOICE.md`](VOICE.md).

## Bộ Đồ Nghề Bất Ổn (dụng cụ phép thuật)

Toàn bộ là đồ nghề phép thuật hư cấu, chỉ tồn tại trong game. Dữ liệu cấu hình nằm ở `src/game/tools.ts` (tên, mô tả, độ hiếm, kiểu thao tác, hiệu ứng, điều kiện mở khóa, năng lượng/hồi chiêu). Thay đổi lên tóc nằm ở `src/game/magic.ts`, phần thao tác, năng lượng, hiệu ứng và combo nằm ở `src/game/gear.ts`.

| Dụng cụ | Thao tác | Tác động lên tóc | Giới hạn | Mở khóa |
|---|---|---|---|---|
| **Gậy Như Ý** (Sử thi) | Bấm giữ trên tóc rồi kéo: lên = dài, xuống = ngắn, ngang = to/nhỏ. Chạm nhẹ = uốn xoăn | Chiều dài tối đa gấp 3, độ dày, độ xoăn. Chỗ trọc mọc lại (xoăn) | Hết phép sau khoảng 2 giây giữ, nạp lại 4 giây | Cắt xong 1 lượt |
| **Súng Tóc 3000** (Hiếm) | Chạm để bắn | Nhuộm màu (mỗi phát một màu), dựng đứng, phóng to | 6 phát mỗi băng, cách nhau 0,35 giây, nạp băng 4 giây | Cắt xong 2 lượt |
| **Máy Sấy Bão** (Sử thi) | Kéo để ngắm, thả tay để thổi | Một cơn gió quét cả đầu theo hướng ngắm, tóc càng dài càng bay | Thổi 1 lần rồi hồi 3,5 giây | Gây ra sự cố "Gió Đổi Chiều" |
| **Máy Hút Tóc Vũ Trụ** (Huyền thoại) | Giữ để hút | Kéo tóc về phía vòi và rút ngắn. Giữ quá 2,2 giây thì nuốt cả một mảng (vòng xanh chuyển cam rồi đỏ để cảnh báo) | Khoảng 3 giây hút, nạp lại 5 giây | Mở khóa 4 kiểu tóc |
| **Lược Rồng** (Hiếm) | Chải | Tóc nằm theo hướng chải. Chải ngược lên làm phồng, chải vòng làm xoăn | Khoảng 4 giây chải, nạp lại 3 giây | Cắt xong 3 lượt |
| **Nồi Cơm Điện Tạo Kiểu** (Sử thi) | Chạm lên đầu | Úp nồi 1,5 giây (không cắt được trong lúc nấu), mở ra tóc phồng tròn như bánh bao | 2 lần, nạp lại 8 giây | Cắt xong 4 lượt |
| Con Dấu Phán Quyết, Pháo Hoa Tạo Kiểu | — | Chưa triển khai, hiện là "Sắp có" và không chọn được | — | — |

Muốn thử ngay mọi dụng cụ thì thêm `?unlock=all` vào địa chỉ, ví dụ `https://minhvuhero9.github.io/cv/game/?unlock=all`. Tiến trình mở khóa lưu trong trình duyệt.

### Combo

Mỗi combo có điều kiện cụ thể, giới hạn số lần mỗi lượt và thời gian hồi:

| Combo | Điều kiện | Hậu quả | Chống lặp |
|---|---|---|---|
| **Bão Tóc Dài** (Gậy Như Ý + Máy Sấy Bão) | Gió thổi trúng ≥ 8 lọn dài ≥ 1,8 lần (do Gậy kéo dài) | Tóc dài bị quật tung về một phía, xù và rối, một số lọn đứt bay theo gió | Tối đa 2 lần, cách nhau 10 giây |
| **Kỳ Lân Bảy Sắc** (Súng Tóc + Lược Rồng) | Một đường chải đi qua ≥ 6 lọn đã bị súng nhuộm và dựng | Các lọn đó dồn lại thành một cái sừng bảy màu | Tối đa 2 lần, cách nhau 8 giây |
| **Hút Nhầm Cả Nồi** (Nồi Cơm Điện + Máy Hút) | Hút trong vòng 10 giây sau khi hấp, trúng ≥ 5 lọn tóc hấp | Cả "bánh bao" bị hút: phần lớn bị rút ngắn, phần giữa trọc | 1 lần mỗi lượt |

Mỗi combo đều có pháo chữ "COMBO", âm thanh riêng, câu thoại theo tính cách khách, sự kiện trong nhật ký, chú thích trên thẻ kết quả và kiểu tóc riêng (Bão Cấp 12 Vừa Đi Qua, Kỳ Lân Bảy Sắc, Lỗ Đen Vũ Trụ).

## Cấu trúc code

```
src/game/hair.ts       mô hình tóc (lọn tóc, hình học) + thao tác tông đơ, kéo, máy sấy
src/game/metrics.ts    đo đạc mái tóc: độ dài từng vùng, chỗ trọc, vệt trọc, keo, độ lệch, độ lởm chởm
src/game/customers.ts  dữ liệu 3 khách hàng + hàm tính mức hài lòng
src/game/session.ts    trạng thái lượt chơi, game loop, bộ luật sự kiện, Chaos, kiên nhẫn
src/game/evaluate.ts   đặt tên kiểu tóc, phản ứng cuối, chú thích, điểm
src/game/dialogue.ts   câu thoại theo tính cách × tình huống
src/game/card.ts       vẽ thẻ kết quả PNG (Canvas, tải theo nhu cầu)
src/game/tools.ts      cấu hình Bộ Đồ Nghề (dữ liệu dụng cụ, mở khóa)
src/game/magic.ts      tác động của dụng cụ phép thuật lên tóc
src/game/gear.ts       năng lượng, thao tác, hiệu ứng và combo của dụng cụ phép thuật
src/game/progress.ts   tiến trình chế độ tự do (lưu trong trình duyệt)
src/game/career.ts     chế độ Mở Tiệm: ngày, hàng khách, sự kiện, tiền, uy tín, viral, lưu
src/game/shop.ts       danh mục cửa hàng
src/game/behaviors.ts  module hành vi khách (ngủ gật, võ sư, livestream, chó…)
src/game/voiceLines.ts danh sách thoại cần lồng tiếng
src/audio/voice.ts     VoiceManager (phát thoại, hàng đợi, âm lượng)
scripts/voice/         pipeline TTS (xuất câu, tạo file, kiểm tra, manifest)
src/components/        Character (SVG nhân vật), Stage, Panels, ResultPanel
src/audio/sfx.ts       âm thanh WebAudio
```

## Kiểm thử

```bash
npm test                      # 86 bài kiểm thử logic (Vitest): dụng cụ, combo, khách, hành vi, nhiều ngày, cửa hàng, lưu, thoại
npm run e2e:career            # chơi thử sandbox trong trình duyệt: 3 ngày, cửa hàng, tải lại trang, thoại, Cậu Vàng, điện thoại
npm run dev &                 # rồi:
npm run e2e                   # chơi thử tự động bằng Playwright/Chromium, chụp màn hình vào test-results/
BASE_URL=http://localhost:4173/ npm run e2e   # chạy với bản build (npm run preview)
```

Bài chơi thử tự động đi qua các kịch bản: A cắt đúng yêu cầu, B cạo quá sâu, C sửa đi sửa lại, D máy sấy + keo, E chơi lại / khách tiếp theo, khách quay đầu, tải ảnh PNG, và giao diện ở 390×844 (chạm thật), 768×1024, 1440×900. Phần đồ nghề: dụng cụ bị khóa với người chơi mới, mở khóa sau một lượt, từng dụng cụ phép thuật, cả ba combo, đổi dụng cụ giữa chừng, chơi lại để reset, và thanh công cụ trên điện thoại (62 kiểm tra).
