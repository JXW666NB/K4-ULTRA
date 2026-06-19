# ============================================================
# pack.ps1 - K4 Blink 扩展打包脚本
# 用法: .\pack.ps1 <扩展目录> [输出路径]
# 示例: .\pack.ps1 .\examples\hello-world .\output
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDir,

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

# ─── 检查源目录 ───
if (-not (Test-Path $SourceDir)) {
    Write-Host "[ERROR] 源目录不存在: $SourceDir" -ForegroundColor Red
    exit 1
}

# ─── 检查 manifest.json ───
$manifestPath = Join-Path $SourceDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Host "[ERROR] 找不到 manifest.json，请确保扩展目录包含此文件" -ForegroundColor Red
    exit 1
}

# ─── 读取 manifest 获取扩展名 ───
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$extName = $manifest.name
if (-not $extName) {
    Write-Host "[ERROR] manifest.json 中缺少 name 字段" -ForegroundColor Red
    exit 1
}

# ─── 确保输出目录存在 ───
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# ─── 打包 ───
$zipPath = Join-Path $OutputDir "$extName.zip"
$k4ultraPath = Join-Path $OutputDir "$extName.k4ultra"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " K4 Blink 扩展打包工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "扩展名称: $extName" -ForegroundColor White
Write-Host "源目录:   $SourceDir" -ForegroundColor White
Write-Host "输出:     $k4ultraPath" -ForegroundColor White
Write-Host ""

# 压缩
Write-Host "[1/2] 正在打包为 ZIP..." -ForegroundColor Yellow
Compress-Archive -Path "$SourceDir\*" -DestinationPath $zipPath -Force
Write-Host "  ✓ ZIP 已创建: $zipPath" -ForegroundColor Green

# 重命名
Write-Host "[2/2] 正在重命名为 .k4ultra..." -ForegroundColor Yellow
if (Test-Path $k4ultraPath) {
    Remove-Item $k4ultraPath -Force
}
Rename-Item $zipPath $k4ultraPath
Write-Host "  ✓ 扩展包已创建: $k4ultraPath" -ForegroundColor Green

Write-Host ""
Write-Host "文件大小: $((Get-Item $k4ultraPath).Length / 1KB) KB" -ForegroundColor Gray
Write-Host ""
Write-Host "使用方式: 将 .k4ultra 文件放入 resources/app/extensions/ 目录" -ForegroundColor Cyan
Write-Host "          重启编辑器即可自动加载" -ForegroundColor Cyan
Write-Host ""
