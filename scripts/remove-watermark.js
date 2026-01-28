#!/usr/bin/env node
/**
 * 去除图标中的水印
 * 使用图像处理技术移除"即梦"水印
 */

const sharp = require('sharp')
const path = require('path')

const inputPath = path.join(__dirname, '../build/icon.png')
const outputPath = path.join(__dirname, '../build/icon_no_watermark.png')

async function removeWatermark() {
  try {
    console.log('Reading image:', inputPath)
    
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    const width = metadata.width
    const height = metadata.height
    console.log('Image size:', width, 'x', height)
    
    // 方法：使用裁剪操作去除水印区域
    // 假设水印在右下角，裁剪后使用边缘扩展填充
    
    // 裁剪比例（可以调整，0.85 表示保留 85%，裁剪掉 15%）
    const cropRatio = 0.85
    const cropWidth = Math.floor(width * cropRatio)
    const cropHeight = Math.floor(height * cropRatio)
    
    console.log(`Cropping to remove watermark: ${cropWidth}x${cropHeight} (keeping ${(cropRatio * 100).toFixed(0)}%)`)
    
    // 裁剪掉右下角的水印区域
    const cropped = await image
      .extract({
        left: 0,
        top: 0,
        width: cropWidth,
        height: cropHeight
      })
      .toBuffer()
    
    // 扩展回原始尺寸，使用边缘像素智能填充
    // 先获取边缘颜色作为填充色
    const edgeSample = await sharp(cropped)
      .extract({
        left: cropWidth - 10,
        top: cropHeight - 10,
        width: 10,
        height: 10
      })
      .resize(1, 1)
      .raw()
      .toBuffer()
    
    const bgR = edgeSample[0]
    const bgG = edgeSample[1]
    const bgB = edgeSample[2]
    
    console.log(`Using edge color for fill: RGB(${bgR}, ${bgG}, ${bgB})`)
    
    // 扩展回原始尺寸
    await sharp(cropped)
      .extend({
        top: 0,
        left: 0,
        bottom: height - cropHeight,
        right: width - cropWidth,
        background: { r: bgR, g: bgG, b: bgB, alpha: 1 }
      })
      .png()
      .toFile(outputPath)
    
    console.log('Watermark removed! Saved to:', outputPath)
    
    console.log('Watermark removed! Saved to:', outputPath)
    console.log('Please check the result and adjust if needed.')
    
  } catch (error) {
    console.error('Error removing watermark:', error)
    process.exit(1)
  }
}

removeWatermark()
