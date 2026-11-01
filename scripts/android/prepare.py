#!/usr/bin/env python3
"""古书派安卓安装包的定制步骤，只在 CI 里跑（见 .github/workflows/android.yml）。

    python scripts/android/prepare.py web       # npm run build 之后：插入原生外壳脚本、去掉离线缓存脚本
    python scripts/android/prepare.py android   # npx cap add android 之后：图标、配色、权限、版本号

每处修改都核对模板原文，对不上就报错退出，避免 Capacitor 升级后悄悄改漏。
"""
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(os.environ.get('GSP_ANDROID_ROOT') or pathlib.Path(__file__).resolve().parents[2])
DIST = ROOT / 'dist'
ANDROID = ROOT / 'android'
RES = ANDROID / 'app/src/main/res'
ICON = ROOT / 'public/pwa-512x512.png'

# 与网站 manifest 的 theme_color / background_color 一致。
BACKGROUND = '#07110f'
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def fail(message):
    sys.exit(f'prepare.py: {message}')


def replace_once(path, old, new):
    text = path.read_text(encoding='utf-8')
    if text.count(old) != 1:
        fail(f'{path.relative_to(ROOT)} 里应当正好有一处 {old!r}，实际 {text.count(old)} 处')
    path.write_text(text.replace(old, new), encoding='utf-8')


def replace_pattern(path, pattern, new):
    text = path.read_text(encoding='utf-8')
    result, count = re.subn(pattern, new, text)
    if count != 1:
        fail(f'{path.relative_to(ROOT)} 里应当正好有一处 /{pattern}/，实际 {count} 处')
    path.write_text(result, encoding='utf-8')


def prepare_web():
    index = DIST / 'index.html'
    # 外壳脚本是普通 <script>：在网页的 module 脚本之前执行，页面一开始就能用上分享、返回键。
    replace_once(index, '</head>', '  <script src="/native-shell.js"></script>\n</head>')
    if not (DIST / 'native-shell.js').is_file():
        fail('dist/native-shell.js 不存在，先用 esbuild 打包 scripts/android/native-shell.js')
    # 网页文件都在安装包里，不需要离线缓存；留着反而可能让更新后的安装包继续用旧缓存。
    (DIST / 'sw.js').unlink(missing_ok=True)
    print('web: 已插入 native-shell.js，已去掉 sw.js')


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def make_icons():
    from PIL import Image, ImageDraw

    source = Image.open(ICON).convert('RGB')
    if source.size != (512, 512):
        fail(f'{ICON.name} 应为 512×512，实际 {source.size}')
    # 网站图标是 512 的圆角方块：去掉外圈描边和圆角，只留中间带星图的部分做自适应图标。
    inner = source.crop((28, 28, 484, 484))
    border = [inner.getpixel((x, y)) for x in range(inner.width) for y in (0, inner.height - 1)]
    border += [inner.getpixel((x, y)) for y in range(inner.height) for x in (0, inner.width - 1)]
    edge = tuple(round(sum(pixel[i] for pixel in border) / len(border)) for i in range(3))

    def mask(size, shape):
        big = Image.new('L', (size * 4, size * 4), 0)
        draw = ImageDraw.Draw(big)
        if shape == 'circle':
            draw.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        else:
            draw.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=round(size * 4 * 0.2), fill=255)
        return big.resize((size, size), Image.LANCZOS)

    for density, scale in DENSITIES.items():
        folder = RES / f'mipmap-{density}'
        if not folder.is_dir():
            fail(f'缺少 {folder.relative_to(ROOT)}')
        canvas = round(108 * scale)
        # 可见区 72dp；画成 68dp，星图最外圈约 31dp，落在 33dp 的安全圆内，任何形状的遮罩都不会切到星角。
        # 四周留出的 2dp 是底色，与图块边缘的平均色相同，看不出接缝。
        art = round(68 * scale)
        offset = (canvas - art) // 2
        foreground = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
        foreground.paste(inner.resize((art, art), Image.LANCZOS), (offset, offset))
        foreground.save(folder / 'ic_launcher_foreground.png', optimize=True)

        # 旧版安卓（8.0 以前）与少数桌面用的普通图标：取自适应图标的可见区，圆角方块与圆形各一份。
        composed = Image.new('RGBA', (canvas, canvas), edge + (255,))
        composed.alpha_composite(foreground)
        visible = round(72 * scale)
        start = (canvas - visible) // 2
        legacy_size = round(48 * scale)
        legacy = composed.crop((start, start, start + visible, start + visible)).resize((legacy_size, legacy_size), Image.LANCZOS)
        for name, shape in (('ic_launcher.png', 'square'), ('ic_launcher_round.png', 'circle')):
            icon = legacy.copy()
            icon.putalpha(mask(legacy_size, shape))
            icon.save(folder / name, optimize=True)
    return '#%02x%02x%02x' % edge


