// 主人公のブラウザの、ほかのタブ: 検索エンジン「サガス」と、解説サイト「やさしいHTML・CSS入門」。
// どちらも、本物のウェブページらしく見えるように作る（広告も、このゲームのためのオリジナル）

export interface Result {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 最後にカーソルがあった所（ブラウザは、マウスが動くかクリックされるまで位置を教えてくれないので、ゲームの始めからずっと覚えておく）。
 * null は、カーソルが画面の外にいる
 */
let pointer: { x: number; y: number; path: EventTarget[] } | null = null;
const remember = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY, path: e.composedPath() });
document.addEventListener('pointermove', remember, true);
document.addEventListener('pointerdown', remember, true);
document.documentElement.addEventListener('pointerleave', () => (pointer = null));

/**
 * プレイヤーが自分でクリックする番。カーソルのまわりに、脈打つ黄色い輪を出す（光っている所と同じ色）。
 * 光っている所にカーソルを乗せると、輪が大きく濃くなる。クリックすると、輪がはじけて消える。終わらせる関数を返す
 */
export function yourTurn(target: HTMLElement): () => void {
  const ring = Object.assign(document.createElement('div'), { id: 'turn-ring' });
  document.body.append(ring);
  const place = () => {
    ring.hidden = !pointer;
    if (!pointer) return;
    ring.style.left = `${pointer.x}px`;
    ring.style.top = `${pointer.y}px`;
    // 住人はシャドウ DOM の中にいるので、e.target ではなく、通り道で調べる
    ring.classList.toggle('over', pointer.path.includes(target));
  };
  // カーソルを動かさなくても、合図はすぐ出す（覚えておいた位置に）。光る所が、ちょうどカーソルの下に出てきたときも分かるように
  place();
  if (pointer) ring.classList.toggle('over', target.contains(document.elementFromPoint(pointer.x, pointer.y)));
  const move = () => place();
  document.addEventListener('pointermove', move);
  document.documentElement.addEventListener('pointerleave', move);
  return () => {
    document.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', move);
    ring.classList.add('pop');
    setTimeout(() => ring.remove(), 500);
  };
}

export const RESULTS_FIRST: Result[] = [
  { id: 'a', title: '今日のおもしろニュースまとめ｜ネタの森', url: 'netanomori.example.com', snippet: '思わず笑ってしまう、今日のおもしろニュースを毎日お届け。猫が駅長に就任した話など……' },
  { id: 'b', title: '暇つぶしにぴったり！ 無料で遊べるブラウザゲーム10選', url: 'game-sagashi.example.jp', snippet: 'インストール不要ですぐ遊べる、おすすめのブラウザゲームを紹介します。' },
  { id: 'c', title: '【検証】カップ麺は何分で一番おいしくなるのか', url: 'kensho-daisuki.example.com', snippet: '2分、3分、5分……。すべて食べ比べてみた結果、意外な結論に。' },
  { id: 'd', title: 'おもしろサイト まとめ｜暇つぶしナビ', url: 'hima-navi.example.com', snippet: 'ついつい時間を忘れてしまう、おもしろサイトを厳選して紹介。毎週更新。' },
  { id: 'e', title: '世界の変な看板コレクション', url: 'hen-kanban.example.org', snippet: '「この先、たぶん道」など、思わず二度見してしまう看板を集めました。' },
  { id: 'f', title: 'ひたすら猫が箱に入るだけの動画チャンネル', url: 'nekobako.example.tv', snippet: '箱があれば入る。それが猫。今日も新しい箱が届きました。' },
  { id: 'g', title: '【診断】あなたを駅弁にたとえると？', url: 'shindan-ya.example.jp', snippet: '10の質問に答えるだけ。あなたにぴったりの駅弁がわかります。' },
  { id: 'h', title: 'きょうは何の日？ 毎日の記念日カレンダー', url: 'kinenbi.example.com', snippet: '一年366日、すべての記念日と、その由来をまとめました。' },
  { id: 'i', title: 'おもしろ自販機マップ｜全国版', url: 'jihanki-map.example.jp', snippet: 'おでん缶、昆虫食、なぜか傘。全国の変わった自販機を、地図で探せます。' },
  { id: 'j', title: '質問掲示板：「おもしろいサイトを教えてください」', url: 'oshiete.example.com', snippet: '回答 32件 ／ ベストアンサー：「ここで聞いている時点で……」' },
];

