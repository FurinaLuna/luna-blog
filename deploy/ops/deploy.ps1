<#
.SYNOPSIS
    luna-blog 一键部署（Windows PowerShell / pwsh 均可）。

.DESCRIPTION
    省掉「build → scp → ssh 执行脚本」三步手工操作，一条命令完成：

        .\deploy\ops\deploy.ps1              # 前端（blog-web + blog-admin）发布
        .\deploy\ops\deploy.ps1 -Target server   # 后端（blog-server）发布
        .\deploy\ops\deploy.ps1 -DryRun      # 只打印将要做的事

    它做的事与手动流程完全一致，没有隐藏步骤：
      前端：bash deploy/ops/build-local.sh（本机构建）→ scp 到 /tmp → 服务器 release.sh 切版本
      后端：tar 打包 blog-server → scp → 解包 → 服务器 backend-release.sh（install/自检/重启）

.PARAMETER Target
    web（默认）= 前端静态产物；server = 后端代码。

.PARAMETER Version
    版本号，缺省为当前时间 yyyyMMdd-HHmm。前端发布用它做 releases/<版本> 目录名。

.PARAMETER HostName
    SSH 目标，缺省 ubuntu@43.143.72.12。

.PARAMETER SkipHealth
    跳过最后的健康检查（不建议）。

.PARAMETER DryRun
    只打印命令，不执行。

.EXAMPLE
    .\deploy\ops\deploy.ps1
.EXAMPLE
    .\deploy\ops\deploy.ps1 -Target server
#>
[CmdletBinding()]
param(
    [ValidateSet('web', 'server')]
    [string]$Target = 'web',
    [string]$Version = (Get-Date -Format 'yyyyMMdd-HHmm'),
    [string]$HostName = 'ubuntu@43.143.72.12',
    [switch]$SkipHealth,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RemoteRoot = '/var/www/luna-blog/src/deploy/ops'

function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Cmd([string]$Label, [scriptblock]$Action) {
    Write-Host "    $Label" -ForegroundColor DarkGray
    if ($DryRun) { return }
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "$Label 失败（exit $LASTEXITCODE）" }
}

function Find-Bash {
    # 注意：C:\WINDOWS\system32\bash.exe 是 WSL 的 bash，路径/PATH/引号行为都不同，
    # 会让 build-local.sh 里的 pnpm 报 `exec: node: not found`，必须排除。
    $candidates = @(
        'D:\Dev\Git\bin\bash.exe',
        'D:\Dev\Git\usr\bin\bash.exe',
        (Join-Path $env:ProgramFiles 'Git\bin\bash.exe'),
        (Join-Path $env:ProgramFiles 'Git\usr\bin\bash.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\usr\bin\bash.exe')
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    $cmd = Get-Command bash -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -notmatch 'system32') { return $cmd.Source }
    throw '找不到 Git Bash（只找到 WSL 的 bash.exe）。请安装 Git for Windows，或改用 RUNBOOK 里的手动流程。'
}

function Add-NodeToPath {
    # node 可能装在非标准目录（如 D:\Dev\Node\node24），Git Bash 继承 PATH 后 pnpm shim 才能 exec node
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $nodeDir = Split-Path $nodeCmd.Source
        if (($env:PATH -split ';') -notcontains $nodeDir) {
            $env:PATH = $nodeDir + ';' + $env:PATH
        }
    }
    # Git Bash(MSYS) 会把以 / 开头的参数当成路径改写（--base=/admin/ → D:/Dev/Git/admin/），
    # 会让后台构建产物引用坏路径，必须关闭参数自动转换。
    $env:MSYS_NO_PATHCONV = '1'
    $env:MSYS2_ARG_CONV_EXCL = '*'
}

function Test-RemoteHealth {
    if ($SkipHealth) { return }
    Write-Step '健康检查'
    ssh $HostName "curl -fsS http://127.0.0.1/api/health" | ForEach-Object {
        if ($_ -notmatch '"code":0') { throw "健康检查失败：$_" }
        Write-Host "    $_" -ForegroundColor Green
    }
}

$started = Get-Date
Write-Host "luna-blog 部署 · 目标=$Target · 版本=$Version · 主机=$HostName" -ForegroundColor Yellow
if ($DryRun) { Write-Host '（DryRun：只打印，不执行）' -ForegroundColor Yellow }

switch ($Target) {

    'web' {
        $bash = Find-Bash
        $tarball = Join-Path $RepoRoot "build\release-$Version.tgz"

        Write-Step '1/3 本机构建（blog-web + blog-admin）'
        Invoke-Cmd "bash deploy/ops/build-local.sh  (VERSION=$Version)" {
            $env:VERSION = $Version
            Add-NodeToPath
            # 不能把含中文的绝对路径当参数传给 bash（PS 5.1 → bash 编码会失真），
            # 改为先用 PowerShell 切到仓库根目录，bash 只接收相对路径。
            Push-Location -LiteralPath $RepoRoot
            try { & $bash -c 'bash deploy/ops/build-local.sh' }
            finally { Pop-Location }
        }

        if (-not $DryRun -and -not (Test-Path $tarball)) {
            throw "构建产物不存在：$tarball"
        }

        Write-Step '2/3 上传发布包'
        Invoke-Cmd "scp release-$Version.tgz → /tmp" {
            scp $tarball "${HostName}:/tmp/release-$Version.tgz"
        }

        Write-Step '3/3 服务器切换版本（release.sh）'
        Invoke-Cmd "sudo bash $RemoteRoot/release.sh $Version" {
            ssh $HostName "sudo bash $RemoteRoot/release.sh $Version"
        }

        Test-RemoteHealth
        Write-Host ''
        Write-Host "前端已发布：$Version（回滚：bash $RemoteRoot/rollback.sh <上一个版本>）" -ForegroundColor Green
    }

    'server' {
        $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "luna-server-$Version"
        $tarball = Join-Path $tmpDir 'blog-server.tgz'
        $remoteDir = "/tmp/luna-server-$Version"

        if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null }

        Write-Step '1/4 打包后端源码（排除 node_modules / dist / .env）'
        Invoke-Cmd "tar blog-server → blog-server.tgz" {
            tar -czf $tarball -C (Join-Path $RepoRoot 'blog-server') `
                --exclude node_modules --exclude dist --exclude .env --exclude uploads .
        }

        Write-Step '2/4 上传'
        Invoke-Cmd "scp blog-server.tgz → $remoteDir" {
            scp $tarball "${HostName}:/tmp/luna-server-$Version.tgz"
        }

        Write-Step '3/4 远端解包'
        Invoke-Cmd "ssh 远端解包到 $remoteDir" {
            ssh $HostName "rm -rf $remoteDir && mkdir -p $remoteDir && tar -xzf /tmp/luna-server-$Version.tgz -C $remoteDir"
        }

        Write-Step '4/4 服务器更新后端（backend-release.sh：install + 自检 + 重启）'
        Invoke-Cmd "sudo bash $RemoteRoot/backend-release.sh $remoteDir" {
            ssh $HostName "sudo bash $RemoteRoot/backend-release.sh $remoteDir"
        }

        Test-RemoteHealth
        Write-Host ''
        Write-Host '后端已更新（失败时看：ssh ' + $HostName + ' ''sudo journalctl -u luna-blog -n 50''）' -ForegroundColor Green
    }
}

Write-Host ("完成，用时 {0:N0} 秒。" -f ((Get-Date) - $started).TotalSeconds) -ForegroundColor Yellow
