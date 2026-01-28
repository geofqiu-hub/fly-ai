#!/bin/bash
# 生成 macOS ICNS 图标的脚本
# 使用方法: ./scripts/generate-icns.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
ICON_PNG="$BUILD_DIR/icon.png"
ICONSET_DIR="$BUILD_DIR/icon.iconset"
ICNS_OUTPUT="$BUILD_DIR/icon.icns"

if [ ! -f "$ICON_PNG" ]; then
    echo "Error: icon.png not found at $ICON_PNG"
    exit 1
fi

echo "Generating ICNS from $ICON_PNG..."

# 清理旧的 iconset
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# 生成所需尺寸的图标
# 注意：iconutil 对 iconset 结构要求严格，如果失败，建议使用在线工具
# 在线工具推荐：https://cloudconvert.com/png-to-icns
# 或者使用 electron-builder，它会在构建时自动生成正确的 ICNS
sips -z 16 16 "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16.png"
sips -z 32 32 "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -z 512 512 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512.png"
sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png"

echo "Generated iconset files:"
ls -lh "$ICONSET_DIR"

# 尝试生成 ICNS
if iconutil -c icns "$ICONSET_DIR" -o "$ICNS_OUTPUT" 2>&1; then
    echo "Successfully generated $ICNS_OUTPUT"
    rm -rf "$ICONSET_DIR"
    file "$ICNS_OUTPUT"
else
    echo "Warning: iconutil failed. You may need to:"
    echo "1. Use an online tool: https://cloudconvert.com/png-to-icns"
    echo "2. Or use electron-builder which will generate it automatically during build"
    echo "3. Or manually create iconset in macOS Icon Composer"
    rm -rf "$ICONSET_DIR"
    exit 1
fi
