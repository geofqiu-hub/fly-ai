#!/usr/bin/env node
/**
 * 为 macOS Dock 准备图标
 * 1. 调整到 256x256 尺寸
 * 2. 保持不透明背景（白色背景）
 * 3. 保存为新的 PNG 文件
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// 优先使用去除水印的版本，如果没有则使用原始图标
const inputPath = fs.existsSync(path.join(__dirname, '../build/icon_no_watermark.png'))
  ? path.join(__dirname, '../build/icon_no_watermark.png')
  : path.join(__dirname, '../build/icon.png')
const outputPath = path.join(__dirname, '../build/icon_dock.png')

async function prepareDockIcon() {
  try {
    console.log('Reading icon:', inputPath)
    
    // 读取原始图像
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    console.log('Original size:', metadata.width, 'x', metadata.height)
    console.log('Has alpha:', metadata.hasAlpha)
    
    // 处理图像：
    // 1. 调整到 256x256
    // 2. 保持不透明背景（不添加透明通道）
    // 3. 确保输出为 PNG 格式
    
    // 直接调整大小，保持不透明背景
    await image
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
      })
      .png()
      .toFile(outputPath)
    
    console.log('Processed icon saved to:', outputPath)
    
    // 验证输出文件
    const outputMetadata = await sharp(outputPath).metadata()
    console.log('Size:', outputMetadata.width, 'x', outputMetadata.height)
    console.log('Output has alpha:', outputMetadata.hasAlpha)
    
  } catch (error) {
    console.error('Error processing icon:', error)
    process.exit(1)
  }
}

prepareDockIcon()
