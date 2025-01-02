#!/usr/bin/env bash

# Show commands that are being run
set -x

# Prerequisites:
# `imagemagick` 7.1.1.23 (https://imagemagick.org/index.php)


OUTPUT_DIR="../public"
OUTPUT_DIR_FAVICONS_PNG="$OUTPUT_DIR/icons"
INPUT_FAVICON_SVG="$OUTPUT_DIR/favicon.svg"
OUTPUT_FAVICON_ICO="$OUTPUT_DIR/favicon.ico"
OUTPUT_FAVICON_PNG_SIZES=( 192 512 )

# Additional arguments to make generated images reproducible
CONVERT_ARGS_REPRODUCIBLE="-define png:exclude-chunks=date,time"

magick --version

# Create `ico` image file
# https://iconhandbook.co.uk/reference/chart/windows/
# Windows needs: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128
magick -background none "$INPUT_FAVICON_SVG" -define icon:auto-resize=128,64,48,32,16 "$OUTPUT_FAVICON_ICO"

# Create output directory
mkdir -p "$OUTPUT_DIR_FAVICONS_PNG"

# Create `png` image files
for PNG_SIZE in "${OUTPUT_FAVICON_PNG_SIZES[@]}"
do
    magick $CONVERT_ARGS_REPRODUCIBLE -background transparent -size "${PNG_SIZE}x${PNG_SIZE}" "$INPUT_FAVICON_SVG" -resize "${PNG_SIZE}x${PNG_SIZE}" -gravity center "$OUTPUT_DIR_FAVICONS_PNG/favicon-${PNG_SIZE}x${PNG_SIZE}.png"
done

# Custom for wide screenshot
magick $CONVERT_ARGS_REPRODUCIBLE "$OUTPUT_DIR_FAVICONS_PNG/favicon-512x512.png" -background transparent -gravity east -splice 256x -background transparent -gravity west -splice 256x "$OUTPUT_DIR_FAVICONS_PNG/favicon-1024x512.png"
