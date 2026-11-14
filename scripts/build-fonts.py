#!/usr/bin/env python3
"""裁剪霞鹜文楷，生成网页用的两个字体文件（不在 CI 里跑，字体变了才手动跑）。

  标题字 src/assets/fonts/gsp-kai-display.woff2  封面、书名、罗盘上的字（Medium）
  正文字 src/assets/fonts/gsp-kai-text.woff2     藏经阁的原文、篇名、作者（Regular）

用法：
  pip install fonttools brotli
  python3 scripts/build-fonts.py <LXGWWenKai-Medium.ttf> <LXGWWenKai-Regular.ttf>   生成
  python3 scripts/build-fonts.py --check                                           只看现有字体缺哪些字
字体取自 https://github.com/lxgw/LxgwWenKai（SIL OFL 1.1，许可见 public/licenses/LXGW-WenKai-OFL.txt）。
录入新的古籍后，原文里可能出现子集里没有的字；那些字会退回系统字体显示，不影响阅读，
攒到一批后重新跑一遍本脚本补上即可。装不了 brotli 的机器会改用 Node 自带的 brotli 压缩。
"""
import json
import os
import subprocess
import sys
import types

try:
    import brotli  # noqa: F401
except ImportError:
    # WOFF2 要用 brotli 压缩。没装 Python 的 brotli 时，借 Node 自带的（项目本来就要 Node）。
    def _node(script, data):
        return subprocess.run(['node', '-e', script], input=data, stdout=subprocess.PIPE, check=True).stdout

    _READ = "const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{const b=Buffer.concat(c);process.stdout.write(%s)})"
    _shim = types.ModuleType('brotli')
    _shim.MODE_GENERIC, _shim.MODE_TEXT, _shim.MODE_FONT = 0, 1, 2
    _shim.__version__ = 'node-zlib'
    _shim.error = RuntimeError
    _shim.compress = lambda data, mode=0, quality=11, lgwin=22, lgblock=0: _node(
        _READ % ('z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_MODE]:%d,[z.constants.BROTLI_PARAM_QUALITY]:%d,[z.constants.BROTLI_PARAM_LGWIN]:%d,[z.constants.BROTLI_PARAM_SIZE_HINT]:b.length}})' % (mode, quality, lgwin)), data)
    _shim.decompress = lambda data: _node(_READ % 'z.brotliDecompressSync(b)', data)
    sys.modules['brotli'] = _shim

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUNCT = '《》·，。；：、？！「」『』（）—…〈〉“”‘’□ '
ASCII = ''.join(chr(c) for c in range(0x20, 0x7F))
XIU = '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸'
SHAN = '子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬'
# 用标题字排的固定文字：封面的题名、两扇门，藏经阁的架名、印章。
DISPLAY_COPY = '古书派问命藏经阁以古籍原文批命每一句批语，都能翻到出处八字紫微斗数六爻待入藏钤过印的排盘按逐条原文与白话对照部篇'


def classics():
    base = os.path.join(ROOT, 'src', 'data', 'classics')
    for module in ('bazi', 'ziwei', 'liuyao'):
        folder = os.path.join(base, module)
        for name in sorted(os.listdir(folder)):
            if name.endswith('.json'):
                with open(os.path.join(folder, name), encoding='utf-8') as handle:
                    yield json.load(handle)


def registry_text():
    with open(os.path.join(ROOT, 'src', 'data', 'classics.js'), encoding='utf-8') as handle:
        return handle.read()


def make(source, chars, target):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = False
    font = subset.load_font(source, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=''.join(sorted(chars)))
    subsetter.subset(font)
    cmap = font.getBestCmap()
    missing = sorted(ch for ch in chars if ch.strip() and ord(ch) not in cmap)
    subset.save_font(font, target, options)
    return os.path.getsize(target), missing


def wanted():
    """两个字体各要哪些字：标题字是界面上固定的那些，正文字是全部原文、篇名、卷名。"""
    registry = registry_text()
    display = set(DISPLAY_COPY + XIU + SHAN + PUNCT + ASCII) | {ch for ch in registry if '一' <= ch <= '鿿'}
    text = set(PUNCT + ASCII) | {ch for ch in registry if '一' <= ch <= '鿿'}
    for doc in classics():
        text |= set(str(doc.get('section', ''))) | set(str(doc.get('volume', '')))
        for entry in doc.get('entries', []):
            text |= set(entry.get('original', '')) | set(str(entry.get('section', '')))
    text.discard('\n')
    # 底本里电脑显示不了的字（Unicode 私用区）页面上本来就换成「□」，不用进字体。
    text = {ch for ch in text if not '\ue000' <= ch <= '\uf8ff'}
    return (('标题字', display, 'gsp-kai-display.woff2'), ('正文字', text, 'gsp-kai-text.woff2'))


def check(out):
    """现有字体里缺哪些字（缺的字页面上退回系统字体）。"""
    for label, chars, name in wanted():
        path = os.path.join(out, name)
        if not os.path.exists(path):
            print(f'{label} {name}: 还没生成')
            continue
        cmap = TTFont(path).getBestCmap()
        missing = sorted(ch for ch in chars if ch.strip() and ord(ch) not in cmap)
        print(f'{label} {name}: 要 {len(chars)} 字，缺 {len(missing)} 字{"：" + "".join(missing) if missing else ""}')


def main():
    out = os.path.join(ROOT, 'src', 'assets', 'fonts')
    if sys.argv[1:] == ['--check']:
        check(out)
        return
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sources = {'标题字': sys.argv[1], '正文字': sys.argv[2]}
    os.makedirs(out, exist_ok=True)
    for label, chars, name in wanted():
        size, missing = make(sources[label], chars, os.path.join(out, name))
        print(f'{label} {name}: {len(chars)} 字，{size} 字节；原字体里没有的字：{"".join(missing) or "无"}')


if __name__ == '__main__':
    main()