export const RESULTS_OLD: Result[] = [
  { id: 'a', title: '個人ホームページ黄金時代を振り返る｜ウェブ考古学', url: 'web-kouko.example.jp', snippet: 'キリ番、相互リンク、アクセスカウンター。あの頃のホームページ文化を、写真とともに振り返ります。' },
  { id: 'hako', title: '箱庭日誌 〜定年エンジニアの手作りページ〜', url: 'www.example.ne.jp/~hakoniwa/', snippet: 'ようこそ。住人たちが、のんびり暮らしています。 ― 最終更新 2012/02/' },
  { id: 'b', title: 'まだ残ってる！ 懐かしの個人サイト探訪記', url: 'natsukashi-blog.example.com', snippet: '十年以上更新されていないのに、今も見られる個人サイトを探して歩く連載。第48回。' },
  { id: 'c', title: 'ホームページ作成ソフト 比較 2009年版', url: 'soft-hikaku.example.jp', snippet: '※この記事の情報は古くなっています。' },
  { id: 'd', title: 'テキストサイトの思い出｜インターネット老人会', url: 'rojinkai.example.com', snippet: '大きな文字、ツッコミの改行。あの頃みんなが読んでいた「テキストサイト」の話。' },
  { id: 'e', title: 'ホームページを作ろう！ 〜タグの基本〜', url: 'homepage-tsukuro.example.ne.jp', snippet: '<marquee> で文字を流してみよう！ ※一部のブラウザでは表示されません。（最終更新 2004年）' },
  { id: 'f', title: '相互リンク募集中！｜まったり日記帳', url: 'www.example.ne.jp/~mattari/', snippet: 'キリ番 44444 を踏んだ方は、BBSで報告してください♪ 管理人：みかん' },
  { id: 'g', title: '閉鎖のお知らせ', url: 'www.example.ne.jp/~yume/', snippet: 'これまで遊びに来てくださった皆さま、本当にありがとうございました。このページは……' },
  { id: 'h', title: 'ウェブアーカイブで、消えた個人サイトを探す方法', url: 'archive-sagashi.example.com', snippet: '昔のアドレスさえわかれば、保存された当時のページを見られることがあります。' },
  { id: 'i', title: '【掲示板】昔よく見てた個人サイトを語るスレ Part12', url: 'keijiban.example.net', snippet: '>>215 カーソル追いかけてくるキャラがいるサイト、まだあるのかな' },
];

export const RESULTS_CSS: Result[] = [
  { id: 'guide', title: '透け具合を変える（opacity）｜やさしいHTML・CSS入門', url: 'yasashii-html.example.com/css/opacity', snippet: 'opacity は、どれくらい透けて見えるかを決めます。0 で見えなくなり、1 でまったく透けなくなります。' },
  { id: 'a', title: 'CSSで要素を半透明にする方法【初心者向け】', url: 'code-memo.example.jp', snippet: 'opacity と rgba の違いを、図を使って解説します。' },
  { id: 'b', title: '透明人間になる方法はあるのか？ 科学者に聞いてみた', url: 'nazo-lab.example.com', snippet: '光を曲げる「メタマテリアル」の研究が進んでいるが……' },
  { id: 'c', title: 'ホームページ作成でよくある質問 100', url: 'hp-faq.example.jp', snippet: '「画像が出ない」「文字が透けて見える」「レイアウトが崩れる」など、よくある困りごとをまとめました。' },
  { id: 'd', title: 'スマホの画面が透けて見える？ 液晶の故障かも', url: 'sumaho-shuri.example.com', snippet: '画面に前の画像がうっすら残る「焼き付き」の直し方と、修理の目安。' },
  { id: 'e', title: '質問掲示板：自分のホームページの画像が、半透明になってしまいます', url: 'oshiete.example.com', snippet: '回答 3件 ／ 「スタイルシートを見てみてください。どこかに書いてあるはずです」' },
  { id: 'f', title: 'レースのカーテン 透けない選び方', url: 'interior-note.example.jp', snippet: '外から見えにくい、遮像タイプのカーテンを比べてみました。' },
  { id: 'g', title: 'CSS リファレンス｜プロパティ一覧', url: 'css-ref.example.org', snippet: 'すべての CSS プロパティを、アルファベット順に。上級者向け。' },
  { id: 'h', title: 'すけすけ！ 透明なお菓子の作り方', url: 'okashi-recipe.example.com', snippet: '寒天とゼリーで作る、透き通った和菓子のレシピ。' },
  { id: 'i', title: '水彩画で「透け感」を出すコツ', url: 'suisai-kyoshitsu.example.com', snippet: '色を重ねすぎないこと。紙の白を、生かしましょう。' },
];

