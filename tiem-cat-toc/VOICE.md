# Lồng tiếng tiếng Việt: pipeline TTS miễn phí, chạy local

Game phát file thoại đã tạo sẵn (MP3 trong `public/voice/`). Trình duyệt **không** tổng hợp giọng, không gọi API, không cần mạng ngoài để chơi.

## Đã kiểm tra những gì (máy hiện tại: 4 nhân CPU, 15 GB RAM, không GPU)

| Lựa chọn | Kết quả trên máy này | Giấy phép | Ghi chú |
|---|---|---|---|
| **Vietnamese TTS Studio / KhanhTTS-OmniVoice** (`vuhai2002/vietnamese-tts-studio`) | Không chạy được ở đây. Model khoảng 3 GB tải từ huggingface.co, mà mạng của môi trường này chặn huggingface.co. Cần Python 3.12 và PyTorch (máy có 3.13), nên dùng GPU NVIDIA (có chế độ CPU nhưng rất chậm). | Code: MIT. Model KhanhTTS: Apache-2.0 (theo README). Gốc OmniVoice (k2-fsa/Xiaomi): Apache-2.0. | Chất lượng tiếng Việt tốt nhất trong các lựa chọn, có nhân bản giọng. Pipeline đã hỗ trợ sẵn (`VOICE_ENGINE=khanhtts`). |
| **Piper TTS** + voice `vi_VN` | Cài được engine (`pip install piper-tts`) nhưng không tải được voice: cả ba voice tiếng Việt (`vi_VN-25hours_single-low`, `vi_VN-vais1000-medium`, `vi_VN-vivos-x_low`) chỉ có trên huggingface.co (bị chặn). | Engine: GPL-3.0 (piper1-gpl) / MIT (bản cũ). Mỗi voice có MODEL_CARD và giấy phép riêng theo bộ dữ liệu gốc. **Phải đọc từng MODEL_CARD trước khi dùng thương mại.** | Chạy tốt trên CPU, nhanh. Pipeline đã hỗ trợ sẵn (`VOICE_ENGINE=piper`). |
| **eSpeak NG** (gói Ubuntu `espeak-ng`) | **Chạy được và đang dùng.** Có 3 giọng: `vi` (Bắc), `vi-vn-x-central` (Trung), `vi-vn-x-south` (Nam), cộng các biến thể m1–m7, f1–f5, grandpa, grandma… | GPL-3.0 (phần mềm). File âm thanh sinh ra là dữ liệu đầu ra, thường không bị ràng buộc bởi GPL; vẫn nên hỏi tư vấn pháp lý trước khi phát hành thương mại. | Giọng máy móc, nghe rõ chữ nhưng không tự nhiên. Rất nhẹ, chỉ cần CPU, 1109 câu mất khoảng 2 phút. |

**Chọn eSpeak NG cho bản này** vì nó là lựa chọn miễn phí, chạy local duy nhất cài được trong môi trường hiện tại. Toàn bộ quy trình dùng chung cho cả ba engine. Trên máy truy cập được HuggingFace (tốt nhất là có GPU), chỉ cần chạy lại với `VOICE_ENGINE=khanhtts` hoặc `piper` để thay toàn bộ giọng mà không phải sửa code game.

Không dùng dịch vụ TTS trả phí nào, không có API key nào trong frontend hay trong repo.

## Quy trình

```bash
npm run voice:export     # 1. Xuất mọi câu thoại từ dữ liệu game -> voice/lines.json
npm run voice:generate   # 2. Tạo MP3, kiểm tra từng file, ghi manifest
npm run voice            # cả hai bước
```

