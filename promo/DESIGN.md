# Quy trình làm video quảng cáo — "Tiệm Cắt Tóc Bất Ổn"

Trạng thái: **bản thiết kế + khảo sát** (2026-10-11). Chưa kích hoạt agent, chưa cài gì, chưa commit.

## 1. Kết quả khảo sát công cụ (máy hiện tại)

| Công cụ | Kết quả | Ghi chú |
|---|---|---|
| ffmpeg / ffprobe | **6.1.1-3ubuntu5** (`/usr/bin`) | encoder: `libx264`, `aac`, `libvpx(-vp9)`, `libopus`; filter: `drawtext` (libfreetype + fontconfig + harfbuzz), `xfade`, `subtitles`/`ass` (libass) |
| Node | v22.22.0 | |
| Playwright | 1.56.1 (trong `tiem-cat-toc/node_modules`) | Chromium 1194 tại `/opt/pw-browsers`; dùng qua `createRequire`, không cần cài |
| Playwright `recordVideo` | **Chạy được** | probe 540x960 → webm VP8 5.2 s, 657 KB, mất ~5.6 s |
| webm → MP4 | **Chạy được** | `_probe/probe_9x16.mp4` 1080x1920 h264+aac 30fps 5.2 s; `_probe/probe_16x9.mp4` 1920x1080 5.2 s |
| python3 + Pillow | 3.13.16 + Pillow 12.3.0 | dự phòng để vẽ thẻ tiêu đề |
| Font có tiếng Việt | DejaVu Sans/Serif, Inter, Inter Display, Liberation, FreeSans, Unifont; Noto Color Emoji | **không có** Noto Sans / Baloo; drawtext với DejaVu Sans Bold hiển thị dấu đúng (đã kiểm tra frame) |
| espeak-ng | 1.51, có giọng `vi` (Bắc) và `vi-vn-x-central` | chất lượng robot; **lồng tiếng tắt mặc định** (người dùng đã yêu cầu bỏ TTS khỏi game) |
| piper | không có | |
| sox | không có | ffmpeg `lavfi sine`/`aevalsrc` thay thế được để tạo nhạc |
| Ổ đĩa | `/` còn ~30 GB | 1 video 20 s ≈ 5–15 MB; raw webm ≈ 1–3 MB/10 s |
| Dev server | `http://localhost:5173/` trả 200 | đang dùng bởi agent code game — promo **không** dùng cổng này lâu dài |

MCP liên quan video trong phiên này: **Higgsfield** (generate_video, generate_audio, shorts_studio, reframe, upscale_video, tiktok_publish…) và **creative-claw** (generate_video, generate_music, generate_speech, render_html_video, assemble_film…). Cả hai **tính phí/credit** → chỉ dùng khi người dùng đồng ý rõ ràng. Khảo sát này không gọi tool nào của chúng.

## 2. Pipeline miễn phí / chạy local (đề xuất)

```
brief ("video 20s") → scripts/<slug>.md (kịch bản, lời thoại chữ)
  → storyboards/<slug>.json (shot list: card | gameplay, thời lượng, action, caption)
  → capture.mjs: Playwright recordVideo điều khiển game thật (data-testid: pick-<id>, start,
       tool-*, finish, mirror, next; tọa độ đầu qua SVG getScreenCTM như tests/e2e.mjs) → webm + timeline.json
  → thẻ tiêu đề: HTML/SVG → page.screenshot() PNG (1080x1920 & 1920x1080) → ffmpeg loop thành clip
  → assemble.sh: cắt theo timeline, scale/pad, drawtext caption (textfile=, font DejaVu/Inter),
       xfade chuyển cảnh, nhạc jingle tổng hợp bằng ffmpeg sine (hoặc nhạc royalty-free người dùng cung cấp
       trong assets/), loudnorm → out/<slug>_9x16.mp4 + out/<slug>_16x9.mp4 (+ poster.png)
```

- Quay **riêng cho từng tỉ lệ** (viewport 1080x1920 cho dọc, 1920x1080 cho ngang) để không phải pad viền đen (probe 16:9 hiện là pad từ bản dọc).
- Seed cố định (`?mode=free&seed=4`, `&unlock=all` khi cần khách hiếm) → lặp lại được.
- Kết quả chỉ là **bản nháp**; người dùng duyệt storyboard + MP4 trước khi đăng.

## 3. Cấu trúc thư mục

