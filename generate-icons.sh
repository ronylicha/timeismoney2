#!/bin/bash

# Generate all PWA icon sizes from pwa.png
SOURCE_IMAGE="/var/www/html/timeismoney2/public/pwa.png"
ICONS_DIR="/var/www/html/timeismoney2/public/images/icons"
PUBLIC_DIR="/var/www/html/timeismoney2/public"

echo "Generating PWA icons..."

# Create directories if they don't exist
mkdir -p "$ICONS_DIR"

# Standard PWA icon sizes
sizes=(16 32 72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    echo "Creating icon-${size}x${size}.png..."
    convert "$SOURCE_IMAGE" -resize ${size}x${size} "$ICONS_DIR/icon-${size}x${size}.png"
done

# iOS specific icons (apple-touch-icon)
echo "Generating iOS icons..."
convert "$SOURCE_IMAGE" -resize 120x120 "$ICONS_DIR/apple-touch-icon-120x120.png"
convert "$SOURCE_IMAGE" -resize 152x152 "$ICONS_DIR/apple-touch-icon-152x152.png"
convert "$SOURCE_IMAGE" -resize 167x167 "$ICONS_DIR/apple-touch-icon-167x167.png"
convert "$SOURCE_IMAGE" -resize 180x180 "$ICONS_DIR/apple-touch-icon-180x180.png"

# Copy the largest as default apple-touch-icon
cp "$ICONS_DIR/apple-touch-icon-180x180.png" "$PUBLIC_DIR/apple-touch-icon.png"
cp "$ICONS_DIR/apple-touch-icon-180x180.png" "$PUBLIC_DIR/apple-touch-icon-precomposed.png"

# Generate logo.png (192x192 as standard)
echo "Creating logo.png..."
convert "$SOURCE_IMAGE" -resize 192x192 "$PUBLIC_DIR/images/logo.png"

# Generate favicon
echo "Creating favicons..."
convert "$SOURCE_IMAGE" -resize 32x32 "$PUBLIC_DIR/favicon-32x32.png"
convert "$SOURCE_IMAGE" -resize 16x16 "$PUBLIC_DIR/favicon-16x16.png"
convert "$SOURCE_IMAGE" -resize 16x16 -resize 32x32 -resize 48x48 -colors 256 "$PUBLIC_DIR/favicon.ico"

# Generate badge icon (simpler version for notifications)
echo "Creating badge icon..."
convert "$SOURCE_IMAGE" -resize 72x72 "$ICONS_DIR/badge-72x72.png"

# Generate shortcut icons (using the same logo for now)
echo "Creating shortcut icons..."
convert "$SOURCE_IMAGE" -resize 96x96 "$ICONS_DIR/timer-96x96.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$ICONS_DIR/invoice-96x96.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$ICONS_DIR/timesheet-96x96.png"

echo "All icons generated successfully!"
ls -la "$ICONS_DIR"