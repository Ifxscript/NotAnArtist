#!/bin/bash
# Upload all fixed faststart MP4 videos to Cloudflare R2

BUCKET="notanartist"
SRC_DIR="/Users/APPLE/newp5js.project/purrbang-gallery/public/videos-v2"
R2_PREFIX="videos-v2"

TOTAL=$(ls "$SRC_DIR"/*.mp4 2>/dev/null | wc -l | tr -d ' ')
COUNT=0
FAILED=0

echo "=== Uploading $TOTAL MP4 files to R2 bucket: $BUCKET ==="
echo ""

for f in "$SRC_DIR"/*.mp4; do
    COUNT=$((COUNT + 1))
    BASENAME=$(basename "$f")
    R2_KEY="$R2_PREFIX/$BASENAME"

    echo -n "[$COUNT/$TOTAL] Uploading: $R2_KEY ... "

    npx wrangler r2 object put "$BUCKET/$R2_KEY" --file "$f" --content-type "video/mp4" --remote 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "OK"
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=== Done: $((COUNT - FAILED))/$TOTAL uploaded, $FAILED failed ==="