export class SearchView {
  private input: HTMLInputElement;
  private results: HTMLElement;

  constructor(private el: HTMLElement) {
    el.innerHTML = `
      <div class="sg">
        <div class="sg-top">
          <div class="sg-logo"><b style="color:#4a90d9">S</b><b style="color:#e0605a">a</b><b style="color:#f2b84a">g</b><b style="color:#4a90d9">a</b><b style="color:#5ab07a">s</b><b style="color:#e0605a">u</b></div>
          <div class="sg-box"><input class="sg-input" readonly><button type="button" class="sg-btn">検索</button></div>
        </div>
        <div class="sg-results"></div>
      </div>`;
    this.input = el.querySelector('.sg-input')!;
    this.results = el.querySelector('.sg-results')!;
  }

  /** 検索欄に、ゆっくり打ちこんで、結果を出す */
  async search(query: string, results: Result[]) {
    this.input.value = '';
    this.results.replaceChildren();
    this.el.scrollTop = 0;
    for (const ch of query) {
      this.input.value += ch;
      await sleep(90 + Math.random() * 60);
    }
    await sleep(400);
    this.el.querySelector('.sg-btn')!.classList.add('press');
    await sleep(250);
    this.el.querySelector('.sg-btn')!.classList.remove('press');
    const count = document.createElement('div');
    count.className = 'sg-count';
    count.textContent = `約 ${(Math.floor(Math.random() * 900) + 100).toLocaleString()},000 件`;
    this.results.append(count);
    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'sg-item';
      item.dataset.id = r.id;
      item.innerHTML = `<div class="sg-url"></div><a class="sg-title"></a><div class="sg-snippet"></div>`;
      item.querySelector('.sg-url')!.textContent = r.url;
      item.querySelector('.sg-title')!.textContent = r.title;
      item.querySelector('.sg-snippet')!.textContent = r.snippet;
      this.results.append(item);
      await sleep(70);
    }
    // いちばん下の、ページ送り（飾り）
    const pager = document.createElement('div');
    pager.className = 'sg-pager';
    pager.innerHTML = `<span class="on">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span class="next">次へ ›</span>`;
    this.results.append(pager);
  }

  /** いま出ている結果を、ぜんぶ見たことにする（題名が紫になる） */
  markAllVisited() {
    for (const item of this.results.querySelectorAll('.sg-item')) item.classList.add('visited');
  }

  /** その結果を光らせて、プレイヤーがクリックするのを待つ */
  waitClick(id: string): Promise<void> {
    const item = this.results.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
    item.classList.add('glow');
    const title = item.querySelector<HTMLElement>('.sg-title')!;
    const stop = yourTurn(title);
    return new Promise((done) =>
      title.addEventListener(
        'click',
        () => {
          item.classList.remove('glow');
          stop();
          done();
        },
        { once: true },
      ),
    );
  }
}

// ---- 解説サイト ----

interface Article {
  id: string;
  title: string;
  /** 段落は、空行（

）で分ける */
  body: string;
  code: string;
  /** はじめに読む記事（目立たせる） */
  basic?: boolean;
}

