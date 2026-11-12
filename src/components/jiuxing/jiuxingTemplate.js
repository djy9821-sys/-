// 九星气学页面的骨架。内容由 jiuxingView.js 填进各个 id 为 jx-… 的容器。
export const JIUXING_TEMPLATE = `
<section aria-labelledby="jx-h-me">
  <h2 id="jx-h-me" class="sr">你的资料</h2>
  <div class="row">
    <label for="jx-profile" id="jx-profile-wrap" hidden>从档案选人<select id="jx-profile"><option value="">不选，自己填</option></select></label>
    <label for="jx-name">姓名<input type="text" id="jx-name" maxlength="20" autocomplete="off" placeholder="可不填"></label>
    <label for="jx-birth">出生日期（公历）<input type="date" id="jx-birth" min="1900-02-05" max="2060-12-31"></label>
    <label for="jx-gender">性别<select id="jx-gender"><option value="">不填</option><option value="女">女</option><option value="男">男</option></select></label>
    <label for="jx-home">常住城市<select id="jx-home"></select></label>
    <label for="jx-home-lat" class="custom-home" hidden>纬度<input type="number" id="jx-home-lat" step="0.0001" min="-85" max="85" placeholder="39.9042"></label>
    <label for="jx-home-lon" class="custom-home" hidden>经度<input type="number" id="jx-home-lon" step="0.0001" min="-180" max="180" placeholder="116.4074"></label>
    <span id="jx-sample" class="tag">示例，请改成你的资料</span>
  </div>
  <div class="who" id="jx-who"></div>
  <div class="pillars" id="jx-pillars"></div>
  <p class="note" id="jx-printed-note" hidden></p>
  <p class="hint">姓名只用来称呼，不参与计算；性别只在相性和人生三段里用到；城市用来量方向。</p>
</section>

<nav class="tabs" role="tablist" aria-label="分页" id="jx-tabs">
  <button type="button" role="tab" data-tab="zonglan" id="jx-t-zonglan" aria-controls="jx-p-zonglan">总览</button>
  <button type="button" role="tab" data-tab="yunshi" id="jx-t-yunshi" aria-controls="jx-p-yunshi">运势</button>
  <button type="button" role="tab" data-tab="fangwei" id="jx-t-fangwei" aria-controls="jx-p-fangwei">吉方位</button>
  <button type="button" role="tab" data-tab="xiangxing" id="jx-t-xiangxing" aria-controls="jx-p-xiangxing">相性</button>
  <button type="button" role="tab" data-tab="benming" id="jx-t-benming" aria-controls="jx-p-benming">本命</button>
  <button type="button" role="tab" data-tab="yiju" id="jx-t-yiju" aria-controls="jx-p-yiju">依据</button>
</nav>

<!-- 总览 -->
<div class="panel" id="jx-p-zonglan" role="tabpanel" aria-labelledby="jx-t-zonglan">
  <div class="sum-grid">
    <section class="wide" aria-labelledby="jx-h-z-now">
      <h2 id="jx-h-z-now">今年走到哪一季</h2>
      <div id="jx-z-now"></div>
      <p id="jx-z-outlook"></p>
      <button type="button" class="jump" data-tab="yunshi">看一生的起伏线</button>
    </section>
    <section aria-labelledby="jx-h-z-dir">
      <h2 id="jx-h-z-dir">最近能走的方向</h2>
      <p class="hint">从今天起 90 天内，各方最近一个三盘都过的日子。</p>
      <div id="jx-z-dir"></div>
      <button type="button" class="jump" data-tab="fangwei">看全部日子和回程</button>
    </section>
    <section aria-labelledby="jx-h-z-match">
      <h2 id="jx-h-z-match">和谁合得来</h2>
      <dl class="kv" id="jx-z-match"></dl>
      <button type="button" class="jump" data-tab="xiangxing">填对方的生日，合看两个人</button>
    </section>
    <section aria-labelledby="jx-h-z-guard">
      <h2 id="jx-h-z-guard">守护本尊</h2>
      <div id="jx-z-guard"></div>
      <button type="button" class="jump" data-tab="benming">看三柱和参拜的讲究</button>
    </section>
    <section aria-labelledby="jx-h-z-copy">
      <h2 id="jx-h-z-copy">带走这一页</h2>
      <p class="hint">把上面的结果整理成一段文字，方便发给本人。</p>
      <button type="button" class="go" id="jx-copy">复制文字摘要</button>
      <p class="hint" id="jx-copy-state" role="status"></p>
      <textarea id="jx-copy-text" readonly hidden aria-label="文字摘要"></textarea>
    </section>
  </div>
</div>

<!-- 运势 -->
<div class="panel" id="jx-p-yunshi" role="tabpanel" aria-labelledby="jx-t-yunshi" hidden>
  <section aria-labelledby="jx-h-y-now">
    <h2 id="jx-h-y-now">今年</h2>
    <div id="jx-y-now"></div>
    <p class="hint" id="jx-y-tempo"></p>
  </section>
  <section aria-labelledby="jx-h-life">
    <h2 id="jx-h-life">一生的起伏</h2>
    <p class="shape" id="jx-shape"></p>
    <p class="hint">上面一条是从出生到 96 岁的总览，点哪里，下面的大图就跳到哪里。大图可以左右滑动，每一年都标了季次、年份、干支和年龄，点某一年看那一年。</p>
    <div class="overview" id="jx-overview" role="button" tabindex="0" aria-label="一生总览，点击跳到对应年份"></div>
    <div class="ages" aria-hidden="true"><span>0 岁</span><span>12</span><span>24</span><span>36</span><span>48</span><span>60</span><span>72</span><span>84</span><span>96 岁</span></div>
    <div class="chart">
      <div class="yaxis" id="jx-yaxis"></div>
      <div class="scroller" id="jx-scroller"></div>
    </div>
    <div class="legend"><span><i class="l0"></i>春：起步</span><span><i class="l1"></i>夏：发力</span><span><i class="l2"></i>秋：收成</span><span><i class="l3"></i>冬：休整</span><span>峰、谷：这十二年里最高和最低的一年</span></div>
    <p class="picked" id="jx-picked"></p>
    <p class="hint">线只表示相对高低，没有分数。高、中、低是把这一类自己十二年里的最高和最低之间三等分。</p>
  </section>
  <section aria-labelledby="jx-h-next">
    <h2 id="jx-h-next">接下来十二年</h2>
    <div class="list" id="jx-next"></div>
  </section>
  <section aria-labelledby="jx-h-rounds">
    <h2 id="jx-h-rounds">一生逐年</h2>
    <p class="hint">每十二年一组，现在所在的这一组默认展开。</p>
    <div class="rounds" id="jx-rounds"></div>
  </section>
</div>

<!-- 吉方位 -->
<div class="panel" id="jx-p-fangwei" role="tabpanel" aria-labelledby="jx-t-fangwei" hidden>
  <section aria-labelledby="jx-h-compass">
    <h2 id="jx-h-compass">八方，接下来哪边走得通</h2>
    <div class="row">
      <label for="jx-from">从哪天起<input type="date" id="jx-from"></label>
      <label for="jx-span">往后查<select id="jx-span"><option value="30">30 天</option><option value="60">60 天</option><option value="90" selected>90 天</option><option value="180">180 天</option><option value="365">一年</option></select></label>
      <label for="jx-nights">回程最多隔几晚<select id="jx-nights"><option>1</option><option>2</option><option selected>3</option><option>5</option><option>7</option></select></label>
    </div>
    <div class="compass" id="jx-compass" role="group" aria-label="八个方向，点一个看日子"></div>
    <p class="hint" id="jx-compass-note"></p>
  </section>

  <section aria-labelledby="jx-dir-title">
    <h2 id="jx-dir-title"></h2>
    <p id="jx-dir-meaning"></p>
    <div id="jx-dir-detail" class="flat"></div>
    <h3 id="jx-places-title"></h3>
    <div class="chips" id="jx-dir-places"></div>
    <p class="hint" id="jx-places-note"></p>
  </section>

  <section aria-labelledby="jx-h-day">
    <h2 id="jx-h-day">这一天，八方怎么样</h2>
    <div class="row">
      <label for="jx-day">日期<input type="date" id="jx-day"></label>
      <button type="button" class="more" id="jx-day-today">回到今天</button>
    </div>
    <div class="dayline" id="jx-day-line"></div>
    <div class="boards" id="jx-boards"></div>
    <div class="legend"><span><i class="l-ok"></i>临调和星，可用</span><span><i class="l-aff"></i>犯五黄杀、暗剑杀或水火杀</span><span><i class="l-plain"></i>不是调和星</span></div>
    <div class="dirs" id="jx-dirs" role="group" aria-label="八个方向，点一个看理由"></div>
    <ul class="why" id="jx-why"></ul>
  </section>

  <section aria-labelledby="jx-h-bearing">
    <h2 id="jx-h-bearing">目的地在我家的哪个方向</h2>
    <div class="row">
      <label for="jx-dest">目的地<select id="jx-dest"></select></label>
      <label for="jx-dest-lat" class="custom-dest" hidden>纬度<input type="number" id="jx-dest-lat" step="0.0001" min="-85" max="85" placeholder="31.2304"></label>
      <label for="jx-dest-lon" class="custom-dest" hidden>经度<input type="number" id="jx-dest-lon" step="0.0001" min="-180" max="180" placeholder="121.4737"></label>
    </div>
    <p class="result" id="jx-bearing-out"></p>
    <button type="button" class="go" id="jx-bearing-use" hidden>按这个方向查日子</button>
    <p class="hint">家取最上面填的常住城市。方向按墨卡托地图上两点连线量，正北为 0°；四正方各占 30°，四隅各占 60°。城市取市中心的约略坐标，目的地很近或靠近分界线时，在地图软件里取两点的经纬度填进来更准。</p>
  </section>

  <section aria-labelledby="jx-h-rules">
    <h2 id="jx-h-rules">怎么走</h2>
    <ul class="plain" id="jx-rules"></ul>
  </section>
</div>

<!-- 相性 -->
<div class="panel" id="jx-p-xiangxing" role="tabpanel" aria-labelledby="jx-t-xiangxing" hidden>
  <section aria-labelledby="jx-h-x-base">
    <h2 id="jx-h-x-base">你和哪些人合</h2>
    <dl class="kv" id="jx-x-base"></dl>
    <p class="hint" id="jx-x-base-note"></p>
  </section>
  <section aria-labelledby="jx-h-x-pair">
    <h2 id="jx-h-x-pair">合看两个人</h2>
    <div class="row">
      <label for="jx-other-profile" id="jx-other-profile-wrap" hidden>从档案选对方<select id="jx-other-profile"><option value="">不选，自己填</option></select></label>
      <label for="jx-other-name">对方的称呼<input type="text" id="jx-other-name" maxlength="20" autocomplete="off" placeholder="可不填"></label>
      <label for="jx-other-birth">对方的出生日期（公历）<input type="date" id="jx-other-birth" min="1900-02-05" max="2060-12-31"></label>
      <label for="jx-other-gender">对方的性别<select id="jx-other-gender"><option value="">不填</option><option value="女">女</option><option value="男">男</option></select></label>
      <span id="jx-other-sample" class="tag">示例，请改成对方的生日</span>
    </div>
    <div id="jx-x-pair" class="flat"></div>
  </section>
</div>

<!-- 本命 -->
<div class="panel" id="jx-p-benming" role="tabpanel" aria-labelledby="jx-t-benming" hidden>
  <section aria-labelledby="jx-h-b-phase">
    <h2 id="jx-h-b-phase">年、月、日三柱与人生三段</h2>
    <p class="hint">日柱管幼年，月柱管求学到成年，年柱管成年以后。换柱不是哪一天突然换，前后几年慢慢过渡。</p>
    <div id="jx-b-phase"></div>
    <p class="note" id="jx-b-mix" hidden></p>
  </section>
  <section aria-labelledby="jx-h-b-guard">
    <h2 id="jx-h-b-guard">守护本尊</h2>
    <div id="jx-b-guard"></div>
    <h3>参拜的讲究</h3>
    <ul class="plain">
      <li>上午去。太阳开始偏西之前离开，最晚不过下午两点。</li>
      <li>衣着整齐，像去见一位敬重的长辈。</li>
      <li>请一道护符回家，供在屋里北面或西北面的高处，背北朝南，或背西北朝东南；通常供到年底送还。</li>
      <li>不必天天去，有机会时去就好。</li>
    </ul>
  </section>
  <section aria-labelledby="jx-h-b-tempo">
    <h2 id="jx-h-b-tempo">性子与节奏</h2>
    <p id="jx-b-tempo"></p>
    <p class="hint">五行按木、火、土、金、水的次序由快到慢。神兽里的“天”与土同样，不快不慢。</p>
  </section>
</div>

<!-- 依据 -->
<div class="panel" id="jx-p-yiju" role="tabpanel" aria-labelledby="jx-t-yiju" hidden>
  <section aria-labelledby="jx-h-notes">
    <h2 id="jx-h-notes">怎么算的</h2>
    <details open>
      <summary>神兽怎么定</summary>
      <ul>
        <li>先看出生那天的日柱落在六十甲子的哪一旬，共六旬：甲子、甲戌、甲申、甲午、甲辰、甲寅。</li>
        <li>再看出生的公历年是双数还是单数。双数年属阳，单数年属阴；立春前出生的也照公历年算。六旬各分阴阳，共十二类。</li>
        <li>六旬各有属性：土、金、火、天、木、水。阳的一类性质更明显，阴的一类缓一些，入春也晚一年。</li>
      </ul>
      <div class="tablewrap"><table id="jx-names"></table></div>
    </details>
    <details>
      <summary>春夏秋冬怎么排</summary>
      <ul>
        <li>每一类有自己入春的年份：阳年生的，逢旬首那个地支的年入春；阴年生的晚一年。之后春、夏、秋、冬各三年，十二年一轮。</li>
        <li>书里写明年支在立春换。六张图只按年标季，没有说哪一天换季；这里按立春那天换，是本页的约定。</li>
        <li>书里说，别处讲的天中杀、大杀界，指的就是这里的冬。算下来也对得上：每一类的冬三年，正好盖住日柱旬空的那两个地支。</li>
        <li>起伏线的形状量自书中的六张图。图上纵轴没有刻度，所以只分高、中、低，不给分数。</li>
      </ul>
    </details>
    <details>
      <summary>吉方位怎么判</summary>
      <ul>
        <li>出行那天的年星、月星、日星各排一张九宫盘，星入中宫，其余八星依次飞到八方。</li>
        <li>调和星是与本命星五行相生或相同的星，不算本命星自己，也不算五黄。</li>
        <li>某个方向在年、月、日三张盘上都临调和星，而且都不犯凶方，这一天这个方向才算走得通。</li>
        <li>凶方有三种：五黄所在的一方是五黄杀，它对面是暗剑杀；九紫临北、一白临南是水火杀。</li>
        <li>回程不跟着去程算，要按返回那天、朝反方向另查一遍。</li>
        <li>本命星看出生那年的年星，立春前出生的算上一年。</li>
      </ul>
    </details>
    <details>
      <summary>相性怎么看</summary>
      <ul>
        <li>先看地支，这一项最要紧：隔四位的两支是三合，合；正对面的一支是冲，不合。只取这两样。</li>
        <li>再看九星的五行：相生、相同为合，相克为不合，看的是谁扶谁、谁压谁。五黄在这里照常算土，这一点与择方不同。</li>
        <li>最后看各自的神兽：对方的地支落在你十二年里的哪一季，对方带给你的就像那一季。这一项只作补充。</li>
        <li>用哪一柱看：未满 6 岁看出生那天的支和星；女未满 18 岁、男未满 25 岁看生月的；之后看生年的。年龄按今天的满岁算。</li>
      </ul>
    </details>
    <details>
      <summary>历法从哪来，核对过什么</summary>
      <ul>
        <li>年星立春换，月星交节换，都按北京时间的日期，从交节当天起算，不看交节的时刻。日星阳遁顺数、阴遁逆数，平常在冬至、夏至附近的甲子日换，每十一年半有一次改在甲午日换。</li>
        <li>与《スゴ運。》所附的逐日表（1939 年 2 月至 2021 年 1 月，共 29,951 天）按日本时间逐日比对过：日星、年星全部相同；月星只有 1964 年 9 月 7 日一天不同，那年白露离午夜不到一分钟。</li>
        <li>2021 年 2 月以后的日子书里没有印，都由同一算法推出。抽查过日本历书 2026 年 11 月 11 日和 12 月 16 日两天，三星相同。下一次在甲午日换遁是 2031 年 12 月 20 日，那前后的日星各家历书可能不一样。</li>
        <li>日柱由程序直接推算。书末查神兽的速查表有 53 格与实际日柱对不上，牵涉 218 个生日；这里按日柱取，遇到这样的生日会在名帖下面注明。</li>
        <li>书里的十七组择方实例、十二类各十二年的季次、以及另外二十个生日的逐年季次，都照这一页的算法复算过，结果相同。</li>
      </ul>
    </details>
    <details>
      <summary>来历</summary>
      <ul>
        <li>十二神兽、十二年一轮的春夏秋冬、择方只取三种凶方、相性只取三合与冲，都出自唱田士始矢的《スゴ運。》，属近代日本九星气学一系，不是古籍里的成法。</li>
        <li>干支、旬、九星飞宫、五行生克、三合与冲，是原本就有的。</li>
        <li>八方的寓意取自书里的八方位表。守护本尊按生年地支配八尊，是日本流传的“一代守本尊”；把八尊配到八方，用的是地支方位（子北、卯东、午南、酉西）的传统配法，书里只按生年列了本尊。</li>
        <li>页面上的说明文字都是另写的，不是书里的原话。</li>
      </ul>
    </details>
    <details>
      <summary>书里还说了什么</summary>
      <ul>
        <li>先动起来。书里把“行动”放在第一条：知道了不去做，等于没算。</li>
        <li>屋里西侧多用黄色，像熟了的稻穗那种黄；东侧多用蓝色，像天亮前的天色。面积要大，一面墙或一幅窗帘那样。</li>
        <li>电视、电话、电脑这类会出声的东西，放在屋子东侧。</li>
        <li>有机会去登带天守阁的古城，战国到安土桃山时期筑的最好，后来复建的也算；上午去，尽量走楼梯。</li>
        <li>好运不要独占，为多数人做事，运气会转回来。</li>
      </ul>
    </details>
    <details>
      <summary>没有做进来的</summary>
      <ul>
        <li>姓名不参与任何计算，书里没有按姓名算的内容。</li>
        <li>书里没有推算彩票号码或中奖概率的办法，这里也没有。书里讲彩票的两条是作者个人的购买习惯，没有放进来。</li>
        <li>时辰的九星盘，以及岁破、月破、日破，书里作者自己不用，这里也不算。</li>
        <li>书里举的参拜寺院和古城都在日本，没有逐一列出。</li>
      </ul>
    </details>
  </section>
</div>
`;
