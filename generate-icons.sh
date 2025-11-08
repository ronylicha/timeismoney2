#!/bin/bash

# Generate all PWA icon sizes from logo.svg
SVG_PATH="/var/www/html/timeismoney2/public/images/logo.svg"
ICONS_DIR="/var/www/html/timeismoney2/public/images/icons"

echo "Generating PWA icons..."

# Standard PWA icon sizes
sizes=(16 32 72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    echo "Creating icon-${size}x${size}.png..."
    convert -background none -resize ${size}x${size} "$SVG_PATH" "$ICONS_DIR/icon-${size}x${size}.png"
done

# Generate logo.png (192x192 as standard)
echo "Creating logo.png..."
convert -background none -resize 192x192 "$SVG_PATH" "/var/www/html/timeismoney2/public/images/logo.png"

# Generate badge icon (simpler version for notifications)
echo "Creating badge icon..."
convert -background none -resize 72x72 "$SVG_PATH" "$ICONS_DIR/badge-72x72.png"

# Generate shortcut icons (using the same logo for now)
echo "Creating shortcut icons..."
convert -background none -resize 96x96 "$SVG_PATH" "$ICONS_DIR/timer-96x96.png"
convert -background none -resize 96x96 "$SVG_PATH" "$ICONS_DIR/invoice-96x96.png"
convert -background none -resize 96x96 "$SVG_PATH" "$ICONS_DIR/timesheet-96x96.png"

echo "All icons generated successfully!"
ls -la "$ICONS_DIR"