/** 解説サイトの記事。サイトなので、はじめから全部書いてある */
export const ARTICLES: Article[] = [
  {
    id: 'basics',
    basic: true,
    title: 'はじめに：CSS の書き方の基本',
    body: [
      'ホームページの「中身」（文や絵）は HTML で、「見た目」（色・大きさ・位置など）は CSS で決めます。CSS は、ページのソースの中の `<style>` と `</style>` のあいだに書きます。',
      'CSS は、まず「どの物の見た目か」を書きます（`.box` のように）。そのあとの `{` と `}` のあいだに、見た目の決まりを1行ずつ書いていきます。',
      '1行の決まりは、かならず `名前: 値;` の形です。名前（たとえば `color`）のあとに `:`（コロン）、そのあとに値（たとえば `red`）、最後に `;`（セミコロン）をつけます。`:` は「名前と値の区切り」、`;` は「1行の終わり」のしるしです。',
      '`:` や `;` を忘れたり、名前のつづりをまちがえたりすると、ブラウザがうまく読めず、その決まりは効きません。エラーも出ないので、「書いたのに変わらない」ときは、まず `:` と `;` を確かめましょう。',
      '`/*` と `*/` のあいだは、メモ（コメント）です。ページの見た目には、何の影響もありません。',
    ].join('\n\n'),
    code: '/* .box の見た目を決める */\n.box {\n  color: red;    /* 文字の色を、赤に */\n  opacity: 0.5;  /* 半分だけ透ける */\n}',
  },
  {
    id: 'opacity',
    title: '透け具合を変える（opacity）',
    body: '`opacity` は、どれくらい透けて見えるかを決めます。0 で見えなくなり、1 でまったく透けなくなります。0.5 なら半分だけ透けます。',
    code: '.box {\n  opacity: 1;\n}',
  },
  {
    id: 'color',
    title: '色を変える（color）',
    body: '`color` は文字の色です。`#f28cb4` のように、# のあとに6けたの数字と英字で書くと、細かく色を選べます。',
    code: '.box {\n  color: #f28cb4;\n}',
  },
  {
    id: 'position',
    title: '位置をずらす（position と left）',
    body: '`position: relative;` のついた物は、`left` で左右にずらせます。`left: 24px;` なら、もとの場所から右へ 24 ピクセル。0 にすると、もとの場所に戻ります。',
    code: '.roof {\n  position: relative;\n  left: 0;\n}',
  },
  {
    id: 'animation',
    title: 'アニメーションを止める（animation-play-state）',
    body: '`animation` で動いている物は、`animation-play-state` で止めたり動かしたりできます。`paused` で止まり、`running` でまた動きます。',
    code: '.box {\n  animation-play-state: paused;\n}',
  },
  {
    id: 'border',
    title: '線を引く・消す（border）',
    body: [
      '`border` は、まわりの線です。`border: 2px solid #333;` で線を引き、`border: none;` で消せます。',
      '片側だけに線を引くこともできます。右は `border-right`、左は `border-left`、上は `border-top`、下は `border-bottom` です。書き方は「太さ 線の形 色」の順で、`solid` はふつうの線です。',
    ].join('\n\n'),
    code: '/* まわりの線を消す */\n.box {\n  border: none;\n}\n\n/* 右の端にだけ、線を引く */\n.box {\n  border-right: 4px solid #5f9a5c;\n}',
  },
  {
    id: 'display',
    title: '見せる・隠す（display）',
    body: '`display: none;` にすると、その物はページから見えなくなります。`display: block;` で、また見えるようになります。',
    code: '.box {\n  display: block;\n}',
  },
  {
    id: 'zindex',
    title: '重なりの順番（z-index）',
    body: '物が重なっているとき、`z-index` の数が大きいほうが手前に出ます。うしろに隠れた物は、数を大きくすると前に出てきます。',
    code: '.box {\n  position: relative;\n  z-index: 10;\n}',
  },
  {
    id: 'transform',
    title: '回す・動かす（transform）',
    body: '`transform: rotate(90deg);` で、90度回せます。マイナスをつけた `rotate(-11deg)` なら、反対向きに少しだけ傾きます。`translate()` を使うと、決まった量だけ動かせます。回したり傾けたりしたのを元に戻すときは、`transform: none;` と書きます（`rotate(0deg)` でも、まっすぐに戻ります）。',
    code: '/* 回す */\n.box {\n  transform: rotate(90deg);\n}\n\n/* 元に戻す（回転をなくす） */\n.box {\n  transform: none;\n}',
  },
  {
    id: 'contenteditable',
    title: '字を打ち換えられるようにする（contenteditable）',
    body: [
      'HTML のタグには、「属性」を書き足せます。`<div class="box">` の `class="box"` も、属性のひとつです。',
      'タグに `contenteditable` と書き足すと、そのタグの中の字を、ページの上で直接打ち換えられるようになります。書き足したら、ページのその場所をクリックして、字を打ちましょう。',
    ].join('\n\n'),
    code: '<div class="box" contenteditable="true">\n  ここの字を、ページの上で打ち換えられる\n</div>',
  },
  {
    id: 'comment',
    title: 'コメントを書く（<!-- -->）',
    body: '`<!--` と `-->` のあいだに書いたものは、ページには表示されません。作った人のメモや、一時的に隠したいものに使います。',
    code: '<!-- ここはページに出ません -->',
  },
];