1. **Danh sách thoại là dữ liệu.** `src/game/voiceLines.ts` liệt kê mọi câu mỗi nhân vật có thể nói, gắn với sự kiện kích hoạt. Nguồn câu: lời yêu cầu, thoại theo sự kiện, thoại riêng của từng khách, phản ứng soi gương, thoại dụng cụ, và thoại người dẫn (mở cửa, tiền boa, khách quay lại, clip viral, combo, đóng cửa…).
2. **Giọng theo nhân vật.** Mỗi khách có trường `voice` trong `customers.ts` (giọng vùng miền, biến thể, cao độ, tốc độ). Cao độ chỉ chỉnh nhẹ (35–68) để thanh điệu tiếng Việt vẫn nghe rõ. Ngoài giọng, nhân vật còn khác nhau ở cách viết thoại.
3. **Sinh file.** `scripts/voice/generate.mjs` chạy song song và có cache theo hash (engine + giọng + câu): chạy lại chỉ tạo câu mới hoặc câu đã sửa, và tự xóa file không còn dùng.
4. **Kiểm tra.** Mỗi file phải giải mã được, dài 0,25–20 giây và không im lặng (âm lượng trung bình trên −45 dB). File lỗi bị xóa và ghi vào `voice/missing.txt`.
5. **Manifest.** `public/voice/manifest.json` liên kết `speaker` (id nhân vật hoặc `narrator`), `event`, `text` với `file`.
6. **Game phát lại.** `src/audio/voice.ts` (VoiceManager) chỉ phát khi bong bóng thoại hiện đúng câu đó của đúng nhân vật. Vì vậy âm thanh luôn khớp với trạng thái thật của game: khách chỉ phàn nàn về máy sấy bão khi sự kiện đó thực sự xảy ra.

Kết quả lần chạy gần nhất (`voice/report.json`): **1109/1109 câu** tạo và kiểm tra thành công, 0 lỗi, tổng 8,6 MB, 16 giọng (15 khách và người dẫn).

## VoiceManager trong game

- **Hàng đợi một chỗ, có ưu tiên.** Phản ứng soi gương (3) > câu hét (2) > câu thường hoặc người dẫn (1). Câu quan trọng hơn ngắt câu đang phát; câu kém hơn thì chờ. Câu chờ quá 4,5 giây bị bỏ vì khoảnh khắc đã qua. Không bao giờ phát chồng hai câu.
- **Chống lặp.** Cùng một file không phát lại trong vòng 15 giây.
- **Âm lượng.** Cài đặt ⚙️ có thanh "Âm lượng tổng", "Lồng tiếng", "Hiệu ứng" và nút tắt toàn bộ âm thanh. Cài đặt lưu trong trình duyệt.
- **Autoplay.** Chỉ mở âm thanh sau lần bấm đầu tiên của người chơi.
- **Lỗi file.** File thiếu hoặc không tải được thì bị đánh dấu và bỏ qua, game vẫn chạy (có test riêng). Nếu không có manifest, game chạy im lặng.
- **Hiển thị.** Bong bóng thoại có viền sáng khi đang phát tiếng.

## Thêm thoại

1. Thêm câu vào dữ liệu (ví dụ `lines` của khách trong `customers.ts`, hoặc bảng `NEUTRAL`, `DOG_LINES`, `NARRATOR_LINES`).
2. Chạy `npm run voice`. Chỉ những câu mới được tạo file.
3. Test `src/game/voiceLines.test.ts` sẽ báo nếu game nói một câu không có trong danh sách.

Câu có số thay đổi theo ván (ví dụ "Sửa 7 lần…") không được lồng tiếng, chỉ hiện chữ.

## Dùng engine tốt hơn trên máy khác

```bash
# Piper (CPU là đủ). Tải voice .onnx + .onnx.json từ rhasspy/piper-voices (thư mục vi/vi_VN).
pip install piper-tts
VOICE_ENGINE=piper PIPER_MODEL=/duong/dan/vi_VN-vais1000-medium.onnx npm run voice:generate -- --force

# KhanhTTS-OmniVoice (nên có GPU). Clone vuhai2002/vietnamese-tts-studio rồi cài theo README của repo đó.
# Tuỳ chọn: voice/refs/<speaker>.wav để nhân bản giọng riêng cho từng nhân vật.
VOICE_ENGINE=khanhtts KHANHTTS_DIR=/duong/dan/vietnamese-tts-studio npm run voice:generate -- --force
```

Lưu ý về chi phí: phần mềm miễn phí không có nghĩa là miễn phí GPU, điện, dung lượng ổ đĩa (model KhanhTTS khoảng 3 GB) hay quyền dùng thương mại của mọi model. Không commit model, cache hay file `.wav` tạm vào Git (đã có trong `.gitignore`).