def prepare_android():
    if not ANDROID.is_dir():
        fail('android/ 不存在，先运行 npx cap add android')
    version_code = os.environ.get('APK_VERSION_CODE', '').strip()
    version_name = os.environ.get('APK_VERSION_NAME', '').strip()
    if not version_code.isdigit() or not version_name:
        fail('需要环境变量 APK_VERSION_CODE（正整数）和 APK_VERSION_NAME')

    # targetSdk 35 起，安卓 15 强制全面屏（网页画到状态栏底下），网页还没做安卓的安全区适配，先用 34。
    replace_pattern(ANDROID / 'variables.gradle', r'targetSdkVersion = \d+', 'targetSdkVersion = 34')
    build = ANDROID / 'app/build.gradle'
    replace_pattern(build, r'versionCode \d+', f'versionCode {version_code}')
    replace_pattern(build, r'versionName "[^"]*"', f'versionName "{version_name}"')

    # 定位：真太阳时「用当前位置」；相机：手势八卦。用到时才弹窗请求，拒绝了也不影响其他功能。
    replace_once(
        ANDROID / 'app/src/main/AndroidManifest.xml',
        '<uses-permission android:name="android.permission.INTERNET" />',
        '<uses-permission android:name="android.permission.INTERNET" />\n'
        '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n'
        '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n'
        '    <uses-permission android:name="android.permission.CAMERA" />\n'
        '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
        '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />',
    )

    (RES / 'values/gsp_colors.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="gsp_background">{BACKGROUND}</color>\n</resources>\n',
        encoding='utf-8',
    )
    styles = RES / 'values/styles.xml'
    # 启动画面：深色底 + 应用图标（安卓 12 起由系统画），不再用 Capacitor 自带的白底启动图。
    replace_once(
        styles,
        '<item name="android:background">@drawable/splash</item>',
        '<item name="android:background">@color/gsp_background</item>\n'
        '        <item name="windowSplashScreenBackground">@color/gsp_background</item>\n'
        '        <item name="android:statusBarColor">@color/gsp_background</item>\n'
        '        <item name="android:navigationBarColor">@color/gsp_background</item>',
    )
    # 主界面：状态栏、导航栏与网页同色，避免白屏闪一下。
    replace_once(
        styles,
        '<item name="android:background">@null</item>',
        '<item name="android:background">@null</item>\n'
        '        <item name="android:windowBackground">@color/gsp_background</item>\n'
        '        <item name="android:statusBarColor">@color/gsp_background</item>\n'
        '        <item name="android:navigationBarColor">@color/gsp_background</item>\n'
        '        <item name="android:windowLightStatusBar">false</item>',
    )
    for splash in RES.glob('drawable*/splash.png'):
        splash.unlink()

    edge = make_icons()
    replace_pattern(RES / 'values/ic_launcher_background.xml', r'#[0-9A-Fa-f]{6}', edge)
    print(f'android: versionCode {version_code}，versionName {version_name}，图标底色 {edge}')


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else ''
    if step == 'web':
        prepare_web()
    elif step == 'android':
        prepare_android()
    else:
        fail('用法：prepare.py web | android')