export class GuideView {
  constructor(private el: HTMLElement) {
    el.innerHTML = `
      <div class="gd">
        <header class="gd-head">
          <div class="gd-logo">やさしい<span>HTML・CSS</span>入門</div>
          <nav><span>はじめに</span><span class="on">CSS</span><span>HTML</span><span>よくある質問</span></nav>
        </header>
        <div class="gd-body">
          <main class="gd-main"></main>
          <aside class="gd-side">
            <div class="ad ad-domain">
              <div class="ad-tag">PR</div>
              <div class="ad-title">どめいん屋さん</div>
              <div class="ad-text">あなたのドメイン、<br>期限は大丈夫ですか？</div>
              <div class="ad-btn">更新はこちら</div>
            </div>
            <div class="ad ad-server">
              <div class="ad-tag">PR</div>
              <div class="ad-title">さくさくサーバー</div>
              <div class="ad-text">月額 100円〜<br>はじめてのホームページに</div>
            </div>
            <div class="ad ad-pillow">
              <div class="ad-tag">PR</div>
              <div class="ad-title">ふかふか肩もみ枕</div>
              <div class="ad-text">パソコン疲れの肩に。<br>いまなら送料無料</div>
            </div>
          </aside>
        </div>
        <footer class="gd-foot">© やさしいHTML・CSS入門</footer>
      </div>`;
    const main = el.querySelector('.gd-main')!;
    for (const a of ARTICLES) {
      const sec = document.createElement('section');
      sec.className = a.basic ? 'gd-art basic' : 'gd-art';
      sec.id = `art-${a.id}`;
      const h = document.createElement('h2');
      h.textContent = a.title;
      sec.append(h);
      for (const t of a.body.split('\n\n')) {
        const p = document.createElement('p');
        p.innerHTML = marks(t);
        sec.append(p);
      }
      const pre = document.createElement('pre');
      pre.textContent = a.code;
      sec.append(pre);
      main.append(sec);
    }
  }

  /**
   * 記事の段落を、黄色い枠で囲む（主人公が、そこを読んでいるとき）。paras は 1 から数える段落の番号。
   * 囲んだ所が、会話の窓に隠れないよう、上のほうに来るまで送る。id が null なら、枠を外す
   */
  mark(id: string | null, paras: number[] = [1]) {
    this.el.querySelectorAll('.gd-mark').forEach((x) => x.classList.remove('gd-mark'));
    if (!id) return;
    const ps = [...this.el.querySelectorAll<HTMLElement>(`#art-${id} p`)].filter((_, i) => paras.includes(i + 1));
    ps.forEach((p) => p.classList.add('gd-mark'));
    if (!ps.length) return;
    const top = ps[0].getBoundingClientRect().top - this.el.getBoundingClientRect().top;
    this.el.scrollTo({ top: this.el.scrollTop + top - 90, behavior: 'smooth' });
  }

  /** その記事まで送る */
  show(id: string, smooth = false) {
    const target = this.el.querySelector<HTMLElement>(`#art-${id}`);
    if (!target) return;
    this.el.scrollTo({ top: target.offsetTop - 20, behavior: smooth ? 'smooth' : 'instant' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1800);
  }
}

function marks(text: string) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/`([^`]+)`/g, '<code>$1</code>');
}
