#!/usr/bin/env bash
# Promo assembly (skeleton): raw webm -> H.264 MP4 with title overlay + synth jingle.
# Usage: assemble.sh IN.webm OUT.mp4 [W] [H] [TITLE]
# Free/local only: ffmpeg drawtext (libfreetype) + sine-synth jingle (no external music).
set -euo pipefail
IN=$1; OUT=$2; W=${3:-1080}; H=${4:-1920}
TITLE=${5:-"Tiệm Cắt Tóc Bất Ổn"}
FONT=${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" 2>/dev/null || echo 0)
# webm from Playwright may lack duration metadata; fall back to counting.
if [[ -z "$DUR" || "$DUR" == "N/A" || "$DUR" == "0" ]]; then
  DUR=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$IN" | awk '{print $1/25}')
fi
FS=$(( W / 14 ))
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
printf '%s' "$TITLE" > "$TMP/title.txt"   # textfile= avoids escaping issues with Vietnamese text

# Jingle: 4 short notes (C-E-G-C), then low pad for the remaining duration.
ffmpeg -v error -y \
  -f lavfi -i "sine=f=523:d=0.18" -f lavfi -i "sine=f=659:d=0.18" \
  -f lavfi -i "sine=f=784:d=0.18" -f lavfi -i "sine=f=1047:d=0.4" \
  -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1,volume=0.25,apad,atrim=0:${DUR},afade=t=out:st=$(awk "BEGIN{print ($DUR>1)?$DUR-0.8:0}"):d=0.8[a]" \
  -map "[a]" -ac 2 -ar 44100 "$TMP/music.wav"

ffmpeg -v error -y -i "$IN" -i "$TMP/music.wav" \
  -filter_complex "[0:v]fps=30,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x1b1b2f,\
drawtext=fontfile=${FONT}:textfile=$TMP/title.txt:fontsize=${FS}:fontcolor=white:borderw=6:bordercolor=black:x=(w-tw)/2:y=h*0.08:enable='lt(t,2.5)',\
fade=t=in:st=0:d=0.4,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