```
promo/
  DESIGN.md            (file này)
  .gitignore           out/  _probe/
  scripts/             kịch bản .md
  storyboards/         *.json (ví dụ: example-20s.json)
  assets/              logo, font tự thêm, nhạc royalty-free có giấy phép
  tools/               capture.mjs, assemble.sh, render-cards.mjs (khi kích hoạt; hiện nằm trong proposed/)
  out/                 MP4, webm thô, poster — KHÔNG commit
  proposed/            promo-video.agent.md, capture.mjs, assemble.sh (bản nháp)
```

## 4. Cách người dùng kích hoạt

1. Người dùng nói: *"Tạo video quảng cáo 20 giây cho game"*.
2. Agent chính spawn subagent **`promo-video`** (định nghĩa ở `.claude/agents/promo-video.md` — copy từ `promo/proposed/promo-video.agent.md` khi người dùng đồng ý), chạy **nền**.
3. Subagent: viết kịch bản → storyboard → build/preview game → quay → dựng → trả về đường dẫn `out/*.mp4`, storyboard, ffprobe, danh sách điểm cần duyệt.
4. Người dùng duyệt / yêu cầu sửa → chạy lại với storyboard đã chỉnh.

## 5. Chạy song song với việc code game

- Chỉ ghi trong `promo/`; **chỉ đọc** `tiem-cat-toc/` và `game/`. Không đổi gameplay, không commit.
- Không dùng dev server 5173 (đang hot-reload code dở dang). Thay vào đó: build ra thư mục riêng
  `npx vite build --outDir /home/user/cv/promo/out/build --base /` (đọc source, ghi vào promo) rồi
  `npx vite preview --outDir … --port 4180 --strictPort` hoặc `python3 -m http.server 4180`. Nếu build lỗi do code đang sửa dở → fallback bản live `https://minhvuhero9.github.io/cv/game/` (cần `--base` khớp).
- Tài nguyên: 1 Chromium headless + ffmpeg `-preset veryfast`, vài chục giây CPU; không ảnh hưởng đáng kể.

## 6. Tùy chọn AI-video trả phí (cần người dùng duyệt)

| Dịch vụ | Dùng cho | Cần duyệt |
|---|---|---|
| Higgsfield `generate_video` / `shorts_studio_create` / `reframe` / `upscale_video` | cảnh mở đầu cinematic, reframe tự động, upscale | đồng ý chi credit + ngân sách tối đa; xem `balance` cũng chỉ khi được phép |
| Higgsfield `tiktok_publish` | đăng TikTok | đồng ý riêng cho việc **đăng công khai** |
| creative-claw `generate_music` / `generate_sound_effect` | nhạc nền/SFX chất lượng cao | đồng ý chi credit; `estimate_generation` trước |
| creative-claw `generate_speech` | lồng tiếng người thật | đồng ý chi credit **và** bật voice-over (mặc định tắt) |
| creative-claw `generate_video` / `render_html_video` | b-roll AI, dựng HTML trên cloud | đồng ý chi credit; upload asset lên dịch vụ ngoài |

Quy tắc: agent chỉ **đề xuất** (kèm ước tính chi phí nếu người dùng cho phép ước tính), không bao giờ tự gọi.

## 7. Rủi ro / giới hạn

- `recordVideo` ghi theo thời gian thực, ~25 fps, VP8 nén mạnh → độ nét vừa phải; muốn sắc hơn: quay bằng chuỗi `page.screenshot()` theo khung hình (chậm hơn) hoặc viewport lớn + `deviceScaleFactor`.
- Webm có ~0.5–1 s trang trắng đầu (đang load) → cắt bằng `timeline.json` (mốc `menu`).
- Selector/tọa độ đầu có thể đổi khi agent code game sửa UI → capture phải chịu lỗi (try/catch, kiểm tra `data-testid` tồn tại), ghi cảnh báo thay vì crash. Probe hiện chưa tới bước `mirror` trong 7 s (dừng sau khi cắt) — cần tăng thời gian / chờ phase `cutting` qua `window.__tctbo.state()`.
- Font: không có Baloo/Noto Sans; dùng Inter/DejaVu hoặc người dùng thêm font OFL vào `assets/`.
- Nhạc tổng hợp sine nghe đơn giản; nhạc ngoài phải có giấy phép rõ ràng.
- espeak-ng tiếng Việt nghe máy móc → không khuyến nghị; voice-over mặc định tắt.
- Build game có thể fail giữa chừng khi code đang sửa → fallback bản live.
