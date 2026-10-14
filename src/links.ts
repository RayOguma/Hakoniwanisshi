// 箱庭日誌の「リンク」から開ける、管理人のお気に入りのページ: 高尾山の登山ガイドと、近所の喫茶店。
// どちらも、本物のウェブページらしく見えるように作る（写真のかわりの絵は、SVG で描く）

/** 山の風景（写真のかわり）。id は、色のぼかし（gradient）の名前に使うので、絵ごとに変える */
function scene(id: string, o: { sky: [string, string]; far: string[]; near: string; trees?: string[]; extra?: string }) {
  // 木は、決まった並び（毎回同じ絵になるように、乱数は使わない）
  const trees = (o.trees ?? [])
    .map((_, i) => {
      const n = 26;
      return Array.from({ length: n }, (_, k) => {
        const x = ((k * 37 + i * 53) % 400) + ((k * 7) % 11);
        const y = 176 + ((k * 29 + i * 17) % 52);
        const r = 9 + ((k * 13 + i * 5) % 9);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.trees![(k + i) % o.trees!.length]}"/>`;
      }).join('');
    })
    .join('');
  const far = o.far
    .map((c, i) => {
      const base = 120 + i * 22;
      const pts = Array.from({ length: 9 }, (_, k) => `${k * 50},${base - ((k * 31 + i * 47) % 38)}`).join(' ');
      return `<polygon points="0,240 ${pts} 400,240" fill="${c}"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient></defs>
    <rect width="400" height="240" fill="url(#${id})"/>
    ${o.extra ?? ''}
    ${far}
    <polygon points="0,240 0,186 70,170 150,182 240,164 320,178 400,168 400,240" fill="${o.near}"/>
    ${trees}
  </svg>`;
}

/** 遠くの富士山（雪をかぶった山） */
const FUJI = `<polygon points="150,128 205,62 222,62 280,128" fill="#8fa3c4"/><polygon points="205,62 222,62 236,80 226,76 216,84 206,76 194,80" fill="#fff"/>`;

const PHOTOS = {
  hero: scene('tk-hero', { sky: ['#7fb8ea', '#dff0fb'], far: ['#9db4d4', '#7f9cbf', '#5f8a6c'], near: '#3f7a4a', trees: ['#2f6a3c', '#4a8a52', '#3a7a46'], extra: FUJI }),
  spring: scene('tk-spring', { sky: ['#a8d4f2', '#f4f8fb'], far: ['#b9cfc0', '#8fb89a'], near: '#6aa868', trees: ['#f6b8cc', '#f9d0dc', '#e89ab4', '#7ab870'] }),
  summer: scene('tk-summer', { sky: ['#4f9fe0', '#c8e6f8'], far: ['#6fa88a', '#4a8a62'], near: '#2f7a40', trees: ['#1f6a34', '#2f8a44', '#3f9a50'], extra: '<circle cx="330" cy="46" r="22" fill="#fff8d0"/>' }),
  autumn: scene('tk-autumn', { sky: ['#8cc0e8', '#f6efe0'], far: ['#c9a47a', '#b8784a'], near: '#9a5a34', trees: ['#d9482f', '#f08a2c', '#f2c040', '#c0362c', '#e86a30'] }),
  winter: scene('tk-winter', {
    sky: ['#3a3f78', '#f6a45a'],
    far: ['#3a3454', '#2a2640'],
    near: '#1c1a2c',
    extra: `<circle cx="213" cy="60" r="16" fill="#fff6c8"/><circle cx="213" cy="60" r="30" fill="#ffd27a" opacity="0.35"/><polygon points="150,128 205,62 222,62 280,128" fill="#2f2a48"/>`,
  }),
  cable: scene('tk-cable', {
    sky: ['#9fd0f0', '#eef7fc'],
    far: ['#8fb89a'],
    near: '#4a8a52',
    trees: ['#2f6a3c', '#4a8a52'],
    extra: '',
  }).replace('</svg>', '<line x1="0" y1="226" x2="400" y2="96" stroke="#6a6a6a" stroke-width="5"/><g transform="rotate(-18 200 150)"><rect x="150" y="118" width="96" height="44" rx="8" fill="#f2c94c"/><rect x="150" y="140" width="96" height="22" rx="6" fill="#4a9a5a"/><rect x="160" y="124" width="18" height="14" fill="#dff0fb"/><rect x="184" y="124" width="18" height="14" fill="#dff0fb"/><rect x="208" y="124" width="18" height="14" fill="#dff0fb"/></g></svg>'),
};

/** 高尾山 登山ガイド。まじめな、きちんとした案内のページ */
export class TakaoView {
  constructor(el: HTMLElement) {
    const photo = (svg: string, cap: string) => `<figure class="tk-photo">${svg}<figcaption>${cap}</figcaption></figure>`;
    el.innerHTML = `
      <div class="tk">
        <header class="tk-head">
          <div class="tk-logo">高尾山 登山ガイド</div>
          <nav><span class="on">ホーム</span><span>コース紹介</span><span>アクセス</span><span>四季の風景</span><span>登山の心得</span></nav>
        </header>
        <div class="tk-hero">${PHOTOS.hero}<div class="tk-hero-text"><h1>都心から一時間の、豊かな自然。</h1><p>標高 599 メートル。はじめての方にも、歩きなれた方にも。</p></div></div>
        <div class="tk-body">
          <section>
            <h2>高尾山について</h2>
            <p>高尾山は、東京都八王子市にある、標高 599 メートルの山です。都心から近く、登山道がよく整備されているため、一年を通して、多くの方が訪れます。</p>
            <p>中腹には、長い歴史をもつ寺院「薬王院」があり、山頂からは、天気のよい日に 富士山を望むことができます。</p>
            <table>
              <tr><th>標高</th><td>599 メートル</td></tr>
              <tr><th>所在地</th><td>東京都八王子市</td></tr>
              <tr><th>歩く時間の目安</th><td>ふもとから山頂まで、約 90〜110 分（コースによります）</td></tr>
              <tr><th>おすすめの季節</th><td>一年中。とくに、春の桜と、秋の紅葉</td></tr>
            </table>
          </section>

          <section>
            <h2>コース紹介</h2>
            <div class="tk-courses">
              <div class="tk-course rec">
                <div class="tk-badge">はじめての方に</div>
                <h3>1号路（表参道コース）</h3>
                <p class="tk-data">約 3.8 km ／ 登り 約 100 分</p>
                <p>ふもとから山頂まで、ほとんどが舗装された道です。途中に、茶屋や薬王院があり、休みながら ゆっくり登れます。迷ったら、まずこのコースを。</p>
              </div>
              <div class="tk-course">
                <h3>4号路（吊り橋コース）</h3>
                <p class="tk-data">約 1.5 km ／ 約 50 分</p>
                <p>森の中を歩き、吊り橋を渡る、静かなコースです。1号路の途中から 分かれます。</p>
              </div>
              <div class="tk-course">
                <h3>6号路（びわ滝コース）</h3>
                <p class="tk-data">約 3.3 km ／ 登り 約 90 分</p>
                <p>沢に沿って歩く、すずしいコースです。足もとが ぬれている所があるので、すべりにくい靴で。</p>
              </div>
              <div class="tk-course">
                <h3>稲荷山コース</h3>
                <p class="tk-data">約 3.1 km ／ 登り 約 90 分</p>
                <p>尾根を歩く、見晴らしのよいコースです。土の道と階段が続き、山歩きらしさを味わえます。</p>
              </div>
            </div>
          </section>

          <section>
            <h2>アクセス</h2>
            <div class="tk-access">
              ${photo(PHOTOS.cable, 'ケーブルカー。ふもとの清滝駅から、中腹まで約 6 分')}
              <div>
                <p><b>電車で</b><br>京王線「高尾山口」駅で下車。新宿から、約 50 分です。駅から、ケーブルカーの清滝駅まで、歩いて約 5 分。</p>
                <p><b>ケーブルカー・リフト</b><br>ふもとから中腹まで、ケーブルカーか リフトで登ることもできます。帰りだけ乗る方も、多くいらっしゃいます。</p>
                <p><b>お車で</b><br>駐車場は、数に限りがあります。紅葉の季節の休日は たいへん混みあいますので、電車のご利用を おすすめします。</p>
              </div>
            </div>
          </section>

          <section>
            <h2>四季の風景</h2>
            <div class="tk-seasons">
              ${photo(PHOTOS.spring, '春 ― 山桜が、斜面を うすい桃色に染めます（4月）')}
              ${photo(PHOTOS.summer, '夏 ― 深い緑の中は、ふもとより 少しすずしく感じます（7月）')}
              ${photo(PHOTOS.autumn, '秋 ― 紅葉の見ごろ。一年で いちばん にぎわいます（11月）')}
              ${photo(PHOTOS.winter, '冬 ― 山頂から見る、富士山に沈む夕日（12月）')}
            </div>
          </section>

          <section>
            <h2>登山の心得</h2>
            <ul>
              <li>歩きなれた靴で。舗装された 1号路でも、下りは ひざに こたえます。</li>
              <li>飲みものを、多めに。休憩は、疲れる前に とりましょう。</li>
              <li>日が暮れると、山道は 急に暗くなります。午後 3 時までには、下りはじめましょう。</li>
              <li>ごみは、持ち帰りましょう。</li>
              <li>ご自分の速さで。追い抜かれても、気にすることはありません。</li>
            </ul>
          </section>
        </div>
        <footer class="tk-foot">高尾山 登山ガイド ／ 掲載の時間は、目安です。天気と体調に合わせて、無理のない計画を。</footer>
      </div>`;
  }
}

/** 喫茶ポプラ。マスターが、色とりどりに作った、にぎやかすぎるページ */
export class CafeView {
  constructor(el: HTMLElement) {
    const rainbow = (text: string) =>
      [...text].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
    const flow = '☆★☆ ようこそ 喫茶ポプラへ ☆★☆ 本日のおすすめは 鉄板ナポリタン ☆★☆ コーヒーの おかわりは マスターの気分しだい ☆★☆ ごゆっくり どうぞ ☆★☆';
    el.innerHTML = `
      <div class="cf">
        <div class="cf-ss"><span>【重要】さくさくサーバー 個人ホームページサービスは、3月31日（あと<span class="days-left">7</span>日）をもって終了いたします。終了後、公開中のページは すべて削除されます。</span></div>
        <div class="cf-flow"><span>${flow}　${flow}</span></div>
        <div class="cf-top">
          <div class="cf-spin">🍝</div>
          <h1 class="cf-title">${rainbow('喫茶ポプラ')}</h1>
          <div class="cf-spin rev">☕</div>
        </div>
        <div class="cf-sub">～ 駅の裏で 五十年 ～ <b class="cf-blink">Since 1974!!</b></div>
        <div class="cf-count">あなたは <span>0004649</span> 人目の お客さまです <i>（ヨロシク）</i></div>

        <div class="cf-grid">
          <section class="cf-box a">
            <h2>★ マスターの ごあいさつ ★</h2>
            <p>マスターです。</p>
            <p>ホームページというものを、孫に教わって 作りました。</p>
            <p>色は、多いほうが にぎやかで良い、と思います。<b class="cf-blink">動くと、なお良い</b> と思います。</p>
            <p>見づらい、という ご意見は、受けつけておりません。</p>
          </section>

          <section class="cf-box b">
            <h2>◆ おしながき ◆</h2>
            <table>
              <tr class="top"><td>鉄板ナポリタン <b class="cf-new">いちばん人気!</b><small>卵を 敷いてあります</small></td><td>650円</td></tr>
              <tr><td>ブレンドコーヒー<small>苦いです</small></td><td>350円</td></tr>
              <tr><td>クリームソーダ<small>緑です</small></td><td>480円</td></tr>
              <tr><td>ミックスサンド<small>ふつうです</small></td><td>550円</td></tr>
              <tr><td>モーニング<small>ゆで卵は、固めです</small></td><td>400円</td></tr>
              <tr><td>マスターの気まぐれケーキ<small>ない日が 多いです</small></td><td>時価</td></tr>
            </table>
          </section>

          <section class="cf-box c">
            <h2>● お店の ばしょ ●</h2>
            <p>駅の裏口を出て、右へ 30 歩。</p>
            <p>大きな ポプラの木が、目じるしです。</p>
            <p class="cf-tiny">※ 木は、十年前に 切りました。</p>
            <p><b>あいている時間</b>　朝 7 時 ～ 夕方 7 時</p>
            <p><b>おやすみ</b>　水曜日と、マスターが 釣りに行く日</p>
          </section>

          <section class="cf-box d">
            <h2>♪ 伝言板 ♪</h2>
            <div class="cf-msg"><b>マスター</b><time>2012/03/11</time><p>箱庭さん、最近 お見えになりませんね。いつもの 窓ぎわの席、あけてあります。</p></div>
            <div class="cf-msg"><b>箱庭</b><time>2011/08/20</time><p>マスター、ごちそうさまでした。しばらく、来られないかもしれません。ナポリタン、また 食べに来ます。</p></div>
            <div class="cf-msg"><b>マスター</b><time>2010/06/22</time><p>＞箱庭さん　ありがとうございます。もっと、ちかちか させます。</p></div>
            <div class="cf-msg"><b>箱庭</b><time>2010/06/21</time><p>ホームページ、拝見しました。目が ちかちかします。でも、にぎやかで、いいですね。</p></div>
            <div class="cf-msg"><b>マスター</b><time>2010/05/30</time><p>伝言板を 作りました。どなたでも、どうぞ。</p></div>
          </section>
        </div>

        <div class="cf-wip">▼▲▼ ここから下は、工事中です ▼▲▼</div>
        <footer class="cf-foot">このページは、画面を 大きくして ご覧ください ／ 相互リンク 大歓迎 ／ © 喫茶ポプラ</footer>
      </div>`;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ことりサーバー。引っ越し先。ひとりでやっている、小さなサーバー（問題13で、主人公が検索して見つける） */
export class KotoriView {
  private input: HTMLInputElement;
  private button: HTMLButtonElement;
  private result: HTMLElement;

  constructor(private el: HTMLElement) {
    el.innerHTML = `
      <div class="kt">
        <div class="kt-logo">🐦 ことりサーバー</div>
        <div class="kt-sub">ちいさな ホームページの、ちいさな おうち</div>
        <div class="kt-facts">
          <div><b>無料</b>お金は、いただきません</div>
          <div><b>10,000字</b>ひとつのページに 置ける大きさ</div>
          <div><b>広告なし</b>帯も、出しません</div>
        </div>
        <div class="kt-box">
          <h2>ごあいさつ</h2>
          <p>ことりサーバーは、わたしが ひとりで やっている、ちいさな サーバーです。</p>
          <p>大きな会社のように、たくさんは 置けません。ひとつのページにつき、10,000字まで。写真も、置けません。</p>
          <p>そのかわり、わたしが 元気なうちは、消しません。だれも 見に来なくなったページも、そのまま 置いておきます。</p>
        </div>
        <div class="kt-box">
          <h2>お引っ越しの うけつけ</h2>
          <p>いま お使いのページのアドレスを 入れてください。ここに 入る大きさか、はかります。</p>
          <p>※ ページは、<b>&lt;/html&gt;</b> で きちんと 閉じてください。閉じていないページは、受けとれません。</p>
          <p>※ お引っ越しの日は、ページの <b>いちばん下</b>に、ことりサーバーへの <b>リンク</b>を はってください。ページは、そのリンクを通って 届きます（このリンクは、字数に 数えません。届いたら、消えます）。</p>
          <div class="kt-form"><input class="kt-input" readonly placeholder="http://"><button type="button" class="kt-btn">大きさを はかる</button></div>
          <div class="kt-result" hidden></div>
        </div>
        <div class="kt-foot">ことりサーバー ／ ひとりで やっているので、お返事は ゆっくりです</div>
      </div>`;
    this.input = el.querySelector('.kt-input')!;
    this.button = el.querySelector('.kt-btn')!;
    this.result = el.querySelector('.kt-result')!;
  }

  /** アドレスの欄に、ゆっくり打ちこむ（主人公が打つ） */
  async typeAddress(text: string) {
    this.input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.input.value = '';
    for (const ch of text) {
      this.input.value += ch;
      await sleep(45 + Math.random() * 40);
    }
  }

  /** アドレスの欄を空にして、前に はかった結果を消す（もう一度、はかり直すとき） */
  clear() {
    this.input.value = '';
    this.result.hidden = true;
  }

  /** アドレスの欄に、打ってあった形にする（途中から始めるとき） */
  setAddress(text: string) {
    this.input.value = text;
  }

  /** 「大きさを はかる」ボタン（プレイヤーがクリックする。カーソルの合図を出すため） */
  measureButton(): HTMLButtonElement {
    return this.button;
  }

  /** はかった結果を出す（size: ページの字数、capacity: 置ける字数、closed: ページが </html> で閉じてあるか） */
  showResult(size: number, capacity: number, closed: boolean, openComment = false) {
    const over = size - capacity;
    this.result.hidden = false;
    // 受けとれないとき（はみ出している・コメントが閉じていない）は、赤い箱
    this.result.className = over > 0 || openComment ? 'kt-result over' : 'kt-result ok';
    this.result.innerHTML =
      `ページの大きさ：<b>${size.toLocaleString()} 字</b> ／ 置ける大きさ：<b>${capacity.toLocaleString()} 字</b><br>` +
      (over > 0
        ? `<b>${over} 字</b>、はみ出しています。このままでは、お引っ越し できません。ページを 少し 小さくして、もう一度 どうぞ。`
        : openComment
          ? `入ります（あと ${-over} 字）。ですが、ページの終わりに、閉じていない コメント（&lt;!-- ）が あります。このままでは、受けとれません。`
          : closed
          ? `入ります（あと ${-over} 字）。ページも、きちんと 閉じてあります。お引っ越しの日を、お待ちしています。`
          : `入ります（あと ${-over} 字）。あとは、ページを &lt;/html&gt; で 閉じてください。`);
    this.el.scrollTo({ top: this.el.scrollHeight, behavior: 'smooth' });
  }
}
