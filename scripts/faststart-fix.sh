#!/bin/bash
# Batch fix all MP4 files: move moov atom to beginning (faststart)
# This is a metadata-only remux — no re-encoding, very fast.

SRC_DIR="/Users/APPLE/newp5js.project/purrbang-gallery/public/videos-v2"
TMP_DIR="/Users/APPLE/newp5js.project/purrbang-gallery/public/videos-v2-fixed"

mkdir -p "$TMP_DIR"

TOTAL=$(ls "$SRC_DIR"/*.mp4 2>/dev/null | wc -l | tr -d ' ')
COUNT=0
FAILED=0

echo "=== Faststart Fix: $TOTAL MP4 files ==="
echo ""

for f in "$SRC_DIR"/*.mp4; do
    COUNT=$((COUNT + 1))
    BASENAME=$(basename "$f")
    OUTFILE="$TMP_DIR/$BASENAME"

    # Skip if already fixed
    if [ -f "$OUTFILE" ]; then
        echo "[$COUNT/$TOTAL] SKIP (already done): $BASENAME"
        continue
    fi

    echo -n "[$COUNT/$TOTAL] Fixing: $BASENAME ... "

    ffmpeg -y -i "$f" -c copy -movflags +faststart "$OUTFILE" -loglevel error 2>&1
    
    if [ $? -eq 0 ] && [ -f "$OUTFILE" ] && [ -s "$OUTFILE" ]; then
        echo "OK"
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
        rm -f "$OUTFILE"
    fi
done

echo ""
echo "=== Done: $((COUNT - FAILED))/$TOTAL fixed, $FAILED failed ==="

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "All files fixed! Now replacing originals..."
    for f in "$TMP_DIR"/*.mp4; do
        BASENAME=$(basename "$f")
        mv "$f" "$SRC_DIR/$BASENAME"
    done
    rmdir "$TMP_DIR" 2>/dev/null
    echo "Originals replaced with faststart versions."
fi
