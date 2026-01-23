#!/bin/bash

# 读取当前 package.json 中的版本号
VERSION=$(node -p "require('./package.json').version")

echo "📦 检测到版本号: v$VERSION"
echo "🚀 准备提交代码并发布标签..."

# 1. 提交所有更改 (包括版本号修改)
git add .
# 检查是否有文件需要提交，避免空提交报错
if ! git diff-index --quiet HEAD --; then
  git commit -m "chore(release): v$VERSION"
fi

# 2. 处理标签 (如果本地已存在同名标签则删除，确保使用最新提交)
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "⚠️  标签 v$VERSION 已存在，正在更新..."
  git tag -d "v$VERSION"
fi
git tag "v$VERSION"

# 3. 自动获取当前分支名
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "📡 准备推送到 GitHub (分支: $CURRENT_BRANCH)，请输入凭据："
echo "------------------------------------------------"

# 推送当前分支和标签
git push origin "$CURRENT_BRANCH"
git push origin "v$VERSION" --force

echo ""
echo "✅ 发布指令已同步！"
echo "🔗 请监控构建状态: https://github.com/geofqiu-hub/fly-ai/actions"
