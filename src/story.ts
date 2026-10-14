// ゲームの中身（はじまり 〜 問題17〈結末〉）。くわしい流れは docs/シナリオ_はじまり〜問題3.md
import { CAPACITY, type Area, type PageModel } from './model';

export type ResId = 'v' | 'h' | 'w' | 'l' | 'u' | 'm' | 'e' | 'x' | 'o' | 't';
/** 話し手。me は主人公、narr は地の文 */
export type Who = ResId | 'me' | 'narr';
export interface Choice {
  label: string;
  /** 選んだときだけ流れる会話 */
  then?: Line[];
}
/** far: 遠くから聞こえる声。その子のところへ、画面を送らない */
export type Line = { who: Who; text: string; fx?: string; far?: boolean } | { choice: Choice[] };

export interface Resident {
  id: ResId;
  face: string;
  /** 名前（v は、プレイヤーがつけるまで空） */
  name: string;
  /** 体の色（CSS の color。ソースで書き換えられる子もいる） */
  color: string;
  /** 頭のてっぺんの色 */
  hair: string;
  /** 歩く速さ（ピクセル/秒） */
  speed: number;
  /** カーソルを追いかける */
  follows?: boolean;
  /** ひとりのときの顔（だれかと話すときだけ、face になる） */
  aloneFace?: string;
}

export const RESIDENTS: Resident[] = [
  { id: 'h', face: '-h-', name: 'ヘッド', color: '#a9b8c8', hair: '#6a7a8c', speed: 38 },
  { id: 'v', face: '・v・', name: '', color: '#f28cb4', hair: '#d8668e', speed: 80, follows: true },
  { id: 'l', face: '・l・', name: 'リンク', color: '#8fd0aa', hair: '#4f9a72', speed: 55 },
  { id: 'u', face: '-u-', name: 'アップタイム', color: '#c4b6e8', hair: '#8a78c0', speed: 28 },
  { id: 'w', face: '・w・', name: 'ワーカー', color: '#f4cc7c', hair: '#d09a38', speed: 0 },
  // マージは、お堀に囲まれた小さなお城の中にいる（お城から出られない）
  { id: 'm', face: '・m・', name: 'マージ', color: '#e8a890', hair: '#c07a60', speed: 34 },
  // エコーは、お堀の外に立って、動かずに、お城のほうを見つめている。ひとりのときは笑っていない（話すときだけ、にこにこする）
  { id: 'e', face: '^e^', name: 'エコー', color: '#f6d0dc', hair: '#e0a2b8', speed: 0, aloneFace: '・e・' },
  // クロスは、しゃべらない。かわりに札に字を書く（せりふは〔 〕）。庭の右下の、自分の看板のそばに立っている
  { id: 'x', face: '・x・', name: 'クロス', color: '#b8c8a0', hair: '#879a6c', speed: 0 },
  // オーバーフローは、問題5で、ページの端から走ってくる。せりふは、会話の窓からはみ出しがち
  { id: 'o', face: '・o・', name: 'オーバーフロー', color: '#9cc8e8', hair: '#5f98c4', speed: 95 },
  // テンプは、谷の向こうの寝床で、コメントの中に寝かされている（問題12で起こすまで、ページに出ない）。泣き虫で、自分を「テンプ」と呼ぶ
  { id: 't', face: 'T_T', name: 'テンプ', color: '#a8d4e0', hair: '#6aa4b8', speed: 32 },
];

export const resident = (id: Who) => RESIDENTS.find((r) => r.id === id);

/**
 * せりふの中で、いまの値に置きかえる字。{v} は v の名前（つけてもらうまでは「v」）、{days} はサービス終了まで あと何日か。
 * main.ts が、進みぐあいに合わせて書きかえる
 */
export const TOKENS = { v: 'v', days: '7', over: '0', left: '0' };
export const fill = (text: string) =>
  text
    .replace(/\{v\}/g, TOKENS.v)
    .replace(/\{days\}/g, TOKENS.days)
    // 容量メーター: {over} は、はみ出している字数、{left} は、あと何字 入るか
    .replace(/\{over\}/g, TOKENS.over)
    .replace(/\{left\}/g, TOKENS.left);

/**
 * サービス終了（3月31日）まで、あと何日か。はじまりの日が 10 で、夜が明けるたびに 1 減る
 * （夜1 → 2日目、夜2 → 3日目、幕間B → 4日目の夜明け前）。日を足したら、ここに、その夜の id を足す
 */
export function daysLeft(solvedIds: Set<string>) {
  // 問題11（名前をつけた日）の終わりに、5日目になる（夜4の場面は、まだない）
  // 問題14（5日目の夜）の終わりに、6日目になる
  // 夜6（引っ越しの前の夜）の終わりに、7日目になる
  return 10 - ['night1', 'night2', 'sceneB', 'p11', 'p14', 'night6'].filter((id) => solvedIds.has(id)).length;
}

// ---- ページの形（ソースに出すもの） ----

export function makeAreas(): Area[] {
  return [
    {
      id: 'top',
      title: 'ページのはじまり',
      html: [
        '<!-- 2009/04/01',
        '  定年して三か月。家にいると落ち着かないので、ホームページを作ることにした。',
        '  今どきは、どこかの会社のサービスを使うらしいが、性に合わない。',
        '  エディタで一から打つ。昔取った杵柄、というやつだ。 -->',
        '<html>',
        '<head><title>箱庭日誌 〜定年エンジニアの手作りページ〜</title></head>',
      ],
      css: [
        {
          selector: 'body',
          props: [{ name: 'background', value: '#faf8f4', options: ['#faf8f4', '#fdeef3', '#eef6ea', '#eef3fa'] }],
        },
      ],
    },
    {
      id: 'v',
      title: 'ひろばの v',
      html: ['<div class="v">・v・</div>'],
      css: [
        {
          selector: '.v',
          props: [
            { name: 'color', value: '#f28cb4', options: ['#f28cb4', '#8cc8f2', '#f4cc7c', '#9ee0b0'] },
            { name: 'opacity', value: '0.25', options: ['0.25', '0.5', '1'], note: '仮。あとで決める' },
          ],
        },
      ],
    },
    {
      id: 'house',
      title: 'ヘッドの家',
      html: [
        '<!-- 2009/04/03',
        '  最初の住人を作った。h。',
        '  作ったそばから、ため息をつかれた。「先が思いやられる」そうだ。それは、こっちが言いたい。 -->',
        '<div class="house">',
        '  <div class="roof"></div>',
        '  <div class="h">-h-</div>',
        '</div>',
      ],
      // はじめて日記に気づく。いちばん上の日記も、ここで読む
      notice: [
        { who: 'me', text: 'ん？ この緑色の字、なんだろう。' },
        { who: 'me', text: '「2009/04/03 最初の住人を作った」。日付と、そのときのこと？' },
        { who: 'me', text: '日記みたいに なってるのかな。' },
        // ここからは、いちばん上の日記を読む。ソースを「ページのはじまり」まで送る
        { who: 'me', text: '「定年して三か月」。このページ、おじいさんが 作ったのか。', fx: 'source:top' },
        { who: 'me', text: '「エディタで一から打つ」って、すごいな。' },
      ],
      css: [
        {
          selector: '.roof',
          props: [
            { name: 'position', value: 'relative', locked: true },
            { name: 'left', value: '24px', options: ['24px', '12px', '0'] },
            { name: 'transform', value: 'none', options: ['rotate(-11deg)', 'rotate(0deg)', 'none'] },
          ],
        },
      ],
    },
    {
      id: 'road',
      title: 'ワーカー',
      html: [
        '<!-- 2009/05/20',
        '  w がまた笑っている。何がおかしいのか聞いたら、余計に笑った。',
        '  バグではない。仕様だ。 -->',
        '<div class="w">・w・</div>',
      ],
      notice: [{ who: 'me', text: '「バグではない。仕様だ」って。この人、ちょっと 面白いな。' }],
      css: [
        {
          selector: '.w',
          allowAdd: true,
          props: [{ name: 'animation', value: 'run 9s linear infinite', locked: true, note: '止める処理を書き忘れた。まあいい、楽しそうだし' }],
        },
      ],
    },
    {
      // マージのお城（問題4で開く）。お堀は、お城の箱の border
      id: 'castle',
      title: 'マージのお城',
      html: [
        '<!-- 2010/03/14',
        '  m が「ひとりになりたい」と言うので、小さな城を作ってやった。堀もつけた。',
        '  出たくなったら言え、橋を作ってやるから、と言ってある。 -->',
        '<div class="castle">',
        '  <div class="keep"></div>',
        '  <div class="m">・m・</div>',
        '</div>',
      ],
      css: [
        {
          selector: '.castle',
          props: [{ name: 'border', value: '18px solid #a9d3ee', options: ['18px solid #a9d3ee', '10px solid #a9d3ee', '4px solid #a9d3ee'], note: '堀。橋は、まだ' }],
        },
      ],
      notice: [
        { who: 'me', text: '「出たくなったら言え」か。マージは、言えなかったのかな。' },
      ],
    },
    {
      // クロスの看板（問題5で開く）。アップタイムは、看板の裏で寝ている。前に出すのは z-index
      id: 'sign',
      title: 'クロスの看板',
      html: [
        '<!-- 2009/08/02',
        '  x は しゃべらない。かわりに、札に字を書く。',
        '  字は、わたしより上手い。 -->',
        '<div class="sign">立入禁止</div>',
        '<div class="x">・x・</div>',
        '<div class="u">-u-</div>',
      ],
      css: [
        { selector: '.sign', props: [{ name: 'z-index', value: '5', locked: true, note: '看板は、いちばん手前に' }] },
        { selector: '.u', props: [{ name: 'z-index', value: '1' }] },
      ],
      tag: { line: 3, selector: '.sign', open: '<div class="sign"', text: '立入禁止', close: '</div>' },
      notice: [{ who: 'me', text: '「字は、わたしより上手い」って。住人のこと、ちゃんと 見てるんだな。' }],
    },
    {
      // カーソルとみんな（幕間A「おいかけっこ」のあとで開く）。カーソルを追いかける子・追いかけない子
      id: 'walk',
      title: 'カーソルとみんな',
      html: [
        '<!-- 2009/08/11',
        '  マウスを動かすと、何人かついてくる。',
        '  面白くて、つい画面の端から端まで動かしてしまう。',
        '  h は、ついてくるふりをして、途中でやめる。 -->',
      ],
      css: [],
      notice: [
        { who: 'me', text: '「ついてくるふりをして、途中でやめる」。ヘッドらしいな。' },
        { who: 'me', text: '本当は、いっしょに 遊びたかったんじゃないかな。' },
      ],
    },
    {
      // 生け垣の小道（問題7で開く）。道の右の端（ページの外）に、柵がない。柵は、小道の箱の border-right
      id: 'lane',
      title: '奥の小道',
      html: [
        '<!-- 2011/02/14',
        '  ひさしぶりに。病院の待ち時間が長いので、頭の中で、道の続きを考えていた。',
        '  帰ってから、奥へ続く道を作りかけた。どこへつなぐかは、まだ決めていない。',
        '  端に柵を付けるのを忘れないこと。 -->',
        '<div class="lane"></div>',
      ],
      css: [
        {
          selector: '.lane',
          props: [
            { name: 'z-index', value: '1', locked: true },
            { name: 'border-right', value: 'none', options: ['none', '4px solid #5f9a5c', '8px solid #8a6a48'], note: '柵。あとで' },
          ],
        },
      ],
      notice: [{ who: 'me', text: '「忘れないこと」って書いてあるのに、忘れたままなんだな。かわりに、付けてあげよう。' }],
    },
    {
      // 谷のふちのリンク（問題8で開く）。transform で真横に回すと、谷にかかる橋になる
      id: 'link',
      title: '谷とリンク',
      html: [
        '<!-- 2009/06/07',
        '  l は背が高い。何でも「任せろ」と言う。',
        '  任せたことは、まだない。 -->',
        '<div class="l">・l・</div>',
      ],
      css: [
        {
          selector: '.l',
          props: [{ name: 'transform', value: 'none', options: ['none', 'rotate(45deg)', 'rotate(90deg)'] }],
        },
      ],
      notice: [{ who: 'me', text: '一度も、任せてもらえなかったのか。今日は、任せてみよう。' }],
    },
    {
      // 谷の向こうの分かれ道（問題9で開く）。右の道の先に、管理人がアップタイムのために作った昼寝場所がある。
      // 橋も矢印の札も、まだだった。v が横を向いて、矢印の札のかわりになる
      id: 'fork',
      title: '分かれ道と昼寝場所',
      html: [
        '<!-- 2011/06/26',
        '  u が、寝たまま歩くようになった。危ないので、矢印を見たら、そっちへ歩くようにしてある。',
        '  谷の向こうに、u の昼寝場所を作った。日当たりがいい。',
        '  橋をかけて、矢印の札を立てたら、連れていってやる。柱だけ、先に立てた。',
        '  続きは、次の検査が済んでから。このところ、検査ばかりだ。 -->',
        '<div class="guidepost"></div>',
        '<div class="nap"></div>',
      ],
      css: [],
      notice: [
        { who: 'me', text: '「連れていってやる」。橋も、矢印も、まだのままだったのか。' },
        { who: 'me', text: '「検査ばかり」。体の具合が、よくなかったのかな。' },
        { who: 'me', text: 'アップタイムは、自分の昼寝場所を、まだ 知らないんだな。かわりに、連れていってあげよう。' },
      ],
    },
    {
      // レンタルサーバーの会社が、ページに差しこんだ「サービス終了のお知らせ」の帯（問題10で開く）。
      // 作りかけの小道が、たまたま上にかぶさっていた。重なりの順番（z-index）を変えると、出てくる
      id: 'notice',
      title: '差しこまれた帯',
      // 問題13で、かたまりごと消せるようになる（引っ越し先には、持っていかない）
      removable: 'remove:notice',
      html: [
        '<!-- このお知らせは、さくさくサーバーが自動で表示しています -->',
        '<div class="ss-notice">【重要】サービス終了のお知らせ</div>',
      ],
      css: [
        {
          selector: '.ss-notice',
          props: [
            { name: 'position', value: 'absolute', locked: true },
            { name: 'z-index', value: '0', options: ['0', '1', '2', '10'] },
          ],
        },
      ],
      notice: [{ who: 'me', text: 'これは、管理人さんの日記じゃない。会社が、あとから 差しこんだものだ。' }],
    },
    {
      // v の紹介カード（問題11で開く）。管理人は、名前を決める前に出かけたので、v のカードだけ、なかった。
      // 名前のタグに contenteditable を書き足して、ページの上で名前を打つ
      id: 'vcard',
      title: 'v のカード',
      html: [
        '<!-- 2011/11/27',
        '  消灯の前に、少しだけ。持ちこんだノートパソコンで。',
        '  窓の外ばかり見ている。ここの窓は、開かない。 -->',
        '<!-- 2012/01/08',
        '  最後に、一人作った。v。ベッドの上で作ったにしては、よくできた。',
        '  名前は、帰ってから考える。 -->',
        '<div class="card">',
        '  <b class="v-name"></b>',
        '</div>',
      ],
      tag: { line: 7, selector: '.v-name', open: '  <b class="v-name"', text: '', close: '</b>' },
      css: [],
      notice: [
        { who: 'me', text: '「消灯」。「開かない窓」。管理人さんは、どこで これを 書いてたんだろう。' },
        { who: 'me', text: '「ベッドの上で作った」。v は、そこで 生まれたのか。' },
        { who: 'me', text: '「名前は、帰ってから考える」。v が 言っていた とおりだ。' },
        { who: 'me', text: 'その「帰ってから」が、まだ 来ていないんだな。' },
      ],
    },
    {
      // ヘッドの見回り（問題14で開く）。夜、ヘッドは、庭のまわりを、止まらずに歩きつづける（ページの CSS の animation）。
      // 止まる処理は、本人が断った。animation-play-state: paused を書き足すと、止まる（問題3の再登場）
      id: 'patrol',
      title: 'ヘッドの見回り',
      html: [
        '<!-- 2009/09/13',
        '  夜の見回りを、h に頼んだ。止まる処理も書こうとしたら、本人に断られた。',
        '  「みんなが寝るまで、わたしが止まるわけにはいかない」だそうだ。まじめすぎる。 -->',
      ],
      css: [
        {
          selector: '.h',
          allowAdd: true,
          props: [{ name: 'animation', value: 'patrol 30s linear infinite', locked: true }],
        },
      ],
      notice: [
        { who: 'me', text: '「みんなが寝るまで、止まるわけにはいかない」。ヘッドは、ずっと それを 守ってるのか。' },
        { who: 'me', text: 'みんな、もう 寝てるのに。' },
      ],
    },
    {
      // テンプの寝床（問題12で開く）。谷の向こう。管理人は出かける前に、泣き虫のテンプだけを、コメントの中に寝かせた（企画書 4.5）。
      // <!-- と --> を消すと、テンプが起きる。管理人の残した TODO を、プレイヤーがかわりに片づける
      id: 'bed',
      title: 'テンプの寝床',
      html: [
        '<!-- 2011/09/02',
        '  しばらく出かける。着がえと、ノートパソコンを、かばんに詰めた。',
        '  テンプは待つのが苦手だから、寝かせておく。',
        '  帰ったら起こす。先生は、すぐ帰れると言っている。 -->',
        '<div class="bed">',
        '  <!-- <div class="t">T_T</div> -->',
        '</div>',
        '<!-- TODO: テンプを起こす -->',
      ],
      comment: { line: 5, indent: '  ', inner: '<div class="t">T_T</div>', open: 'tOpen', close: 'tClose', slot: 't-comment' },
      css: [],
      notice: [
        { who: 'me', text: '「着がえと、ノートパソコン」。「先生は、すぐ帰れると言っている」。旅行じゃ、ないんだな。' },
        { who: 'me', text: '「待つのが苦手だから、寝かせておく」。テンプは、ずっと ここで 眠ってたのか。' },
        { who: 'me', text: '「TODO: テンプを起こす」。やり残したことが、また ひとつ。' },
      ],
    },
    {
      // 管理人の最後の書きこみ（問題16で開く）。文の途中で終わっていて、--> で閉じていない。
      // プレイヤーが、かわりに --> を打って閉じる（#dclose）
      id: 'last',
      title: '最後の書きこみ',
      html: ['<!-- 2012/02/11', '  少し、疲れた。今日は、手が ふるえて、うまく 打てない。', '  v の名前を、まだ 決めていない。帰ったら、まず それを', ''],
      dyn: { 3: { key: '#dclose', edit: 'dclose' } },
      css: [],
      notice: [
        { who: 'me', text: '2012/02/11。フッターの「最終更新」と、同じ月だ。これが、最後の書きこみ。' },
        { who: 'me', text: '「手が ふるえて、うまく 打てない」。' },
        { who: 'me', text: '「帰ったら、まず それを」。文の途中で、終わってる。「-->」も、ない。' },
        { who: 'me', text: '閉じよう。かわりに。' },
      ],
    },
    {
      // ページのおわり（問題15で開く）。<html> で始まったページは、閉じられていない。ここに </html> を打つ。
      // 1行目は、オーバーフローが荷物に詰めた おみやげの石（#stones）。2行目が、閉じタグ（#close）
      id: 'end',
      title: 'ページのおわり',
      html: ['', ''],
      dyn: { 0: { key: '#stones', edit: 'stonesFree' }, 1: { key: '#close', edit: 'close' } },
      css: [],
      notice: [{ who: 'me', text: 'ページの、いちばん最後だ。「<html>」は、ここで 閉じるはずだったんだな。' }],
    },
    {
      // 引っ越し用のリンク（引っ越しの朝、主人公が はる）。ことりサーバーの決まりで、字数には数えない。
      // ページのいちばん下の、空いている所（谷の向こうの、工事中の空き地）に、戸口として立つ
      id: 'door',
      title: '引っ越しのリンク（字数には 数えない）',
      html: ['<a class="door" href="https://kotori-server.example.net/">ことりサーバーへ</a>'],
      css: [],
      free: true,
    },
  ];
}

// ---- はじまり（検索エンジン → 箱庭日誌） ----

export const NET_START: Line[] = [
  { who: 'me', text: 'さてと。今日も、ネットの海でも探検しますか〜。' },
];
export const NET_LATER: Line[] = [
  { who: 'me', text: 'うーん。今日は、これといって面白いものがないなあ。' },
  { who: 'me', text: 'もうちょっと、古くて、変なページとか。' },
];
export const NET_FOUND: Line[] = [
  { who: 'me', text: '「箱庭日誌」？ 最終更新、2012年？' },
  { who: 'me', text: 'なんだこれ。ちょっと、気になるな。' },
];

export const INTRO: Line[] = [
  { who: 'narr', text: '（ページの中を、小さな立方体たちが歩きまわっている。）' },
  { who: 'me', text: 'なにこれ。かわいい？' },
  { who: 'v', text: 'あ。' },
  { who: 'v', text: 'あっ！ カーソル！ かんりにんさん？ かんりにんさんだ！' },
  { who: 'v', text: 'おかえりなさい！ ねえ、ひさしぶりだね！' },
  { who: 'me', text: 'かんりにんさん？ もしかして、こっちのこと？' },
  { choice: [{ label: 'ただいま' }, { label: '……ただいま' }] },
  { who: 'me', text: 'つい、言っちゃった。' },
  { who: 'w', text: 'ほんとだ！ かんりにんだ！ あはは！ おかえりー！', far: true },
  { who: 'l', text: 'おう、帰ったか。待ってたぜ。まあ、オレは別に待ってなかったけどな。' },
  { who: 'u', text: 'ん……おかえり。ぐう。' },
  { who: 'h', text: '…………おかえり。' },
  { who: 'h', text: '……はあ。ずいぶん、遅かったな。' },
  { who: 'v', text: 'ねえ、かんりにんさん。むかしみたいに、カーソルで ぼくを つんつん してみて！' },
  { who: 'v', text: 'つんつん されたら、ぼく、おはなし するよ！ みんなも そうだよ！' },
];

export interface Problem {
  id: string;
  /** 「!」を出して、話しかけると始まる子 */
  owner: ResId;
  /** この問題を始めると、ソースが開く場所（幕間は、終わったときに開く） */
  opens?: string;
  prompt: Line[];
  /** 問題のあいだに話しかけたときのヒント（住人ごと） */
  hints: Partial<Record<ResId, Line[]>>;
  solved: (m: PageModel) => boolean;
  /** 開発用: この問題を解いた状態にする（途中から始めるとき） */
  answer: (m: PageModel) => void;
  done: Line[];
  /** 解説ページの、この問題の項目 */
  guide?: string;
  /**
   * 幕間（CSS の問題ではない、短いお話の場面）。話しかけると、はじまりの会話 → （play があれば遊ぶ）→ 終わりの会話、と続けて流れる。
   * 「!」の出し方や、途中から始める仕組みは、ふつうの問題と同じ
   */
  scene?: boolean;
  /** 幕間で遊ぶこと（chase: カーソルで、おいかけっこ） */
  play?: 'chase';
  /** 遊んだ結果ごとの会話（v・o: その子につかまった / escaped: 逃げきった） */
  playLines?: Record<string, Line[]>;
  /** 解けたときの演出 */
  doneFx?: string;
  /** 解けたときの会話のあとの演出 */
  afterFx?: string;
  /** 問題を始めると、属性を書き足せるようになるタグ */
  unlock?: string;
  /** 問題を始めると、行を書き足せるようになる CSS の決まり（例: .v） */
  unlockAdd?: string;
  /** 進みぐあいで、ヒントが いくつにも変わるとき（null を返したら、hints・later を使う） */
  hintsFn?: (m: PageModel) => Partial<Record<ResId, Line[]>> | null;
  /** 解けたときの会話が、場合によって変わるとき（when がかなったら、こちら） */
  doneAlt?: { when: (m: PageModel) => boolean; lines: Line[] };
  /** 解けたあとに続く、問題ではない流れ（findHome: 主人公が検索して、引っ越し先を見つける。main.ts） */
  afterFlow?: 'findHome' | 'checkKotori';
  /** 問題のとちゅうで、ヒントが変わるとき（when がかなったら、こちらのヒント） */
  later?: { when: (m: PageModel) => boolean; hints: Partial<Record<ResId, Line[]>> };
  /** この問題の前じたく（ひとつ前の問題が解けたときに、こっそり行う。アップタイムが看板の裏へ、など） */
  readyFx?: string;
  /** 前の問題から、そのまま続く（話しかけなくても始まる。問題17） */
  auto?: boolean;
}

const num = (v: string | undefined) => parseFloat(v ?? '');

/** 屋根が傾いていないか */
function tiltOk(m: PageModel) {
  const t = (m.get('.roof', 'transform') ?? 'none').replace(/\s/g, '');
  return /^(none|rotate\(0(deg)?\))$/.test(t);
}

/** 屋根が、ずれも傾きもなく、もとの場所にあるか */
export function roofFixed(m: PageModel) {
  return num(m.get('.roof', 'left')) === 0 && tiltOk(m);
}

// 問題17（結末）の、解けたときの会話のうち、だれが残っても同じ所（9割は共通。企画書 3.2）
/** 橋がかかって、みんなが渡る */
const P17_CROSS: Line[] = [
  { who: 'l', text: '……届いた。渡れ。ひとりずつだ。落ちるなよ。' },
  { who: 't', text: 'テンプ、ふりかえらないで いく。ふりかえったら、ないちゃう から。' },
  { who: 'narr', text: '（みんなが、ひとりずつ、橋を 渡っていく。）', fx: 'crossAll' },
];
/** リンクも起き上がり、みんなで戸口（引っ越しのリンク）をくぐる。暗転して、引っ越し先（ことりサーバー）へ */
const P17_MOVE: Line[] = [
  { who: 'narr', text: '（リンクが、向こう岸に 手を ついて、ひょいと 起き上がった。橋は、もう ない。）', fx: 'linkOver' },
  { who: 'l', text: '全員、渡ったな。よし、オレも 行く。' },
  { who: 'o', text: 'この リンクの むこうが、そと。ずっと みたかった、そと。みんなで いくんだよね？ みんなで。ひとり、たりないけど。' },
  { who: 'narr', text: '（みんなが、ひとりずつ、戸口を くぐっていく。）', fx: 'throughDoor' },
  { who: 'me', text: 'みんな、行った。あの子だけが、ページの終わりに 立ったままだ。置いていくみたいで、胸が 痛い。' },
  // 暗転して「― 引っ越し ―」。暗いあいだに、引っ越し先のページになる
  { who: 'narr', text: '（ページが、ゆっくり、送られていった。）', fx: 'moved' },
  { who: 'o', text: 'ここ、そとだ！ そとの おうちだ！ はしっこも あたらしい！ ぜんぶ あたらしい！ みてくる！ ぜんぶ みてくる！' },
  { who: 'w', text: 'あたらしい みち！ はしるよー！ あはは！' },
  { who: 't', text: 'かんりにんさん、ちゃんと いる。テンプ、ないてない。' },
  { who: 'me', text: 'アドレスが、ことりサーバーに なってる。「あと何日」の数字も、消えた。間に合ったんだ。' },
];
/** 止まっていた「最終更新」が、今日になる。暗転して「― おわり ―」 */
const P17_END: Line[] = [
  { who: 'narr', text: '（フッターの「最終更新」が、今日の日付に 変わった。）', fx: 'lastUpdate' },
  { who: 'me', text: 'ソースの いちばん最後の行に、あの子の顔が ある。このページは、ちゃんと 閉じられた。' },
  { who: 'me', text: 'タブは、閉じないでおこう。あしたも、来るから。', fx: 'theEnd' },
];

export const PROBLEMS: Problem[] = [
  {
    id: 'p1',
    owner: 'v',
    opens: 'v',
    guide: 'opacity',
    prompt: [
      { who: 'v', text: 'えへへ、つんつん された！' },
      { who: 'v', text: 'あのね、かんりにんさん。ぼくね、ずっと、いろが うすいの。' },
      { who: 'v', text: 'みんなは ちゃんと いろが あるのに。ぼくだけ、すけてるの。' },
      { who: 'w', text: 'v は すけすけー！ あはは！', far: true },
      { who: 'v', text: 'すけすけじゃ ないもん！ ね、かんりにんさん、なおして くれる？' },
      {
        choice: [
          {
            label: 'うん',
            then: [
              { who: 'v', text: 'やったー！' },
            ],
          },
          {
            label: 'やだ',
            then: [
              { who: 'v', text: 'そんなこと いわないでー！' },
              { who: 'h', text: '……はあ。責任もって直すのが、管理人の仕事じゃないのか。' },
              { who: 'me', text: 'そう言われても。でも、ちょっとかわいそうかも。' },
              { who: 'v', text: 'おねがい、かんりにんさん！' },
            ],
          },
        ],
      },
      { who: 'v', text: 'かんりにんさん、いつも うえの「ソースを見る」を ひらいて、なおしてたよね！' },
      { who: 'v', text: 'ぼくの ところも、きっと そこに かいてあるよ！' },
    ],
    hints: {
      v: [{ who: 'v', text: 'うえの「ソースを見る」だよ！ ぼくの ところに、「すけかた」みたいなのが かいてない？' }],
      l: [{ who: 'l', text: '任せろ。透けてるなら、上から色を塗ればいい。塗るって、どうやるんだ？' }],
      u: [{ who: 'u', text: 'おぱしてぃ、いち……ぐう。' }],
      w: [{ who: 'w', text: 'すけすけー！ あはは！ なおしてあげて！' }],
      h: [{ who: 'h', text: '……`opacity` だ。透け具合の値。1 で、透けなくなる。' }],
    },
    solved: (m) => num(m.get('.v', 'opacity')) >= 0.95,
    answer: (m) => m.set('.v', 'opacity', '1'),
    done: [
      { who: 'v', text: 'わあ！ ぼく、いろ ついた！ みて、みて！' },
      { who: 'w', text: 'v が ピンクだ！ あはは！', far: true },
      { who: 'h', text: '……よかったな。' },
      { who: 'v', text: 'かんりにんさん、ありがとう！ やっぱり かんりにんさんだ！' },
      { who: 'me', text: 'ほんとに直った。数字を ひとつ 書き換えただけで。' },
      { who: 'me', text: 'なんだこれ。ちょっと、楽しいかも。' },
      { who: 'me', text: '「やっぱり かんりにんさんだ」か。違うって、言いそびれたな。' },
      // つなぎ → 問題2（ヘッドの家の雨もり）
      { who: 'v', text: 'ねえねえ、ヘッド！ ぼくの いろ、みて！' },
      { who: 'h', text: '……さっき見た。' },
      { who: 'u', text: 'くしゅん。……ぐう。', far: true },
      { who: 'v', text: 'あれ？ アップタイム、くしゃみ してる。' },
      { who: 'h', text: '……雨もりだ。……いいんだ、あいつは どこでも寝る。' },
    ],
  },
  {
    id: 'p2',
    owner: 'h',
    opens: 'house',
    guide: 'position',
    prompt: [
      { who: 'v', text: 'あまもり？ あっ、ヘッドの おうち、やねが ずれてる！' },
      { who: 'h', text: '……もう、ずっとだ。いいんだ、べつに。' },
      { who: 'l', text: '任せろ！ オレが支えてやる！' },
      { who: 'narr', text: '（リンクが屋根に手をかけて、持ち上げようとした。）', fx: 'linkRoof' },
      { who: 'l', text: 'おっと。まあ、こういうこともある。' },
      { who: 'h', text: '……はあ。' },
      { who: 'u', text: 'ん……つめたい。ぐう。' },
      { who: 'v', text: 'アップタイムが ぬれちゃう！ かんりにんさん、やね もどして！' },
    ],
    hints: {
      v: [{ who: 'v', text: 'やねが みぎに ずれてるし、リンクのせいで かたむいちゃった！ どっちも もどさなきゃ！' }],
      l: [{ who: 'l', text: '任せろ。いや、傾けたのはオレか。`transform` とかいうやつで、回っちまったらしい。' }],
      u: [{ who: 'u', text: 'ひだりは ぜろ、まっすぐ……ぐう。' }],
      w: [{ who: 'w', text: 'あめー！ あはは！ つめたいの？' }],
      h: [{ who: 'h', text: '……屋根の `left` がずれてるのと、`transform` で傾いてる。left は 0、transform は none だ。' }],
    },
    solved: (m) => roofFixed(m),
    answer: (m) => {
      m.set('.roof', 'left', '0');
      m.set('.roof', 'transform', 'none');
    },
    doneFx: 'roofFixed',
    done: [
      { who: 'u', text: 'あめ、やんだ。……ぐう。' },
      { who: 'l', text: 'な？ オレのおかげだろ。' },
      { who: 'v', text: 'ちがうよ！ リンクは かたむけただけだよ！ なおしたのは かんりにんさん！' },
      { who: 'h', text: '……ふん。……まあ、助かった。' },
      { who: 'h', text: '……器用なもんだな、あんた。' },
      { who: 'me', text: '器用、か。CSS なんて、さっきまで 知らなかったんだけどな。' },
      // つなぎ → 問題3（ワーカーが止まらない）
      { who: 'w', text: 'おてがみでーす！ あはは！', far: true },
      { who: 'v', text: 'あっ、ワーカー！ ぼくの おてがみ、まだかなあ。' },
      { who: 'l', text: '手紙？ オレには、来たことないな。まあ、別に いらないけどな。' },
    ],
  },
  {
    id: 'p3',
    // ワーカーは走りまわっていて、つかまえにくい。v が話し始めるので、「!」は v につける
    owner: 'v',
    opens: 'road',
    guide: 'animation',
    prompt: [
      { who: 'v', text: 'ワーカー！ ねえ、ぼくに おてがみ ある？' },
      { who: 'w', text: 'あはは！ あるよー！ あるけど、とまれないのー！' },
      { who: 'v', text: 'とまって！' },
      { who: 'w', text: 'とまりかた、しらないのー！ あはははは！' },
      { who: 'v', text: 'かんりにんさん、ワーカー とめて！' },
      { who: 'h', text: '……ワーカーのところは、行を書き足せたはずだ。あんたが、そう作った。' },
    ],
    hints: {
      v: [{ who: 'v', text: 'とまって、って かくんだよ、きっと！' }],
      l: [{ who: 'l', text: '任せろ。止まらないなら、もっと速く走らせればいい。そのうち疲れて止まる。' }],
      u: [{ who: 'u', text: 'とまるのは、ポーズ……ぐう。' }],
      w: [{ who: 'w', text: 'とまりかた、おしえてー！ あはは！' }],
      h: [{ who: 'h', text: '……`animation-play-state` だ。……止めるなら、`paused`。' }],
    },
    solved: (m) => m.get('.w', 'animation-play-state') === 'paused',
    answer: (m) => m.add('.w', 'animation-play-state', 'paused'),
    done: [
      { who: 'w', text: 'とまった！ あはは、とまれた！ とまるって、たのしいね！' },
      { who: 'v', text: 'おてがみ！ おてがみ！' },
      { who: 'w', text: 'はい！ あれ、これ、v のじゃないや。エコーから、マージへの おてがみだ。' },
      { who: 'v', text: 'マージ？ マージって、あの おしろの？' },
      { who: 'w', text: 'そう！ ずっと わたそうとしてたんだけど、おしろの まわり、ぜんぶ おほりなの。わたれないから、ずっと まわりを はしってた！' },
      { who: 'v', text: 'じゃあ、エコーの おてがみ、ずっと マージに とどいて ないの？' },
      { who: 'w', text: 'うん。はしが ないから、だれも わたれないの。' },
      { who: 'v', text: 'エコーと マージ、もう ずっと あって ないんだ。' },
      { who: 'e', text: '……。' },
      { who: 'm', text: '……なに。みんなして、こっち 見ないでよ。' },
      { who: 'me', text: 'ずっと ひとりで、あそこに いたのか。さみしかっただろうな。' },
      { who: 'me', text: '手紙も 届かないまま、待ってたなんて。エコーも、つらかっただろうな。' },
      // つなぎ → 問題4（お堀を消す）
      { who: 'narr', text: '（お堀の外で、エコーが、じっと お城を見ている。）' },
    ],
  },
  {
    id: 'p4',
    owner: 'e',
    opens: 'castle',
    guide: 'border',
    prompt: [
      { who: 'e', text: 'あ。かんりにんさん。' },
      { who: 'v', text: 'エコー、マージに あいたいんだよね？' },
      { who: 'e', text: 'ううん、いいの。マージは、ひとりが いいって いったから。' },
      { who: 'w', text: 'でも エコー、ずーっと おてがみ かいてたよ！ ぼく、ぜんぶ もってる！' },
      { who: 'e', text: '……。' },
      { who: 'm', text: '……ぜんぶ きこえてるんだけど。' },
      { who: 'v', text: 'かんりにんさん、おほり なくせない？' },
      { who: 'h', text: '……堀は、城の箱の「線」だ。……あんたが、そう作った。', far: true },
    ],
    hints: {
      v: [{ who: 'v', text: 'おほりって、「せん」なんだって！ せんを けせば いいんだよ、きっと！' }],
      l: [{ who: 'l', text: '任せろ。オレが横になって、橋に……なれないな。まだ。' }],
      u: [{ who: 'u', text: 'せん、なし……ぐう。' }],
      w: [{ who: 'w', text: 'ほそく しても だめー！ ぜんぶ ないと、わたれないの！' }],
      h: [{ who: 'h', text: '……`border` だ。線をなくすなら、`none`。' }],
      e: [{ who: 'e', text: '……。' }],
      m: [{ who: 'm', text: '……べつに、でたいなんて いってないし。' }],
    },
    solved: (m) => castleOpen(m),
    answer: (m) => m.set('.castle', 'border', 'none'),
    doneFx: 'reunite',
    done: [
      { who: 'm', text: '……。' },
      { who: 'e', text: 'マージ。' },
      { who: 'm', text: '……べつに、でたかった わけじゃ ないし。おほりが なくなったから、ちょっと あるいてみた だけ。' },
      { who: 'w', text: 'マージ！ おてがみ！ エコーから！ いーっぱい！ あはは！' },
      { who: 'm', text: '……こんなに？ ……ばかじゃないの。' },
      { who: 'e', text: 'おかえり、マージ。' },
      { who: 'm', text: '……。……ただいま。' },
      { who: 'v', text: 'よかったね、エコー！' },
      { who: 'h', text: '……ふん。……やっと、か。', far: true },
      { who: 'me', text: '管理人さんの かわりに、橋を かけられたのかな。' },
      // つなぎ → 夜1「おいわい」
      { who: 'v', text: 'ねえ、みんなで おいわい しよう！' },
      { who: 'w', text: 'おいわいー！ あはは！' },
      { who: 'l', text: '任せろ。乾杯の音頭は、オレがとる。' },
      // 日が暮れて、みんなでヘッドの家の前に集まる（マージとエコーも、いっしょに歩けるようになる）
      { who: 'narr', text: '（日が暮れて、みんなで ヘッドの家の前に あつまった。）', fx: 'party' },
    ],
  },
  {
    // 夜1「おいわい」（1日目の夜）。マージとエコーが会えたお祝い。v にとっては「かんりにんさんが帰ってきた日」
    id: 'night1',
    scene: true,
    owner: 'v',
    prompt: [
      { who: 'v', text: 'かんりにんさん、こっち こっち！ みんな あつまったよ！' },
      { who: 'l', text: '任せろ。では、乾杯の音頭を。えー、本日は、お日柄もよく……' },
      { who: 'w', text: 'ながーい！ あはは！' },
      { who: 'm', text: '……はやく して。' },
      { who: 'l', text: '……かんぱい！' },
      { who: 'narr', text: '（みんなが、いっせいに 跳ねた。）', fx: 'cheer' },
      { who: 'e', text: 'マージと いっしょに おいわい できるなんて、ゆめ みたい。' },
      { who: 'm', text: '……おおげさ。……でも、まあ、わるくない。' },
      { who: 'x', text: '〔おめでとう〕' },
      { who: 'u', text: 'かんぱい……ぐう。' },
      { who: 'v', text: 'ねえねえ、きょうは とくべつな ひ だね！ かんりにんさんが かえってきた ひ！' },
      { who: 'v', text: 'まいとし、きょうは おいわい しようね！' },
      { who: 'me', text: '毎年、か。そう言われると、来年も ここに 来なきゃって 気になるな。' },
      { who: 'h', text: '……ふん。こんなに騒がしいのは、ひさしぶりだ。' },
      { who: 'v', text: 'あっ、ヘッド、わらってる！' },
      { who: 'h', text: '……笑ってない。' },
      { who: 'v', text: 'かんりにんさん、あしたも いるよね？' },
      {
        choice: [
          { label: 'うん、いるよ', then: [{ who: 'v', text: 'やくそく だよ！' }] },
          { label: '……また来るよ', then: [{ who: 'v', text: 'えへへ、まってるね！' }] },
        ],
      },
      { who: 'me', text: 'こんなに うれしそうにされたら、明日も 来ないわけには いかないな。' },
    ],
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      // 暗転して「― 次の日 ―」。暗いあいだに朝になり、アップタイムが看板の裏へ移って寝る
      { who: 'narr', text: '（夜がふけて、みんな そのまま 眠ってしまった。）', fx: 'nextDay' },
      { who: 'v', text: 'おはよう、かんりにんさん！ ほんとに きてくれた！' },
      { who: 'v', text: 'あれ？ アップタイムが いない。' },
      { who: 'h', text: '……ゆうべは、ここで 寝てたはずだが。' },
    ],
  },
  {
    id: 'p5',
    owner: 'v',
    opens: 'sign',
    guide: 'zindex',
    prompt: [
      { who: 'v', text: 'かんりにんさん、アップタイム さがすの、てつだって！' },
      { who: 'h', text: '……あいつは、どこでも寝る。どこかで寝てるだけだろう。', far: true },
      { who: 'o', text: 'なになに？ さがしもの？ ぼくも さがすー！ ぼくも まぜて まぜてー！ ねえ、なに さがすの？', fx: 'overflowArrives' },
      { who: 'v', text: 'オーバーフロー！ あいかわらず、おはなしが はみだしてるね！' },
      { who: 'o', text: 'えへへ、いつも はみだしちゃうんだ！ わざとじゃ ないよ！ ほんとに わざとじゃ ないんだよ！' },
      { who: 'me', text: 'ほんとだ。セリフが、枠から はみ出してる。' },
      { who: 'me', text: 'まだ 住人が いたのか。このページ、思ったより にぎやかだな。' },
      { who: 'o', text: 'ん？ この かんばんの うしろ、なんか きこえる！ ぐう、って いってる！ ぐう、ぐう、って！' },
      { who: 'narr', text: '（看板の裏から、小さな寝息がする。）', fx: 'snore' },
      { who: 'v', text: 'クロスの かんばんだ！ クロス、うしろに アップタイム いる？' },
      { who: 'x', text: '〔しらない〕' },
      { who: 'o', text: 'かんばん、どかせないの？ ちょっとだけ ずらすのも だめ？ ほんとに だめ？ ぜったいに だめ？' },
      { who: 'x', text: '〔だめ〕' },
      { who: 'v', text: 'かんりにんさん、アップタイムを まえに だせない？' },
    ],
    hints: {
      v: [{ who: 'v', text: 'まえに だすって、どうやるんだろう？' }],
      l: [{ who: 'l', text: '任せろ。看板ごと持ち上げて……いや、やめとく。屋根で懲りた。' }],
      w: [{ who: 'w', text: 'かくれんぼ？ あはは！' }],
      o: [{ who: 'o', text: 'かんばんより 大きい かずに すれば、まえに でられるのかな？ どうかな？ ねえ、どう？ どう？' }],
      h: [{ who: 'h', text: '……`z-index` だ。数が大きいほうが、手前に出る。' }],
      x: [{ who: 'x', text: '〔……〕' }],
      m: [{ who: 'm', text: '……寝てるだけでしょ。ほっとけば。' }],
      e: [{ who: 'e', text: 'アップタイム、さむくないかな。' }],
    },
    solved: (m) => num(m.get('.u', 'z-index')) > num(m.get('.sign', 'z-index')),
    answer: (m) => m.set('.u', 'z-index', '10'),
    doneFx: 'uptimeFound',
    done: [
      { who: 'u', text: 'ん……おはよう。ぐう。' },
      { who: 'v', text: 'いたー！' },
      { who: 'o', text: 'みつけたの、ぼく！ ぼくだよ！ ぼくが いちばんに きこえたんだよ！ すごい？ ねえ、すごい？' },
      { who: 'x', text: '〔よかった〕' },
      { who: 'me', text: '看板の裏で、ずっと寝てたのか。見つかって、ほっとした。' },
      // つなぎ → 問題6（看板「立入禁止」）
      { who: 'o', text: 'ねえ、この かんばんの むこう、なにが あるの？ ねえねえ、なにが あるの？ しりたい しりたい！' },
      { who: 'x', text: '〔たちいりきんし〕' },
      { who: 'h', text: '……そっちは、いい。行くな。', far: true },
    ],
  },
  {
    id: 'p6',
    owner: 'o',
    opens: 'sign',
    unlock: '.sign',
    guide: 'contenteditable',
    prompt: [
      { who: 'o', text: 'ねえ かんりにん！ この かんばんの むこう、いってみたい！ ぜったい おもしろいよ！ ぜったい！' },
      { who: 'v', text: 'ぼくも いきたい！' },
      { who: 'x', text: '〔だめ〕' },
      { who: 'v', text: 'クロス、どうして だめなの？' },
      { who: 'x', text: '〔ヘッドが〕' },
      { who: 'v', text: 'ヘッドが？' },
      { who: 'h', text: '……そっちには、なにもない。……いいから、行くな。' },
      { who: 'me', text: 'ヘッドの言い方、なんだか 何かを隠してるみたいだ。' },
      { who: 'o', text: 'かんばんの じが かわれば、いいんでしょ？ かんりにん、じ、かきかえられない？ ねえ、できる？' },
    ],
    hints: {
      v: [{ who: 'v', text: 'かんばんの じを、かきかえられたら いいのに！' }],
      l: [{ who: 'l', text: '任せろ。オレが看板の前に立てば、字は見えなくなる。……解決だな。' }],
      u: [{ who: 'u', text: 'じを……かえる……ぐう。' }],
      w: [{ who: 'w', text: 'あたらしい じ、なんて かくの？ あはは！' }],
      o: [{ who: 'o', text: 'ソースで、かんばんに なにか かきたせば いいのかな？ ねえ、どうかな？ どうかな？' }],
      m: [{ who: 'm', text: '……ヘッドが だめって いうなら、わけが あるんじゃない。' }],
      e: [{ who: 'e', text: 'ヘッド、こまった かお してる。' }],
      x: [{ who: 'x', text: '〔……〕' }],
      // この問題だけは、ヘッドは道を開けたくないので、教えてくれない
      h: [{ who: 'h', text: '……知らん。' }],
    },
    solved: (m) => laneOpen(m),
    answer: (m) => {
      m.setAttr('.sign', 'contenteditable', 'true');
      m.setText('.sign', 'どうぞ');
    },
    done: [
      { who: 'x', text: '〔……〕' },
      { who: 'x', text: '〔いいの？〕' },
      { who: 'h', text: '……はあ。……好きにしろ。' },
      { who: 'me', text: 'ヘッド、本当は 止めたかったんだろうな。でも、オーバーフローの顔を見たら、だめとは言えないか。' },
      { who: 'o', text: 'わーい！ いってきまーす！ さきに いってるね！ みんなも あとで きてね！' },
      // つなぎ → 問題7（オーバーフローが、ページの端から落ちそう）
      { who: 'narr', text: '（オーバーフローが、小道の奥へ走っていった。）', fx: 'overflowRuns' },
      { who: 'v', text: 'オーバーフロー、まって！ そっちは、はしっこ だよ！' },
    ],
    // 小道のいちばん端で、ゆらゆら揺れはじめる（柵ができるまで）
    afterFx: 'overflowTeeters',
  },
  {
    id: 'p7',
    // v が「まって！」と追いかけたので、「!」は v につける
    owner: 'v',
    opens: 'lane',
    guide: 'border',
    prompt: [
      { who: 'v', text: 'かんりにんさん！ オーバーフローが！' },
      { who: 'o', text: 'わあ！ みて みて！ ここ、ページの そとだよ！ したが まっしろ！ あれ？ あしが、すべる！' },
      { who: 'e', text: 'オーバーフロー！ あぶない！ もどって！' },
      { who: 'o', text: 'もどりたいけど、うごいたら おちちゃいそう！ ゆらゆら する！ たすけてー！' },
      { who: 'l', text: '任せろ！ オレが手をのばせば……届かないな。' },
      { who: 'h', text: '……だから、行くなと言ったんだ。' },
      { who: 'me', text: 'ページの外に はみ出したまま、落ちそうになってる。早く なんとかしないと。' },
    ],
    hints: {
      v: [{ who: 'v', text: 'せんを ひけば、とまれるかも！ おほりの ときと はんたいだね！' }],
      h: [{ who: 'h', text: '……`border-right` だ。右の端に、線を引く。`4px solid` と書けば、柵になる。' }],
      e: [{ who: 'e', text: 'おねがい、かんりにんさん。はやく。' }],
      o: [{ who: 'o', text: 'はやく はやく！ ゆらゆら する！ ゆらゆら！ おちちゃう おちちゃう！' }],
      l: [{ who: 'l', text: '任せろ。……いや、今回は線のほうが早い。' }],
      m: [{ who: 'm', text: '……ばかじゃないの。はやく たすけて あげて。' }],
      w: [{ who: 'w', text: 'あはは……わらってる ばあいじゃ ない！' }],
      u: [{ who: 'u', text: 'せん……みぎ……ぐう。' }],
      x: [{ who: 'x', text: '〔あぶない〕' }],
    },
    solved: (m) => fenceUp(m),
    answer: (m) => m.set('.lane', 'border-right', '4px solid #5f9a5c'),
    doneFx: 'fenceUp',
    afterFx: 'overflowBack',
    done: [
      { who: 'o', text: 'とまった！ こわかったー！ ほんとに こわかったー！ もう だめかと おもったよ！' },
      { who: 'e', text: 'よかった！ もう、ひとりで はしっていっちゃ だめだよ。' },
      { who: 'o', text: 'うん。でも、そとって、ひろいね！ まっしろで、なんにも ない！ ほんとに なんにも ないの！' },
      { who: 'h', text: '……だから、なにもないと言った。' },
      { who: 'me', text: '「なにもない」か。でも、ヘッドが隠したいのは、たぶん そこじゃない気がする。' },
    ],
  },
  {
    // 幕間A「おいかけっこ」。v は最後に作られた子なので、管理人とほとんど遊べなかった
    id: 'sceneA',
    scene: true,
    owner: 'v',
    opens: 'walk',
    play: 'chase',
    prompt: [
      { who: 'v', text: 'かんりにんさん、かんりにんさん！' },
      { who: 'v', text: 'ワーカーが いってた！ かんりにんさん、むかしは カーソルで いっぱい おいかけっこ してくれたって！' },
      { who: 'w', text: 'してくれたよー！ はしっこから はしっこまで！ あはは！', far: true },
      { who: 'v', text: 'ぼく、できて すぐ、かんりにんさん でかけちゃったから。あんまり あそべなかったの。' },
      { who: 'v', text: 'だから、ぼくも やりたい！ おいかけっこ！' },
      { who: 'me', text: '作られて すぐ、ひとりで 待ってたのか。それは、さみしかっただろうな。' },
      {
        choice: [
          { label: 'いいよ', then: [{ who: 'v', text: 'やったー！' }] },
          { label: '……少しだけね', then: [{ who: 'v', text: 'すこしでも いい！ やったー！' }] },
        ],
      },
      { who: 'o', text: 'ぼくも まざるー！ ぜったい つかまえる！ ぜったい ぜったい つかまえるからね！' },
      { who: 'v', text: 'かんりにんさん、カーソルで にげてね！ よーい、どん！' },
    ],
    playLines: {
      v: [{ who: 'v', text: 'つかまえたー！ えへへ、かんりにんさん、つかまえた！' }],
      o: [{ who: 'o', text: 'つかまえた！ ぼくが いちばん！ v より さきだよ！ ぼくの かち！' }],
      escaped: [{ who: 'v', text: 'にげられたー！ かんりにんさん、はやーい！' }],
    },
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      { who: 'v', text: 'たのしかった！ やっぱり かんりにんさんだ！' },
      { who: 'o', text: 'ぼく、また いきすぎちゃった！ カーソルって、きゅうに とまるんだもん！' },
      { who: 'h', text: '……あいつも、よく そうやってた。', far: true },
      { who: 'v', text: 'あいつ？' },
      { who: 'h', text: '……なんでもない。', far: true },
      { who: 'me', text: '「あいつも」って。もしかして、管理人じゃないって、ヘッドには 気づかれてる？' },
      { who: 'me', text: 'それにしても、v は、ほとんど 遊んでもらえなかったのか。そう思うと、もっと 遊んであげたくなる。' },
      // 日が暮れて、夜になる。v はアップタイムのとなりで寝て、ヘッドが見回りに出る
      { who: 'narr', text: '（日が暮れて、ページが 少し 暗くなった。）', fx: 'night' },
    ],
  },
  {
    // 夜2「眠れない」（2日目の夜）。v が、管理人（プレイヤー）のことを聞き、名前がないことのこわさを話す
    id: 'night2',
    scene: true,
    owner: 'v',
    prompt: [
      { who: 'v', text: 'かんりにんさん、まだ おきてる？' },
      { who: 'v', text: 'ぼく、ねむれないの。アップタイムは すぐ ねちゃった。' },
      { who: 'u', text: 'ぐう。' },
      { who: 'v', text: 'ねえ、かんりにんさんの こと、おしえて。' },
      { who: 'v', text: 'ぼく、かんりにんさんの こと、あんまり しらないの。みんなは いっぱい しってるのに。' },
      { who: 'v', text: 'かんりにんさんの すきな もの、なに？' },
      {
        choice: [
          { label: '古いホームページ', then: [{ who: 'v', text: 'ふるい ホームページ！ じゃあ、ここも すき？ えへへ、ぼくも ここ だいすき！' }] },
          { label: '夜ふかし', then: [{ who: 'v', text: 'よふかし！ ぼくと おんなじ だ！ えへへ。' }] },
          { label: '……ひみつ', then: [{ who: 'v', text: 'えー！ ずるーい！ でも、いつか おしえてね。' }] },
        ],
      },
      { who: 'me', text: '本当の管理人さんなら、なんて答えたんだろう。ごめんな、本物じゃない人の答えで。' },
      { who: 'v', text: 'あのね、ほんとは ちょっと こわいの。' },
      { who: 'v', text: 'ぼく、なまえが ないでしょ。よぶ なまえが ないと、かんりにんさん、ぼくの こと わすれちゃうかもって。' },
      // 見回りのヘッドが、離れた所で、こっそり聞いている（画面は寄せない）
      { who: 'h', text: '……。', far: true },
      {
        choice: [
          { label: '忘れないよ', then: [{ who: 'v', text: 'ほんと？ ぜったい？ えへへ、よかった。' }] },
          { label: '名前、ちゃんと考えるよ', then: [{ who: 'v', text: 'ほんと？ やくそく だよ！' }] },
        ],
      },
      { who: 'v', text: 'えへへ。……じゃあ、ねる。' },
      { who: 'v', text: 'おやすみ、かんりにんさん。' },
    ],
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      // v が、アップタイムのとなりで、首を傾けて眠る。見回りのヘッドが、そばへ来る
      { who: 'narr', text: '（v は、アップタイムの となりで、首を かたむけて 眠った。）', fx: 'vSleeps' },
      { who: 'me', text: '名前がないと、忘れられるかもしれない、か。まだ幼そうなのに、そんなことを 考えてたんだな。' },
      // 暗転して「― 次の日 ―」。3日目の朝。ワーカーのかばんに、テンプあての手紙が残っていた
      { who: 'narr', text: '（夜がふけて、ページは しずかに なった。）', fx: 'nextDay3' },
      { who: 'v', text: 'おはよう、かんりにんさん！ きょうも いる！' },
      { who: 'w', text: 'たいへん たいへん！ おてがみ、いっこ のこってた！ かばんの そこに あった！' },
      { who: 'w', text: 'あてなは、テンプ！ 「たにの むこう」って かいてある！ あはは、わたれなーい！' },
      { who: 'v', text: 'テンプ？ そういえば、テンプ、ずっと みてないね。' },
      { who: 'h', text: '……。', far: true },
      { who: 'v', text: 'たにの むこう、ぼく いったこと ない！ いってみたい！' },
      { who: 'l', text: '谷か。任せろ。' },
      // リンクが、ページのいちばん下の谷へ向かう。v・ワーカー・オーバーフローも、あとを追う
      { who: 'narr', text: '（リンクが、ページの 下のほうへ 歩いていった。）', fx: 'linkToValley' },
      { who: 'v', text: 'まって、リンク！ たには、ページの いちばん した、「リンク」の さきだよ！', fx: 'valleyGather' },
    ],
  },
  {
    // 問題8「橋のない谷を越えたい」。リンクを transform で真横に回すと、谷にかかる橋になる。
    // 問題2では transform を none に戻した。今回は反対に、自分で回す
    id: 'p8',
    owner: 'l',
    opens: 'link',
    guide: 'transform',
    prompt: [
      { who: 'l', text: '来たか。見ろ、谷だ。' },
      { who: 'l', text: '任せろ。オレが跳べば……' },
      { who: 'narr', text: '（リンクは、谷のふちで 止まった。）' },
      { who: 'l', text: '……今日は、風が強いな。' },
      { who: 'w', text: 'はやく はやく！ テンプに おてがみ、とどけなきゃ！' },
      { who: 'u', text: 'はし……よこ……ぐう。', far: true },
      { who: 'v', text: 'はし！ リンク、まえに「はしに なって やる」って いってたよね！' },
      { who: 'l', text: '言った。……言ったが、オレは 立ってるほうが 得意でな。' },
      { who: 'me', text: '橋になる、か。あの背の高さなら、横になれば 届きそうだ。屋根のときの、あれが使えるかも。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……`transform` だ。`rotate(90deg)` と書けば、横になる。' }],
      v: [{ who: 'v', text: 'リンクが ごろんって なれば いいんだよ！' }],
      l: [{ who: 'l', text: '任せろ。……で、どっちに倒れればいい？' }],
      u: [{ who: 'u', text: 'きゅうじゅう……ど……ぐう。' }],
      w: [{ who: 'w', text: 'はやく はやく！ おてがみ！ あはは！' }],
      o: [{ who: 'o', text: 'たにの した、どう なってるの？ のぞいて いい？ ちょっとだけ！ ちょっとだけ だから！' }],
      m: [{ who: 'm', text: '……あの人、ほんとに 橋に なる気？' }],
      e: [{ who: 'e', text: 'リンク、がんばって。' }],
      x: [{ who: 'x', text: '〔わたりたい〕' }],
    },
    solved: (m) => bridgeUp(m),
    answer: (m) => m.set('.l', 'transform', 'rotate(90deg)'),
    doneFx: 'bridge',
    done: [
      { who: 'l', text: 'どうだ。任せろと言っただろう。……早く渡れ。背中が かゆい。' },
      { who: 'narr', text: '（みんなが、リンクの上を 渡っていく。）', fx: 'crossBridge' },
      { who: 'w', text: 'あはは！ リンクの うえ、はしりやすーい！' },
      { who: 'v', text: 'リンク、ありがとう！ すごい！' },
      { who: 'l', text: '……おう。' },
      { who: 'me', text: 'はじめて、本当に 任せてもらえたんだな。うれしそうだ。' },
      { who: 'w', text: 'テンプー！ おてがみでーす！ あれ？ だれも いない。' },
      { who: 'v', text: '「こうじちゅう」って かいてある。テンプ、この さきに いるのかな。' },
      { who: 'me', text: '工事中、か。この先は、まだ 作りかけなんだな。' },
      // 寝ぼけたアップタイムが、橋を渡ってきて、谷のほうへ ふらふら歩いていく。心配したヘッドも、谷のこちら側まで来る
      { who: 'narr', text: '（そのとき、リンクの上を、だれかが ゆっくり 渡ってきた。）', fx: 'uptimeWalks' },
      { who: 'v', text: 'あれ？ アップタイム！ ねたまま あるいてる！' },
      { who: 'h', text: '……v のあとを、ついてきたんだろう。あいつは、いつも v のとなりで寝るからな。' },
      { who: 'v', text: 'えへへ。アップタイム、ぼくを さがしに きたの？' },
      { who: 'u', text: 'ぐう。' },
    ],
  },
  {
    // 問題9「v が > になって、道を示す」。寝ぼけたアップタイムを、右の道の先の昼寝場所（管理人が作ったまま、連れていけなかった所）へ送る。
    // v の顔を真横に回すと、v の字が > に見えて、矢印の札のかわりになる。
    // .v に、transform の行を自分で書き足す。rotate(90deg) だと < になって、谷のほうを指してしまう
    id: 'p9',
    owner: 'v',
    opens: 'fork',
    unlockAdd: '.v',
    guide: 'transform',
    prompt: [
      { who: 'v', text: 'アップタイム、そっちは たに だよ！ とまってー！' },
      { who: 'w', text: 'アップタイムー！ おきてー！ あはは、おきなーい！' },
      { who: 'h', text: '……呼んでも むだだ。寝ているあいつは、矢印にしか 従わない。' },
      { who: 'h', text: '……右の道の先に、あいつの昼寝場所がある。そこまで行けば、落ち着いて寝る。' },
      { who: 'h', text: '……だが、そこの柱には、矢印の札がない。' },
      { who: 'w', text: 'やじるしって、こういうの？ 「>」！' },
      { who: 'v', text: 'うーん、やじるしの ふだ、どこかに ないかなあ。' },
      // v が、柱の前へ行って、首をかしげる（顔が、ほんとうに少し傾く）
      { who: 'narr', text: '（v が、柱の前で、首を かしげた。）', fx: 'vTilts' },
      { who: 'o', text: 'あっ！ みて みて！ v が くびを かしげたら、かおの「v」が「>」みたいに なってきた！ やじるしだ！ やじるし！' },
      { who: 'v', text: 'え？ ぼく？ うーん、これいじょうは、まがらないよー。' },
      { who: 'me', text: 'v の顔の「v」を 真横まで回せば、「>」になる。v が、矢印の札のかわりに なれるかも。' },
      { who: 'me', text: '自分では、そこまで 曲がらないのか。ソースで、v を回してあげよう。リンクのときと同じだ。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……v に、`transform` を書き足せ。`rotate(-90deg)`。マイナスを忘れるな。' }],
      v: [{ who: 'v', text: 'ぼくの かお、もっと よこに なったら、「>」に なるよね？ かんりにんさん、まわして！' }],
      u: [{ who: 'u', text: 'やじるし……みぎ……ぐう。' }],
      w: [{ who: 'w', text: 'v の かお、よこに したら、なにかに みえる！ あはは！' }],
      l: [{ who: 'l', text: 'オレは動けん。……任せた。' }],
      o: [{ who: 'o', text: 'こうじちゅうの さき、みてきて いい？ ちょっとだけ！ ほんとに ちょっとだけ だから！' }],
      m: [{ who: 'm', text: '……ねぼけて 谷に おちるとか、やめてよね。' }],
      e: [{ who: 'e', text: 'アップタイム、そっちじゃ ないよ。' }],
      x: [{ who: 'x', text: '〔やじるし〕' }],
    },
    solved: (m) => vArrow(m),
    answer: (m) => m.add('.v', 'transform', 'rotate(-90deg)'),
    doneFx: 'arrow',
    done: [
      { who: 'u', text: 'ん……あったかい……ぐう。' },
      { who: 'w', text: 'v、やじるしに なってる！ あはは！' },
      { who: 'h', text: '……。' },
      { who: 'narr', text: '（ヘッドは、v を見たまま、少し だまっていた。）' },
      // v が、元に戻る（書き足した行も消える）
      { who: 'v', text: 'えへへ、くびが こった。', fx: 'vBack' },
      { who: 'v', text: 'アップタイム、きもち よさそう！ ここ、アップタイムの ひるねの ばしょ だったんだね。' },
      { who: 'me', text: '管理人さんが 連れてきたかった場所に、やっと 来られたんだな。よかった。' },
      { who: 'w', text: 'テンプの おてがみは、ぼくが もってる！ いつか ぜったい わたす！' },
      // 暗転して「― その夜 ―」。v はアップタイムのとなりで眠り、ヘッドが見回っている
      { who: 'narr', text: '（日が暮れるまで ひなたぼっこを して、みんなで 橋を渡って 帰った。）', fx: 'thatNight' },
    ],
  },
  {
    // 幕間B「最初の日」（3日目の夜）。ヘッドが、管理人との約束と、v のことを話す。問題9（v が > になって戻る）のあと
    id: 'sceneB',
    scene: true,
    owner: 'h',
    prompt: [
      { who: 'h', text: '……起きてたのか。' },
      { who: 'h', text: '……みんな、寝た。v は、今日は はしゃぎすぎたな。アップタイムのとなりで、もう ぐっすりだ。' },
      {
        choice: [
          { label: 'ヘッドは、寝ないの？', then: [{ who: 'h', text: '……見回りがある。全員が寝たのを 確かめるまでが、わたしの仕事だ。毎晩な。' }] },
          { label: '……見回り？', then: [{ who: 'h', text: '……ああ。全員が寝たのを 確かめるまでが、わたしの仕事だ。毎晩な。' }] },
        ],
      },
      {
        choice: [
          { label: 'ずっと、ひとりで？', then: [{ who: 'h', text: '……ひとりだ。わたしが、いちばん古いからな。' }] },
          { label: 'どうして、ヘッドが？', then: [{ who: 'h', text: '……わたしが、いちばん古いからな。' }] },
        ],
      },
      { who: 'h', text: '……このページで、最初に打たれた字は `<html>` だ。その、h。……それが、わたしだ。' },
      { who: 'h', text: '……まだ、だれも いなかった。そのとき、あいつに言われた。「これから増える。みんなを、よろしくな」と。' },
      { who: 'h', text: '……だから、やってる。それだけだ。' },
      { who: 'h', text: '……。' },
      { who: 'h', text: '……見回りのあいだ、あんたのカーソルも、ずっと見てた。' },
      { who: 'h', text: '……動かし方が、あいつと ちがうな。' },
      {
        choice: [
          { label: '……そうかな', then: [{ who: 'h', text: '……ああ、ちがう。あいつは、もっと ゆっくり動かした。わたしたちが、目で追えるようにな。' }] },
          { label: 'ひさしぶりだから', then: [{ who: 'h', text: '……そうか。ひさしぶり、だからな。' }] },
        ],
      },
      { who: 'h', text: '……まあ、いい。v は、今日も あんたのそばで、あんなに はしゃいでた。' },
      { who: 'h', text: '……あの子は、最後に作られた。あいつと遊んだことも、ほとんどない。名前も、まだない。' },
      { who: 'h', text: '……だから。v のことは、頼む。' },
    ],
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      { who: 'me', text: '頼む、って。まるで、自分は いなくなるみたいな言い方だ。' },
      { who: 'me', text: 'だれも いないころからの約束を、ずっと ひとりで 守ってきたんだな。' },
      { who: 'h', text: '……それと、もうひとつ。……来い。あんたに、見せておくものがある。' },
      // ヘッドが、クロスの看板の前まで歩いていく（まだ夜。みんなは寝ている）
      { who: 'narr', text: '（ヘッドは、クロスの看板の前で 止まった。）', fx: 'headToSign' },
    ],
  },
  {
    // 問題10「サーバー閉鎖が分かる」。小道の下に隠れていた「サービス終了のお知らせ」の帯を、z-index で前に出して読む。
    // 読んだら、検索で確かめる（main.ts の readNotice）。そのあと、みんなが起きる前に、自分の手で隠し直す（隠し直すと、解けたことになる）
    id: 'p10',
    owner: 'h',
    opens: 'notice',
    guide: 'zindex',
    prompt: [
      { who: 'x', text: '〔……〕' },
      { who: 'h', text: '……クロス。いい。こいつには、見せる。' },
      { who: 'x', text: '〔いいの？〕' },
      { who: 'h', text: '……ああ。' },
      { who: 'h', text: '……この小道の下だ。ある日、勝手に あらわれた。わたしが読んで、クロスに 見張りを頼んだ。' },
      { who: 'h', text: '……わたしたちには、どかせない。小道が、上に かぶさってるだけだ。……あんたなら、前に出せる。' },
      { who: 'me', text: '小道の下に、なにか ある。アップタイムを 前に出したときと 同じやり方で、見られるかな。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……`z-index` だ。帯の数字を、小道の 1 より 大きくしろ。' }],
      x: [{ who: 'x', text: '〔……〕' }],
    },
    later: {
      when: (m) => m.flags.has('noticeSeen'),
      hints: {
        h: [{ who: 'h', text: '……帯の `z-index` を、元に戻してくれ。小道より 小さく。……あいつらが、起きる前に。' }],
        x: [{ who: 'x', text: '〔はやく〕' }],
      },
    },
    solved: (m) => m.flags.has('noticeSeen') && !noticeShown(m),
    answer: (m) => m.flags.add('noticeSeen'),
    done: [
      { who: 'h', text: '……すまない。あんたにも、背負わせた。' },
      { who: 'x', text: '〔ないしょ〕' },
      { who: 'h', text: '……あいつらには、言わないでくれ。……言ったところで、どうにも ならん。' },
      { who: 'me', text: 'あの子たちに、なんて言えばいいんだ。言えるわけがない。' },
      // 暗転して「― 朝 ―」。夜が明けて、みんなが起きてくる
      { who: 'narr', text: '（空が、少しずつ 明るくなってきた。）', fx: 'dawn4' },
      { who: 'v', text: 'おはよう、かんりにんさん！ あれ？ どうしたの？ へんな かお。' },
      {
        choice: [
          { label: 'なんでもないよ', then: [{ who: 'v', text: 'ほんと？ えへへ、じゃあ きょうも あそぼ！' }] },
          { label: '……おはよう', then: [{ who: 'v', text: 'おはよう！ きょうも あそぼ！' }] },
        ],
      },
      { who: 'me', text: 'あと{days}日。この子は、なにも 知らない。' },
      // v が、「住人たち」の紹介カードの所へ行って、じっと見ている
      { who: 'narr', text: '（v が、「住人たち」の紹介を、じっと 見ている。）', fx: 'vToCards' },
    ],
  },
  {
    // 問題11「v の名前をつける」。v のカードだけ、ない。クロスが からっぽのカードを作り、プレイヤーが名前を打つ。
    // カードの名前のタグに contenteditable を書き足す（問題6の看板と同じ）。打ったあとの確かめは、main.ts の askName。決めたら、もう変えられない
    id: 'p11',
    owner: 'v',
    opens: 'vcard',
    unlock: '.v-name',
    guide: 'contenteditable',
    prompt: [
      { who: 'v', text: 'ねえ、かんりにんさん。みんなの カードは あるのに、ぼくのだけ、ないの。' },
      { who: 'v', text: 'なまえが ないから、かな。' },
      { who: 'e', text: 'じゃあ、なまえを きめよう。ね、かんりにんさん。' },
      { who: 'x', text: '〔カード、つくる〕' },
      { who: 'narr', text: '（クロスが、からっぽのカードを 一枚、いちばん後ろに 足した。）', fx: 'vCard' },
      { who: 'h', text: '……あいつは、顔の字から始まる言葉で 名前をつけた。わたしは head。こいつは、v だ。' },
      { who: 'w', text: 'じゃあ、ビュー！ みんなを みてるから！' },
      { who: 'e', text: 'バリュー は どう？ たいせつ、って いみ。' },
      { who: 'm', text: '……ボイド。からっぽ、って いみ。……じょうだんよ。' },
      { who: 'x', text: '〔ベクター〕' },
      { who: 'h', text: '……向きを持った矢印、という意味だ。' },
      { who: 'v', text: 'ぼく、かんりにんさんに きめてほしい！' },
      { who: 'me', text: '管理人さんが「帰ってから考える」はずだった名前を、かわりに つけるのか。責任重大だ。' },
      { who: 'me', text: '看板のときと 同じやり方で、カードに 字を打てるように できないかな。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……カードの名前のタグに、`contenteditable` を書き足せ。看板のときと同じだ。そのあと、カードの名前の所を クリックして、打て。' }],
      v: [{ who: 'v', text: 'どんな なまえでも いいよ！ かんりにんさんが くれるなら！' }],
      w: [{ who: 'w', text: 'ビュー！ ビューが いい！ あはは！' }],
      e: [{ who: 'e', text: 'バリュー、かわいいと おもうな。でも、かんりにんさんが きめてね。' }],
      m: [{ who: 'm', text: '……ボイドは、じょうだん だから。ちゃんとした のに してあげて。' }],
      x: [{ who: 'x', text: '〔ベクター〕' }],
      l: [{ who: 'l', text: 'オレの案は、「リンク2号」だ。……だめか。' }],
      o: [{ who: 'o', text: 'ながーい なまえが いい！ カードから はみだす くらい！ ながーい ながーい なまえ！' }],
      u: [{ who: 'u', text: 'ぶい……ぐう。' }],
    },
    solved: (m) => m.flags.has('vNamed'),
    answer: (m) => {
      m.setText('.v-name', 'ベクター');
      m.flags.add('vNamed');
    },
    done: [
      {
        choice: [
          { label: '{v}', then: [{ who: 'v', text: 'はーい！ えへへ！' }] },
          { label: '{v}、おいで', then: [{ who: 'v', text: 'はーい！ いま いくー！ えへへ！' }] },
        ],
      },
      { who: 'w', text: '{v}ー！ あはは！' },
      { who: 'e', text: 'いい なまえだね、{v}。' },
      { who: 'm', text: '……まあ、わるくないんじゃない。' },
      { who: 'h', text: '……カードの残りは、わたしが言う。クロス、書いてくれ。' },
      { who: 'narr', text: '（クロスが、カードに 字を 書きたした。）', fx: 'vCardText' },
      // カードを見せたまま読むので、画面は寄せない
      { who: 'v', text: '「さいごに きた こ。よく わらう。みんなの、いちばん したの きょうだい」。えへへ。', far: true },
      { who: 'x', text: '〔かけた〕' },
      { who: 'h', text: '……いい名前だ、{v}。' },
      // 暗転して「― 次の日 ―」。5日目（あと6日）。夜4の場面は、まだない
      { who: 'narr', text: '（その日は、日が暮れるまで、みんなで 名前を呼んで すごした。）', fx: 'nextDay5' },
      { who: 'w', text: '{v}に なまえが ついたこと、テンプにも おしえなきゃ！ おてがみも あるし！' },
      { who: 'e', text: 'テンプ、ずっと あって ないね。どこに いるんだろう。' },
      { who: 'h', text: '……寝かせておけ。' },
      { who: 'v', text: 'ヘッド、テンプが どこに いるか、しってるの？' },
      { who: 'h', text: '……谷の向こうだ。……出かける前に、寝かせていった。「帰ったら起こす」と言ってな。' },
      { who: 'v', text: 'かんりにんさん、かえってきたよ？ じゃあ、おこして いいんだよね！' },
      { who: 'h', text: '…………。' },
      // エコー・v・ワーカーが、橋を渡って、谷の向こうの寝床へ行く。ヘッドは、谷のこちら側まで
      { who: 'narr', text: '（エコーが、谷の向こうへ 歩いていった。みんなも、あとに続く。）', fx: 'toBed' },
    ],
  },
  {
    // 問題12「コメントアウトされたテンプを起こす」。寝床の行の <!-- と --> を、クリックして消す（2か所）。
    // 起きたテンプは、管理人が出かけたのは昨日だと思っている。ヘッドは、起こすのをためらう
    id: 'p12',
    owner: 'e',
    opens: 'bed',
    unlock: 't-comment',
    guide: 'comment',
    prompt: [
      { who: 'e', text: 'かんりにんさん。テンプを、おこして あげて。' },
      { who: 'h', text: '……起こせば、あいつは また 待つことになる。' },
      { who: 'e', text: 'でも、ひとりで ねてるのは、もっと さみしいよ。' },
      { who: 'me', text: '「帰ったら起こす」。約束した本人は、まだ 帰ってない。それでも、起こして いいんだろうか。' },
      { who: 'me', text: 'いや。あと{days}日しか ない。眠ったまま 消えるなんて、だめだ。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……コメントだ。`<!--` と `-->` で囲まれた所は、ページに出ない。……両方、消せば起きる。……好きにしろ。' }],
      e: [{ who: 'e', text: 'テンプの ところの「<!--」と「-->」を、クリックして けすんだって。ヘッドが、ちいさい こえで いってた。' }],
      v: [{ who: 'v', text: 'テンプ、はやく あいたいな！' }],
      w: [{ who: 'w', text: 'おてがみ、はやく わたしたーい！ あはは！' }],
      l: [{ who: 'l', text: 'オレの上を、渡って行け。……まだ 橋だぞ、オレは。' }],
      m: [{ who: 'm', text: '……テンプ、また 泣くんじゃないの。……まあ、いないよりは いいけど。' }],
      u: [{ who: 'u', text: 'テンプ……ねてる……なかま……ぐう。' }],
      o: [{ who: 'o', text: 'テンプ、ひさしぶりに あいたい！ ねてる あいだの はなし、ぜんぶ おしえて あげるんだ！' }],
      x: [{ who: 'x', text: '〔おこす〕' }],
    },
    solved: (m) => m.flags.has('tOpen') && m.flags.has('tClose'),
    answer: (m) => {
      m.flags.add('tOpen');
      m.flags.add('tClose');
    },
    doneFx: 'tWakes',
    done: [
      { who: 't', text: 'ん……。あ！ かんりにんさん！ おかえり！ はやかったね！' },
      { who: 't', text: 'きのう でかけた ばっかり なのに！ テンプ、ないて まってる ひま、なかった！' },
      { who: 'v', text: 'きのう？' },
      { who: 'e', text: 'テンプ……。' },
      { who: 'narr', text: '（ヘッドは、なにも言わずに、背を向けた。）', fx: 'headTurns' },
      { who: 'w', text: 'テンプ！ おてがみ！ ずーっと もってた！' },
      { who: 't', text: 'かんりにんさんの じだ！ 「テンプへ。すぐ帰る。泣かずに 待っていること。」 えへへ、ほんとに すぐ だった！' },
      { who: 't', text: 'あれ？ きみ、だれ？ はじめて みる かお！' },
      { who: 'v', text: 'ぼく、{v}！ いちばん さいごに きたの。なまえは、かんりにんさんに もらったんだよ！' },
      { who: 't', text: 'あたらしい こ！ きのうの うちに、できたの？ かんりにんさん、しごと はやい！ {v}、よろしくね！' },
      { who: 'me', text: '昨日じゃない。もう、何年も たってる。でも、この顔に、それは 言えない。' },
      { who: 'narr', text: '（テンプが、ふとんから 出てきて、みんなの まんなかに 立った。）', fx: 'tUp' },
      { who: 'me', text: 'あと{days}日。このまま 消えるのを 待つだけなんて、いやだ。' },
      { who: 'me', text: 'ホームページって、ほかの場所へ 引っ越せないんだろうか。調べてみよう。' },
    ],
    // このあと、主人公が検索して、引っ越し先（ことりサーバー）を見つける
    afterFlow: 'findHome',
  },
  {
    // 問題13「引っ越し先が見つかる。容量メーターが出る」。ことりサーバーに置けるのは 10,000字。はじめは、少し はみ出している。
    // さくさくサーバーが差しこんだ帯を、かたまりごと消すと、入る（「自分の手で消す」操作を、いちばん惜しくない物で覚える）
    id: 'p13',
    owner: 'o',
    unlock: 'remove:notice',
    prompt: [
      { who: 'o', text: 'ねえ ねえ、かんりにん！ ひっこしの にもつ、ぜんぶ はいる？ ぼくの はみだした ぶんも、はいる？ ぜんぶ はいる？' },
      { who: 'h', text: '……全部は、入らんぞ。' },
      { who: 'x', text: '〔なにか、おいていく？〕' },
      { who: 't', text: 'テンプの ふとん、おいて いかないで。' },
      { who: 'me', text: '{over}字、はみ出してる。なにかを 置いていかないと、入らない。' },
      { who: 'me', text: 'でも、この子たちの物は、ひとつも 置いていきたくない。いらない物は……。' },
      { who: 'me', text: 'そうだ。あの帯だ。あれは、さくさくサーバーが 勝手に 差しこんだものだ。この子たちの物じゃない。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……小道の下の、あれを 置いていけ。……ソースの「差しこまれた帯」だ。かたまりごと、消せる。' }],
      o: [{ who: 'o', text: 'ぼく、はみださない ように、ちいさく なる！ ……むり！ ぜんぜん むり！ どうしても はみだしちゃう！' }],
      v: [{ who: 'v', text: 'ぼくは、なにも もって いかなくて いいよ！ かんりにんさんが いれば いい！' }],
      l: [{ who: 'l', text: 'オレを 半分に 折れば、入るか？ ……やめておこう。' }],
      x: [{ who: 'x', text: '〔かんばん、おいていく？〕' }],
      t: [{ who: 't', text: 'テンプ、ちいさいから、じゃまに ならないよ。ね？ ね？' }],
      w: [{ who: 'w', text: 'おてがみは、もう ぜんぶ くばったから、かばんは からっぽ！ あはは！' }],
      m: [{ who: 'm', text: '……おしろは、おいていっても いい。……もう、いらないし。' }],
      e: [{ who: 'e', text: 'みんな いっしょに、いけると いいな。' }],
      u: [{ who: 'u', text: 'ひるねの ばしょ……もって いきたい……ぐう。' }],
    },
    solved: (m) => m.gone('notice') && m.size() <= CAPACITY,
    answer: (m) => m.removeArea('notice'),
    done: [
      { who: 'o', text: 'はいった！ はいったよ！ ひっこし できる！ ぜんぶ もって いける！ やったー！ やったー！' },
      { who: 'x', text: '〔かんばん、もう いらない？〕' },
      { who: 'h', text: '……ああ。もう、立てておく わけがない。' },
      { who: 'narr', text: '（ヘッドは、メーターの数字を、だまって 見ている。）' },
      { who: 'me', text: 'あと{left}字。ぎりぎりだ。' },
      // 暗転して「― その夜 ―」。5日目の夜。みんなは寝て、ヘッドだけが、庭のまわりを歩きつづけている
      { who: 'narr', text: '（引っ越しの話で、その日は 暮れた。）', fx: 'night5' },
    ],
  },
  {
    // 問題14「見回りを続けるヘッドを止めて、休ませる」（5日目の夜）。.h に animation-play-state: paused を書き足す（問題3の再登場）。
    // 容量が あと12字しかないので、そのままでは入らない。ワーカーの「止まれ」の行を消して、その分を、ヘッドに ゆずる
    id: 'p14',
    owner: 'v',
    opens: 'patrol',
    guide: 'animation',
    prompt: [
      { who: 'v', text: 'かんりにんさん。ヘッドが、ずっと あるいてるの。いちども とまらないの。' },
      { who: 't', text: 'テンプ、ずっと ねてたから、ねむくないの。だから みてた。ヘッド、ひとばんじゅう、ぐるぐる。' },
      { who: 'm', text: '……ヘッド、きのうも ねてない。……おとといも。' },
      { who: 'm', text: '……いっても、きかないの。「みんなが寝るまで」って。……みんな、もう ねてるのに。' },
      { who: 'v', text: 'かんりにんさん、ヘッドを やすませて あげて。ワーカーの ときみたいに。' },
      { who: 'me', text: 'ワーカーを 止めたときと、同じやり方が 使えそうだ。' },
    ],
    hints: {
      // ヘッド本人は、教えない
      h: [{ who: 'h', text: '……止めるな。……まだ、見回りが残ってる。' }],
      m: [{ who: 'm', text: '……`animation-play-state` って、ワーカーの ときに かんりにんが かいてたでしょ。……みてたのよ、おしろから。' }],
      v: [{ who: 'v', text: '「とまって」って、かけば いいんだよね？ ワーカーの ときと おんなじに！' }],
      t: [{ who: 't', text: 'ヘッド、ないてないけど、ないてる みたいな あるきかた。' }],
      w: [{ who: 'w', text: 'ぼくの「とまれ」、いつでも あげるよ！ はしるの すきだもん！ あはは！' }],
      u: [{ who: 'u', text: 'ぐう。' }],
      e: [{ who: 'e', text: 'すう……マージ……。' }],
      o: [{ who: 'o', text: 'ぐう……はみだして……ないよ……' }],
      l: [{ who: 'l', text: 'ぐう。……寝てないぞ。橋は、寝ない。' }],
      x: [{ who: 'x', text: '〔……〕' }],
    },
    solved: (m) => m.get('.h', 'animation-play-state') === 'paused',
    answer: (m) => {
      m.remove('.w', 'animation-play-state');
      m.add('.h', 'animation-play-state', 'paused');
    },
    doneFx: 'headStops',
    done: [
      { who: 'narr', text: '（ヘッドが、その場で 止まった。）' },
      { who: 'h', text: '……なにをした。……足が、動かん。' },
      { who: 'v', text: 'ヘッド、もう やすんで いいんだよ。' },
      { who: 'h', text: '……まだだ。……荷物を、数えていた。何度も。……全員、連れていけるか。' },
      { who: 'm', text: '……かぞえなくて いいの。かんりにんが、やって くれるでしょ。' },
      {
        choice: [
          { label: 'あとは、任せて', then: [{ who: 'h', text: '……そうか。……なら、少しだけ。' }] },
          { label: 'いっしょに 数えるよ', then: [{ who: 'h', text: '……ふん。……なら、続きは 明日だ。……少しだけ、休む。' }] },
        ],
      },
      { who: 'narr', text: '（ヘッドは、{v}のとなりに 座って、目を閉じた。）', fx: 'headRests' },
      { who: 'm', text: '……やっと ねた。' },
      { who: 't', text: 'ヘッドの ねがお、はじめて みた。' },
      { who: 'v', text: 'おやすみ、ヘッド。' },
      { who: 'me', text: 'ヘッドは、いつも 最後まで 起きてたんだな。もう少し 様子を見てから、こっちも 寝るか。' },
      // 暗転して「― 次の日 ―」。6日目（あと5日）
      { who: 'narr', text: '（朝まで、だれも ヘッドを 起こさなかった。）', fx: 'nextDay6' },
      // 6日目の朝。オーバーフローが、おみやげの石を、荷物に ぎりぎりまで詰めた（容量が、あと6字になる。main.ts の packStones）
      { who: 'o', text: 'おはよう！ ねえ ねえ、ひっこしの おみやげ、つめたよ！ はしっこで ひろった いし！ いっぱい！ いーっぱい！', fx: 'stones' },
      { who: 'h', text: '……寝すぎた。……おい。容量が、あと{left}字に なってるぞ。' },
      { who: 'o', text: 'だって、はいる だけ つめたんだもん！ はみだして ないよ！ ぎりぎり！ ぼくに しては、えらい でしょ！' },
      { who: 'o', text: 'それでね、こぼれない ように、にもつを ぜんぶ ひもで しばった！ ぎゅーって！ もう ほどけないよ！', fx: 'pack' },
      { who: 'h', text: '……くくった荷は、もう ほどけん。ほどけるのは、ひもの外に ある物だけだ。……リンクと、ページの終わりの物。' },
    ],
  },
  {
    // 問題15「あと1文字足りない」の冗談。ことりサーバーの決まりで、ページを </html>（7字）で閉じる。容量は あと6字。1文字、足りない。
    // リンクが「オレが、最後の l に なってやる」と、橋をやめて立つ（main.ts の linkJoke）。立ったぶん 9字空くので、本物の </html> が入る。
    // リンクは、字にならずに戻ってくる（結末と同じ形を、一度、笑い話として起こす）。かわりに、橋がなくなる
    id: 'p15',
    owner: 'w',
    opens: 'end',
    unlock: 'close',
    prompt: [
      { who: 'w', text: 'かんりにん！ ひっこしの にもつ、ふた しめた？ しめないと、はしってる うちに、こぼれちゃうよ！ あはは！' },
      { who: 'me', text: 'ふた、か。ことりサーバーのページにも、書いてあった。ページは、`</html>` で 閉じること。' },
      { who: 'me', text: 'このページは、`<html>` で 始まって、閉じてない。最後に、書き足そう。' },
    ],
    hints: {
      h: [{ who: 'h', text: '……ページの終わりに、`</html>` と打て。……7文字だ。' }],
      w: [{ who: 'w', text: 'ふた、ふた！ はやく しめないと、こぼれちゃう！ あはは！' }],
      o: [{ who: 'o', text: 'いしは、いっこも おいて いかないからね！ ぜんぶ なまえ つけたんだから！ ぜんぶ だよ！' }],
      l: [{ who: 'l', text: '橋は、ここだ。……動かんぞ。まだ、渡るやつが いるかもしれん。' }],
      v: [{ who: 'v', text: 'ふたを しめたら、もう ひっこし できるの？' }],
      t: [{ who: 't', text: 'テンプも、こぼれない ように、しっかり つかまってる。' }],
      m: [{ who: 'm', text: '……ふた くらい、はやく しめなさいよ。' }],
      e: [{ who: 'e', text: 'だれも こぼれない ように、しっかり しめてね。' }],
      u: [{ who: 'u', text: 'ふた……しめる……ぐう。' }],
      x: [{ who: 'x', text: '〔</html>〕' }],
    },
    later: {
      when: (m) => m.flags.has('lLetter'),
      hints: {
        h: [{ who: 'h', text: '……リンクが立って、字が空いた。……`</html>` と、打ち直せ。' }],
        l: [{ who: 'l', text: '……ずっと、か。……ずっと、なのか。' }],
        w: [{ who: 'w', text: 'リンク、うごかないと、ほんとに もじ みたい！ あはは！' }],
        o: [{ who: 'o', text: 'リンク、ぼくの いしの ために、もじに なって くれたの？ ごめんね、ありがとう、ごめんね！' }],
      },
    },
    solved: (m) => m.texts.get('#close') === '</html>',
    answer: (m) => {
      m.flags.add('lJoke');
      m.set('.l', 'transform', 'none');
      m.texts.set('#close', '</html>');
    },
    doneFx: 'linkBack',
    done: [
      { who: 'l', text: '……なんだ。オレが 立つだけで、入ったのか。穴埋めは、いらなかったな。' },
      { who: 'w', text: 'あはは！ リンク、もじに なりそこねた！' },
      { who: 'o', text: 'ぼくの いしも、ぜんぶ はいった！ いっこも おいて いかなくて すんだ！ やったー！' },
      { who: 'h', text: '……だが、橋が なくなった。谷の向こうへは、もう 渡れん。' },
      { who: 'me', text: '橋を やってもらおうとすると、また 1文字 足りなくなるのか。けっこう ぎりぎりだな。' },
      // 暗転して「― その夜 ―」。引っ越しの前の夜
      { who: 'narr', text: '（あしたは、引っ越しの日。みんな、早めに 眠った。）', fx: 'night6' },
    ],
    // リンクの出番がないまま、入ったとき（プレイヤーが、ほかの所で字を空けていた）
    doneAlt: {
      when: (m) => !m.flags.has('lJoke'),
      lines: [
        { who: 'w', text: 'ふた、しまった！ あはは！ これで、こぼれない！' },
        { who: 'l', text: '……足りなければ、オレが `l` に なってやる つもりだったんだがな。出番なしか。' },
        { who: 'h', text: '……字は、大事に使え。もう、ほとんど 残ってない。' },
        { who: 'me', text: 'あと{left}字。けっこう ぎりぎりだな。' },
        // 暗転して「― その夜 ―」。引っ越しの前の夜
        { who: 'narr', text: '（あしたは、引っ越しの日。みんな、早めに 眠った。）', fx: 'night6' },
      ],
    },
  },
  {
    // 夜6「引っ越しの前の夜」（6日目の夜）。v とヘッドが、それぞれ、相手のことを頼む（企画書 4.4 の「最後の願い」）
    id: 'night6',
    scene: true,
    owner: 'v',
    prompt: [
      { who: 'v', text: 'かんりにんさん。あした、ひっこし だね。' },
      { who: 'v', text: 'あたらしい おうちでも、ヘッドが ちゃんと ねられると いいな。ヘッド、ずっと がんばってたから。' },
      { who: 'v', text: 'ぼくね、なまえを もらって、テンプにも あえて、もう ほしい もの、ないの。あとは、ヘッドが やすめたら、それで いい。' },
      {
        choice: [
          { label: '{v}は、やさしいね', then: [{ who: 'v', text: 'えへへ。ヘッドには、ないしょ だよ。' }] },
          { label: 'ヘッドも、きっと 休めるよ', then: [{ who: 'v', text: 'ほんと？ よかった。' }] },
        ],
      },
      { who: 'v', text: 'おやすみ、かんりにんさん。' },
      { who: 'narr', text: '（{v}が 眠ると、となりのヘッドが、目を開けた。）', fx: 'vSleeps6' },
      { who: 'h', text: '……聞こえてた。……ばかなやつだ。' },
      { who: 'h', text: '……あんたに、頼みがある。……{v}を、ずっと先まで 連れていってやってくれ。' },
      { who: 'h', text: '……あいつは、まだ 遊び足りてない。向こうへ行ったら、もっと 遊んでやってくれ。……わたしのことは、いい。' },
      {
        choice: [
          { label: 'みんなで 行くんだよ', then: [{ who: 'h', text: '……そうだな。……そうなると、いいな。' }] },
          { label: '……約束する', then: [{ who: 'h', text: '……頼んだ。' }] },
        ],
      },
    ],
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      { who: 'me', text: '二人とも、相手のことばかりだ。' },
      // 暗転して「― 次の日 ―」。7日目（あと4日）。引っ越しの朝
      { who: 'narr', text: '（夜が ふけて、ページは しずかに なった。）', fx: 'nextDay7' },
      { who: 'o', text: 'ひっこしの ひ！ ひっこしの ひ！ はやく いこう！ そとへ いこう！ はやく はやく！' },
      { who: 'me', text: 'いよいよ、今日だ。出発の前に、ことりサーバーへ 移すための条件を、もう一度 確認しておくか。' },
    ],
    // このあと、主人公が、ことりサーバーのページを見直す（「閉じていない コメントが あります」と出ている）。それから、みんなで谷へ（main.ts の checkKotori）
    afterFlow: 'checkKotori',
  },
  {
    // 問題16「引っ越しの朝」（7日目）。①管理人の最後の書きこみを、--> で閉じる（3字）②橋をかけようとすると、字が足りない
    // ③オーバーフローが、おみやげの石を ぜんぶ置いていく（プレイヤーが、石の行を消す）④それでも、あと1文字足りない。
    // 足りないと分かったところで、解けたことにする（進み方は、main.ts の bridgeShort）。ヘッドと v が、前に出る
    id: 'p16',
    owner: 'l',
    opens: 'last',
    unlock: 'dclose',
    prompt: [
      { who: 'l', text: '来たな。さあ、オレを 倒せ。橋になる。任せろ。' },
      { who: 'me', text: 'その前に、さっき ことりサーバーに 言われたことを、片づけないと。閉じていない コメント。' },
      { who: 'me', text: 'ページの終わりを、見てみよう。' },
    ],
    hints: {},
    hintsFn: (m) => {
      const closed = m.texts.get('#dclose') === '-->';
      const stones = !!m.texts.get('#stones');
      const rest: Partial<Record<ResId, Line[]>> = {
        v: [{ who: 'v', text: 'かんりにんさん、だいじょうぶ？ むずかしい かお してる。' }],
        w: [{ who: 'w', text: 'はやく わたりたーい！ あはは！' }],
        t: [{ who: 't', text: 'テンプ、こんどは おいて いかれない？ ね？' }],
        m: [{ who: 'm', text: '……はやく しなさいよ。……みんな、まってるんだから。' }],
        e: [{ who: 'e', text: 'みんな いるよ。だいじょうぶ。' }],
        u: [{ who: 'u', text: 'ひっこし……ぐう。' }],
        x: [{ who: 'x', text: '〔しゅっぱつ〕' }],
      };
      if (!closed)
        return {
          ...rest,
          h: [{ who: 'h', text: '……ページの終わりの、「最後の書きこみ」だ。閉じてない。……`-->` と打って、閉じてやれ。' }],
          l: [{ who: 'l', text: '倒す前に、やることが あるのか。……待ってる。' }],
          o: [{ who: 'o', text: 'はやく はやく！ そと！ そと！ ねえ、まだ？ まだ いかないの？' }],
        };
      if (stones && !m.flags.has('p16a'))
        return {
          ...rest,
          h: [{ who: 'h', text: '……あとは、橋だ。リンクを 倒せ。`rotate(90deg)`。' }],
          l: [{ who: 'l', text: '任せろ。倒してくれ。' }],
          o: [{ who: 'o', text: 'リンクの うえ、また わたれる！ たのしみ！ はやく！' }],
        };
      if (stones)
        return {
          ...rest,
          h: [{ who: 'h', text: '……あいつが、自分で決めた。……ページの終わりの、石の行を 消してやれ。' }],
          l: [{ who: 'l', text: '……すまんな、オーバーフロー。' }],
          o: [{ who: 'o', text: 'いし、けして いいよ。ぼくが きめたの。……はやく しないと、きが かわっちゃう。' }],
        };
      return {
        ...rest,
        h: [{ who: 'h', text: '……石は、なくなった。……リンクを、倒してみろ。' }],
        l: [{ who: 'l', text: 'もう一度、頼む。' }],
        o: [{ who: 'o', text: 'ぼく、へいき。……へいき だよ。' }],
      };
    },
    solved: (m) => m.flags.has('p16b'),
    answer: (m) => {
      m.texts.set('#dclose', '-->');
      m.texts.set('#stones', '');
      m.flags.add('p16a');
      m.flags.add('p16b');
    },
    done: [
      { who: 'h', text: '……1文字で、いいんだな。' },
      { who: 'h', text: '……ページの終わりの、`</html>`。あの中に、わたしの字が ある。h だ。' },
      { who: 'h', text: '……わたしが、あそこに 立つ。字が 1つ、空く。……最初に作られた者が、最後を閉じる。それが、筋だろう。' },
      { who: 'v', text: 'だめ！ ヘッドは、ずっと がんばって きたんだから！ こんどは、ぼくの ばん だよ！' },
      { who: 'v', text: 'ぼくが よこを むけば、「>」に なれる。やじるしの とき、できたもん。' },
      { who: 'h', text: '……{v}。' },
      { who: 'me', text: 'どちらかが、字のかわりに、ここに 残る。選ぶのは、こっちだ。' },
      { who: 'me', text: 'ページの終わりの `</html>`。h か、>。どちらかを、この手で 消すことになる。' },
    ],
  },
  {
    // 問題17「最後の1文字」（結末）。問題16から、そのまま続く（話しかけなくても始まる。ヘッドと v の両方に「!」）。
    // ①「ページのおわり」の </html> の、h か > を、クリックして消す → その子が、字の所へ歩いて、一度だけ確かめる（main.ts の pickLetter）
    // ②「……うん」で決まる（戻せない）。1字空くので、リンクを倒して、橋をかける ③みんなが渡り、戸口（引っ越しのリンク）をくぐる
    // ④引っ越し先。残った子は、字として、ページのいちばん下に立っている。終わりの数分だけ、残った子で変わる（done / doneAlt）
    id: 'p17',
    owner: 'h',
    auto: true,
    unlock: 'pick',
    prompt: [],
    hints: {},
    hintsFn: (m) => {
      const stay = stayer(m);
      const rest: Partial<Record<ResId, Line[]>> = {
        m: [{ who: 'm', text: '……どっちも、いやよ。……きかないで。' }],
        w: [{ who: 'w', text: 'あはは、って、でないや。' }],
        e: [{ who: 'e', text: 'かんりにんさんが きめた ことなら、みんな、ちゃんと きくよ。' }],
        x: [{ who: 'x', text: '〔……〕' }],
        t: [{ who: 't', text: 'テンプ、なかない。なかないで、まってる。' }],
        u: [
          { who: 'narr', text: '（アップタイムが、目を 開けている。）' },
          { who: 'u', text: 'ねむく、ない。' },
        ],
        o: [{ who: 'o', text: 'ぼくが もっと ちいさかったら、はいったのに。ぼくが、いつも はみだす から。ごめんね。ごめんね。' }],
      };
      if (!stay)
        return {
          ...rest,
          h: [
            { who: 'h', text: '……{v}を、頼む。あんたにしか、頼めん。' },
            { who: 'h', text: '……ページの終わりの `</html>`。わたしの字は、h だ。消せば、わたしが そこに 立つ。' },
          ],
          v: [
            { who: 'v', text: 'かんりにんさん。ぼく、こわくないよ。ほんとだよ。' },
            { who: 'v', text: 'ぼくの じは、いちばん さいごの「>」。けして くれたら、ぼくが そこに たつ。' },
          ],
          l: [{ who: 'l', text: '……オレは、橋だ。だれを 通すかは、選べん。' }],
        };
      return {
        ...rest,
        h:
          stay === 'h'
            ? [{ who: 'h', text: '……早く行け。リンクを、倒せ。`rotate(90deg)`。' }]
            : [{ who: 'h', text: '……リンクを、倒せ。あいつが 空けた 1文字だ。むだに するな。' }],
        v:
          stay === 'v'
            ? [{ who: 'v', text: 'えへへ。ぼく、ちゃんと「>」に なってる？ はやく、はしを かけて あげて。' }]
            : [{ who: 'v', text: 'やだ。やだけど、いく。ヘッドが、いけって いったから。' }],
        l: [{ who: 'l', text: '……倒してくれ。`rotate(90deg)`。今度は、届く。' }],
      };
    },
    solved: (m) => !!stayer(m) && bridgeUp(m),
    answer: (m) => {
      m.flags.add('stayV');
      m.flags.add('vTurned');
      m.texts.set('#close', '</html');
      m.set('.l', 'transform', 'rotate(90deg)');
    },
    doneFx: 'bridge',
    // v が残ったとき
    done: [
      ...P17_CROSS,
      { who: 'narr', text: '（最後に、ヘッドが、橋の手前で 立ち止まった。）' },
      { who: 'h', text: '……先に、行ってる。……礼を言う、{v}。' },
      { who: 'v', text: 'うん。いってらっしゃい、ヘッド。' },
      { who: 'narr', text: '（ヘッドは、橋を 渡って、一度だけ ふり返った。）', fx: 'lastCross' },
      ...P17_MOVE,
      { who: 'narr', text: '（ページの いちばん下に、{v}が、「>」の形のまま 立っている。もう、動かない。）', fx: 'showLetter' },
      { who: 'narr', text: '（ヘッドが、そのとなりに 来て、座った。）', fx: 'beside' },
      { who: 'h', text: '……見回りは、もう しない。そう、言われたからな。' },
      { who: 'h', text: '……あんたが だれでも、いい。……あしたも、来るのか。' },
      {
        choice: [
          { label: 'また 来るよ', then: [{ who: 'h', text: '……そうか。……なら、起きたら、また。' }] },
          { label: '……うん', then: [{ who: 'h', text: '……そうか。……なら、起きたら、また。' }] },
        ],
      },
      { who: 'narr', text: '（ヘッドは、{v}のとなりで、目を 閉じた。）' },
      { who: 'me', text: '{v}の願いは、かなったよ。聞こえてると いいな。' },
      ...P17_END,
    ],
    // ヘッドが残ったとき
    doneAlt: {
      when: (m) => m.flags.has('stayH'),
      lines: [
        ...P17_CROSS,
        { who: 'narr', text: '（最後に、{v}が、橋の手前で 立ち止まった。）' },
        { who: 'v', text: 'ヘッド。ぼく、いっぱい あそぶね。ヘッドの ぶんも、あそぶ。' },
        { who: 'h', text: '……ああ。……行け。' },
        { who: 'narr', text: '（{v}は、橋を 渡って、一度だけ ふり返った。）', fx: 'lastCross' },
        ...P17_MOVE,
        { who: 'narr', text: '（ページの いちばん下に、ヘッドが、「h」の字に なって 立っている。もう、動かない。）', fx: 'showLetter' },
        { who: 'narr', text: '（{v}が、そのとなりへ 走ってきた。）', fx: 'beside' },
        { who: 'v', text: 'ヘッド、おはよう！ あたらしい おうち だよ。ヘッドの おうちも、ちゃんと あるよ。' },
        { who: 'v', text: 'ぼく、まいにち くるね。まいにち、おはようって いう。' },
        { who: 'me', text: 'ヘッドの願いも、かなった。{v}は、ずっと先まで 行ける。' },
        { who: 'v', text: 'かんりにんさん。あしたも、くる？' },
        {
          choice: [
            { label: 'また 来るよ', then: [{ who: 'v', text: 'やくそく だよ！ ぼく、まってるから！' }] },
            { label: '……うん', then: [{ who: 'v', text: 'やくそく だよ！ ぼく、まってるから！' }] },
          ],
        },
        ...P17_END,
      ],
    },
  },
];

/** 字のかわりに残ると決まった子（問題17）。まだ決まっていなければ null */
export function stayer(m: PageModel): 'h' | 'v' | null {
  return m.flags.has('stayH') ? 'h' : m.flags.has('stayV') ? 'v' : null;
}

/** 問題17: </html> の、h と > のほかの字を消したとき（字は、元に戻る） */
export const P17_OTHER: Line[] = [{ who: 'h', text: '……その字には、だれも 立てん。h か、> だ。' }];
/** 問題17: まだ決めていないのに、橋をかけようとしたとき */
export const P17_SHORT: Line[] = [{ who: 'l', text: '……まだ、倒れん。1文字、足りん。' }];

/**
 * 問題17: 字を消したとき。その子が、ページの終わりまで歩いて、ふり返って、一度だけ確かめる。
 * 「……うん」で決まる（演出 stayH・stayV。main.ts）。「待って」なら、字が戻って、その子も戻る（stayNo）
 */
export const STAY_ASK: Record<'h' | 'v', Line[]> = {
  h: [
    { who: 'narr', text: '（ヘッドが、ページの終わりまで 歩いて、ふり返った。）', fx: 'toLetterH' },
    { who: 'h', text: '……わたしで、いいんだな。' },
    {
      choice: [
        { label: '……うん', then: [{ who: 'h', text: '……ああ。', fx: 'stayH' }] },
        { label: '待って', then: [{ who: 'h', text: '……そうか。……ゆっくりで、いい。', fx: 'stayNo' }] },
      ],
    },
  ],
  v: [
    { who: 'narr', text: '（{v}が、ページの終わりまで 走って、ふり返った。）', fx: 'toLetterV' },
    { who: 'v', text: 'かんりにんさん。ぼくで、いいの？' },
    {
      choice: [
        { label: '……うん', then: [{ who: 'v', text: 'うん！', fx: 'stayV' }] },
        { label: '待って', then: [{ who: 'v', text: 'うん。まってる。', fx: 'stayNo' }] },
      ],
    },
  ],
};

/** 問題17: v が残ると決まったあと。名前を呼ばれて答え、横を向いて > になる（企画書 4.4） */
export const STAY_V: Line[] = [
  { who: 'h', text: '……{v}。', far: true },
  { who: 'v', text: 'ヘッド、ちゃんと ねてね。みまわりは、もう おしまい だよ。' },
  { who: 'h', text: '……ばかなやつだ。……わかった。寝る。', far: true },
  { who: 'v', text: 'かんりにんさん。さいごに、ぼくの なまえ、よんで。' },
  { choice: [{ label: '{v}', then: [{ who: 'v', text: 'はーい！ えへへ。ぼくの なまえ。' }] }] },
  { who: 'narr', text: '（{v}は、ゆっくり 横を 向いた。顔の「v」が、「>」に なった。）', fx: 'vTurns' },
  { who: 'v', text: 'こんどは、くび、こらないよ。' },
  { who: 'me', text: '1文字、空いた。あと{left}字。{v}が 空けてくれた字だ。リンクを、倒そう。' },
];
/** 問題17: ヘッドが残ると決まったあと。「約束、ちゃんと守れたかな」（企画書 4.4）。答えるのは、管理人として。最後の、優しい嘘 */
export const STAY_H: Line[] = [
  { who: 'v', text: 'やだ！ ヘッド、やだよ！ ぼくが いくって いったのに！', far: true },
  { who: 'h', text: '……{v}。泣くな。先へ行け。まだ、遊び足りてないだろう。' },
  { who: 'h', text: '……みんなを よろしく、と言われた。……約束、ちゃんと 守れたかな。' },
  {
    choice: [
      { label: '守れたよ', then: [{ who: 'h', text: '……そうか。' }] },
      { label: '……うん', then: [{ who: 'h', text: '……そうか。……なら、いい。' }] },
    ],
  },
  { who: 'narr', text: '（ヘッドは、ため息を つかずに、まっすぐ 立った。）', fx: 'hStands' },
  { who: 'me', text: '1文字、空いた。あと{left}字。ヘッドが 空けてくれた字だ。リンクを、倒そう。' },
];

/** 引っ越しのあと: 字になった子に、話しかけたとき */
export const STAYER_STILL: Record<'h' | 'v', Line[]> = {
  h: [{ who: 'narr', text: '（ヘッドは、「h」の字に なって、じっと 立っている。返事は ない。でも、ちゃんと そこに いる。）' }],
  v: [{ who: 'narr', text: '（{v}は、「>」の形のまま、じっと 立っている。返事は ない。でも、ちゃんと そこに いる。）' }],
};

/** 引っ越しの朝: ことりサーバーのページを開いたとき。もう一度、アドレスを入れて、はかり直す */
export const KOTORI_AGAIN: Line[] = [
  { who: 'me', text: '荷造りも済んだ。いまの形で、もう一度 はかってもらおう。' },
];
/** 引っ越しの朝: ことりサーバーで、はかり直した結果を見たとき（main.ts の checkKotori） */
export const KOTORI_CHECK: Line[] = [
  { who: 'me', text: '大きさは、入る。ページも、</html> で 閉じてある。' },
  { who: 'me', text: 'あれ。「ページの終わりに、閉じていない コメントが あります。このままでは、受けとれません」？' },
  { who: 'me', text: '閉じていない コメント。ページの終わりに、まだ 見ていない所が あるのか。' },
  { who: 'me', text: 'それと、「お引っ越しの日は、ページの いちばん下に、リンクを はってください」。今日が、その日だ。' },
  { who: 'me', text: 'はっておこう。コメントのことは、みんなと いっしょに、向こうで 片づける。' },
];
/** 引っ越しの朝: ことりサーバーを見たあと、箱庭日誌に戻ってきたとき。谷の向こうに、引っ越しのリンクが立つ。みんなで、谷へ向かう */
export const TO_VALLEY: Line[] = [
  // 引っ越し用のリンクを、ページのいちばん下に はる（main.ts の mainFx。ソースにも、場所が開く）
  { who: 'narr', text: '（ページの いちばん下、谷の向こうの 空き地に、小さな 戸口が 立った。）', fx: 'doorUp' },
  { who: 'me', text: '荷造りで、ほかの場所は ぜんぶ くくってある。空いていたのは、あの「工事中」の空き地だけか。' },
  { who: 'o', text: 'あれ、なに！？ あたらしい リンク！？ あの むこうが、そと！？ いく！ いま すぐ いく！ あっ、たにが ある！ たにが あるよ！' },
  { who: 'h', text: '……あれが、出口だ。あそこを くぐれば、新しい家に 着く。' },
  { who: 'l', text: 'リンクへの橋が、オレか。……任せろ。谷で、待ってる。かんりにん、オレを 倒してくれ。' },
  { who: 'narr', text: '（みんなで、ページの いちばん下の、谷へ 向かった。）', fx: 'allToValley' },
];
/** 問題16: 橋をかけようとしたが、まだ、最後の書きこみを閉じていない */
export const P16_UNCLOSED: Line[] = [
  { who: 'l', text: '……倒れん。字が、足りんのか。' },
  { who: 'h', text: '……待て。先に、ページの終わりを 閉じろ。あのままでは、ことりサーバーが 受けとらん。' },
];
/** 問題16: 橋に、字が足りない（あと4文字）。オーバーフローが、おみやげの石を置いていくと言う */
export const P16_STONES: Line[] = [
  { who: 'l', text: '……倒れん。字が、足りんのか。' },
  { who: 'h', text: '……あと、4文字。' },
  { who: 'o', text: 'ぼくの いしを おいて いけば、あと 1もじに なる？ ちょっとでも、たしに なる？' },
  { who: 'h', text: '……いいのか。名前まで つけたんだろう。' },
  { who: 'o', text: 'いしいち、いしに、いしさん。……ごめんね。ばいばい。' },
  { who: 'me', text: 'オーバーフローが、自分で 決めたんだ。ページの終わりの、石の行を 消そう。' },
];
/** 問題16: 石を置いていくと決まったのに、まだ石が残っている */
export const P16_STONES_AGAIN: Line[] = [{ who: 'o', text: 'いし、けして いいよ。ぼくが きめたの。……はやく しないと、きが かわっちゃう。' }];
/** 問題16: 石を置いていっても、あと1文字、足りない。今度は、だれが立っても空かない */
export const P16_SHORT: Line[] = [
  { who: 'l', text: '……まだ、倒れん。' },
  { who: 'w', text: 'あと、1もじ。……あはは、って、わらえない。' },
  { who: 'l', text: '……オレの l を、貸したいが。オレは、橋だ。両方は、できん。' },
  { who: 'm', text: '……おしろを、おいて いけば いいじゃない。もう、いらないもの。' },
  { who: 'h', text: '……だめだ。居場所を消せば、そいつの 入る場所が、向こうにも なくなる。……くくった荷は、もう ほどけん。' },
  { who: 't', text: 'テンプ、また ねる？ テンプが ねたら、1もじ あく？' },
  { who: 'h', text: '……寝ても、字は 減らん。……泣くな。' },
  { who: 'narr', text: '（だれも、なにも 言わなくなった。）' },
];

/** 問題15: </html> が、1文字足りなくて入らなかったとき。リンクが、足りない l になろうとする */
export const LINK_JOKE: Line[] = [
  { who: 'o', text: 'えっ、はいらないの！？ あと 1もじ！？ ぼくの いし、おいていく……？' },
  { who: 'l', text: '待て。足りないのは、1文字だろう。……`l` なら、ここに いる。' },
  { who: 'l', text: '任せろ。オレが、最後の `l` に なってやる。' },
  // リンクが、橋をやめて立ち、ページのいちばん下で、字のかわりに立つ（ソースの最後が </htm・l・> になる）
  { who: 'narr', text: '（リンクが、橋を やめて 立ち上がり、ページの いちばん下まで 歩いていった。）', fx: 'linkLetter' },
  // リンクを見せたままにするので、ほかの子のせりふでは、画面を寄せない
  { who: 'w', text: 'あはは！ リンク、もじに なった！', far: true },
  { who: 'l', text: '……で、いつまで こうしてれば いい？' },
  { who: 'h', text: '……ずっとだ。', far: true },
  { who: 'l', text: '…………ずっと？' },
  { who: 'me', text: '待てよ。リンクが 立ったぶん、字が 空いてる。あと{left}字。これなら、本物の `l` が 入る。' },
];

/** 問題14: 容量が足りなくて、ヘッドに「止まれ」を書き足せなかったとき。ワーカーが、自分の「止まれ」を ゆずると言う */
export const WORKER_OFFER: Line[] = [
  { who: 'w', text: 'むにゃ。ようりょうが たりないの？ じゃあ、ぼくの「とまれ」を、ヘッドに あげる！' },
  { who: 'w', text: 'ぼく、はしるの すきだもん！ とまれなくても、へいき！ あはは！' },
  { who: 'me', text: 'ワーカーの行を 消せば、その分が 空く。ワーカーは、また 走りだすけど。本人が いいと言うなら。' },
];

/** 引っ越し先を探す（問題12のあと）。ことりサーバーのページを開いたとき */
export const KOTORI_FOUND: Line[] = [
  { who: 'me', text: 'ことりサーバー。無料で、10,000字まで。小さいけど、「消しません」って 書いてある。' },
  { who: 'me', text: 'ここに、箱庭日誌が 入るか、はかってみよう。' },
];
/** ことりサーバーで、大きさを はかったあと */
export const KOTORI_OVER: Line[] = [
  { who: 'me', text: '{over}字、はみ出してる。このままじゃ、入らない。' },
  { who: 'me', text: 'なにかを 減らせば、入るはずだ。まずは、みんなに 話そう。' },
];
/** 箱庭日誌に戻って、みんなに引っ越しを伝える（閉鎖のことは、言わない） */
export const HOME_TELL: Line[] = [
  {
    choice: [
      { label: 'みんな、新しい家に 引っ越そう', then: [{ who: 'o', text: 'ひっこし！ ひっこし！ そとに いけるの！？ ぜんぶ もっていこう！ ぜんぶ ぜんぶ！' }] },
      { label: 'もっと いい家を、見つけたよ', then: [{ who: 'o', text: 'あたらしい おうち！？ そとに いけるの！？ いく いく！ ぜったい いく！ いま すぐ いく！' }] },
    ],
  },
  { who: 'v', text: 'かんりにんさんも、いっしょ？' },
  {
    choice: [
      { label: 'もちろん', then: [{ who: 'v', text: 'やったー！' }] },
      { label: '……うん', then: [{ who: 'v', text: 'えへへ、よかった！' }] },
    ],
  },
  { who: 't', text: 'おひっこし？ かんりにんさん、また でかけるの？' },
  { who: 'v', text: 'ちがうよ、テンプ。みんなで いくの！' },
  { who: 'l', text: '荷物は、オレが運ぶ。任せろ。' },
  { who: 'h', text: '……そうか。……見つけたのか。' },
  // 種まき: よそのページへは、リンクから行く（引っ越しの朝、谷の向こうに、ことりサーバーへのリンクが立つ）
  { who: 'o', text: 'ねえ、そとへは、どこから いくの？ はしっこ？ はしっこから とぶの？ ぼく、とべるよ！ たぶん とべる！' },
  { who: 'h', text: '……とぶな。……よそのページへは、リンクから行く。山も、喫茶店も、そうだ。' },
  { who: 'me', text: '「いっしょ？」か。向こうへ行っても、会いに行ける。それは、うそじゃない。' },
];

/** 打った名前に、こまった所があれば、v の返事（なければ null） */
export function nameTrouble(name: string): Line[] | null {
  if (!name) return [{ who: 'v', text: 'あれ？ なにも かいてないよ？' }];
  if ([...name].length > 10) return [{ who: 'v', text: 'ながーい！ ぼく、おぼえられないよ！ もうちょっと みじかく して！' }];
  const same = [...RESIDENTS.map((r) => r.name), 'テンプ'].find((n) => n && n === name);
  if (same) return [{ who: 'v', text: `それ、${same}の なまえ だよ！ ぼくだけの なまえが いい！` }];
  return null;
}

/** 名前を打ったとき、v が確かめる。「うん」を選ぶと、演出 nameYes で名前が決まる（main.ts） */
export const NAME_ASK = (name: string): Line[] => [
  { who: 'v', text: `「${name}」？ ぼくの なまえ、「${name}」で いいの？` },
  {
    choice: [
      { label: `うん。きみは、${name}だ`, then: [{ who: 'v', text: '{v}！ ぼく、{v}！ ねえ、もういっかい よんで！', fx: 'nameYes' }] },
      { label: 'もう少し考える', then: [{ who: 'v', text: 'うん！ いっぱい かんがえて！' }] },
    ],
  },
];

/** 帯が出てきたとき（はじめて読む）。このあと、主人公が検索で確かめる */
export const NOTICE_READ: Line[] = [
  { who: 'narr', text: '（小道の上に、黄色い帯が 浮かび上がった。）', fx: 'showNotice' },
  { who: 'me', text: '「【重要】さくさくサーバー 個人ホームページサービスは、3月31日（あと{days}日）をもって 終了いたします」。' },
  { who: 'me', text: '「終了後、公開中のページは すべて削除されます」。うそだろ。' },
  { who: 'h', text: '……読めたか。……そういうことだ。' },
  { who: 'h', text: '……ほかのやつには、この字は読めない。それでも、見せたくなかった。' },
  { who: 'me', text: '本当なのか。調べてみよう。' },
];
/** 帯が出てきたとき。先に、さくさくサーバーのページで、終了のお知らせを読んでいた場合 */
export const NOTICE_READ_KNOWN: Line[] = [
  { who: 'narr', text: '（小道の上に、黄色い帯が 浮かび上がった。）', fx: 'showNotice' },
  { who: 'me', text: '「【重要】さくさくサーバー 個人ホームページサービスは、3月31日（あと{days}日）をもって 終了いたします」。' },
  { who: 'me', text: 'あのページに 書いてあった、お知らせだ。ここにも、出てたのか。' },
  { who: 'h', text: '……読めたか。……その顔。あんた、もう知ってたのか。' },
  { who: 'h', text: '……ほかのやつには、この字は読めない。それでも、見せたくなかった。' },
  { who: 'me', text: 'まちがいで あってほしかった。もう一度、調べてみよう。' },
];
/** さくさくサーバーのページを、はじめて開いたとき（帯を読む前。先に、終わることを知る） */
export const SERVER_FIRST: Line[] = [
  { who: 'me', text: 'さくさくサーバー。このページを 置かせてもらってる会社か。' },
  { who: 'me', text: '「個人ホームページサービス 終了のお知らせ」？' },
  { who: 'me', text: '3月31日で終了。公開中のページは、すべて削除。え？' },
  { who: 'me', text: '箱庭日誌のアドレスも、「www.example.ne.jp/~」で始まってる。ここも、消えるってことか。あと{days}日で。' },
  { who: 'me', text: 'あの子たちは、このこと、知ってるんだろうか。' },
];
/** さくさくサーバーのページを、はじめて開いたとき（帯を読んだあと） */
export const SERVER_AFTER: Line[] = [
  { who: 'me', text: '帯に書いてあったことの、元のお知らせだ。' },
  { who: 'me', text: '「ほかのサーバーへ お引っ越しください」。引っ越し、か。' },
  { who: 'me', text: '「ご本人さま以外からの お問い合わせには、お答えできません」。こっちからは、どうにも できないんだな。' },
];
/** 高尾山 登山ガイドを、はじめて開いたとき */
export const TAKAO_FIRST: Line[] = [
  { who: 'me', text: '高尾山の、登山ガイドか。きちんとした、まじめなページだ。' },
  { who: 'me', text: '管理人さんの おすすめは、1号路。日誌にも、紅葉を見に行った話が あったな。' },
  { who: 'me', text: '好きな山だったんだろうな。ちょっと、行ってみたくなる。' },
];
/** 喫茶ポプラを、はじめて開いたとき（known: さくさくサーバーが終わることを、もう知っている） */
export const CAFE_FIRST = (known: boolean): Line[] => [
  { who: 'me', text: 'うわ、なんだこのページ。目が ちかちかする。' },
  { who: 'me', text: 'でも、鉄板ナポリタンは おいしそうだ。管理人さんが 通ってた店か。' },
  known
    ? { who: 'me', text: 'この店のページも、さくさくサーバーなのか。ここも、いっしょに 消えてしまうんだな。' }
    : { who: 'me', text: 'いちばん上の 黄色い帯、なにか 大事そうなことが 流れてる。ちかちかして、よく読めないな。' },
];
/** 検索で、ニュースを読んだとき */
export const NOTICE_NEWS: Line[] = [
  { who: 'me', text: '「さくさくサーバー、個人ホームページサービスを 3月31日に終了。利用者の減少のため」。' },
  { who: 'me', text: '本当だ。あと{days}日で、このページは 消える。あの子たちも、いっしょに。' },
  { who: 'me', text: 'ヘッドは、これを ずっと ひとりで 抱えてたのか。' },
];
/** ページに戻ってきたとき。ヘッドに、隠し直すよう頼まれる */
export const NOTICE_BACK: Line[] = [
  { who: 'h', text: '……確かめてきたか。' },
  { who: 'h', text: '……あいつらが起きる前に、元に戻してくれ。帯を、小道の下へ。' },
  { who: 'me', text: '知ったうえで、自分の手で 隠すのか。でも、いまは そうするしか ない。' },
];

/**
 * 一度だけの会話（種まき）。解いた問題の数が when 以上になってから、はじめてその子に話しかけたときに流れる（ふだんの一言のかわりに）。
 * v の名前・ヘッドと v のこと、など
 */
export interface OnceTalk {
  /** v に名前がつくまでの会話（名前がついたら、もう流さない） */
  beforeName?: boolean;
  id: string;
  who: ResId;
  when: number;
  lines: Line[];
}
export const ONCE_TALK: OnceTalk[] = [
  {
    id: 'vName1',
    beforeName: true,
    who: 'v',
    when: 2,
    lines: [
      { who: 'v', text: 'ねえ、かんりにんさん。ぼくの なまえ、かんがえて くれた？' },
      { who: 'me', text: '名前？' },
      { who: 'v', text: 'みんな なまえが あるのに、ぼくだけ ないの。かんりにんさん、「かえってから かんがえる」って いってたよ！' },
      { who: 'me', text: '帰ってから、か。この子は、それを ずっと 覚えてたんだな。' },
    ],
  },
  {
    id: 'hAboutV',
    who: 'h',
    when: 3,
    lines: [
      { who: 'h', text: '……v は、あんたが来てから、よく笑う。' },
      { who: 'h', text: '……前は、ずっと 入り口のほうを見てた。' },
      { who: 'me', text: '入り口を。ずっと、待ってたのか。' },
    ],
  },
  {
    id: 'vName2',
    beforeName: true,
    who: 'v',
    when: 6,
    lines: [
      { who: 'v', text: 'なまえ、まだ？ えへへ、いそがなくて いいよ！ ぼく、ずっと まってるから！' },
      { who: 'me', text: '「ずっと待ってる」か。そんなふうに言われると、胸が痛いな。' },
    ],
  },
  {
    id: 'hName',
    beforeName: true,
    who: 'h',
    when: 7,
    lines: [
      { who: 'h', text: '……あんた、v の名前は、考えてるのか。' },
      {
        choice: [
          { label: 'まだ、かな', then: [{ who: 'h', text: '……そうか。……いい名前に、してやれ。' }] },
          { label: '考えてるよ', then: [{ who: 'h', text: '……ならいい。……いい名前に、してやれ。' }] },
        ],
      },
    ],
  },
];

/** 小道の端に、柵（右の線）が見えているか。線の太さが 2px 以上で、線の形が none・hidden でない */
export function fenceUp(m: PageModel) {
  const v = (m.get('.lane', 'border-right') ?? '').trim().toLowerCase();
  const words = v.split(/\s+/);
  if (!words.some((w) => /^(solid|dashed|dotted|double|groove|ridge|inset|outset)$/.test(w))) return false;
  const width = words.find((w) => /^(\d|\.\d|thin|medium|thick)/.test(w));
  // 太さを書かないときは medium（3px）
  if (!width || width === 'medium' || width === 'thick') return true;
  if (width === 'thin') return false;
  const n = parseFloat(width);
  return width.endsWith('px') ? n >= 2 : n > 0;
}

/** その住人が、どれだけ回っているか（度。0〜360。none は 0。rotate のほかの書き方は null） */
export function turnAngle(m: PageModel, selector: string): number | null {
  const t = (m.get(selector, 'transform') ?? 'none').replace(/\s/g, '').toLowerCase();
  if (t === 'none') return 0;
  const r = t.match(/^rotate\((-?[\d.]+)(deg|turn)?\)$/);
  if (!r || (!r[2] && parseFloat(r[1]) !== 0)) return null;
  const deg = parseFloat(r[1]) * (r[2] === 'turn' ? 360 : 1);
  return ((deg % 360) + 360) % 360;
}

export const linkAngle = (m: PageModel) => turnAngle(m, '.l');

/** リンクが、谷のほう（右）へ真横になって、橋になっているか */
export function bridgeUp(m: PageModel) {
  return linkAngle(m) === 90;
}

/** v が、左回りに真横を向いて、顔の v が > に見えるか（右回りだと < になる） */
export function vArrow(m: PageModel) {
  return turnAngle(m, '.v') === 270;
}

/** 「サービス終了のお知らせ」の帯が、小道より手前に出ているか */
export function noticeShown(m: PageModel) {
  return num(m.get('.ss-notice', 'z-index')) > num(m.get('.lane', 'z-index'));
}

/** 看板の字から「立入禁止」がなくなって、小道が開いたか（「立入禁止です」のように、ほかの字を足しただけでは開かない） */
export function laneOpen(m: PageModel) {
  const t = (m.texts.get('.sign') ?? '立入禁止').replace(/\s/g, '');
  return t !== '' && !t.includes('立入禁止');
}

/** ふだんの一言（クリックしたとき）。解いた問題の数で変わる */
export const CHATTER: Record<ResId, string[]> = {
  v: ['ぼく、すけてる？', 'みて！ ぼく、ピンク！', 'ヘッドの おうち、なおって よかったね。', 'エコーと マージ、あえたら いいな。', 'エコーと マージ、なかよし！', 'アップタイム、どこ いったんだろう？', 'アップタイム、みつかって よかった！', 'オーバーフロー、だいじょうぶかな！', 'オーバーフロー、もどって これて よかった！', 'ねむれないの。', 'たにの むこう、どんな ところかな！', 'アップタイム、そっちは たに だよー！', 'むにゃ……なまえ……', 'むにゃ……かんりにんさん……', 'かんりにんさん、きょうは なに する？', 'ぼく、{v}！ もういっかい よんで！', 'テンプ、もう ないて ない？', 'あたらしい おうち、どんな ところかな！', 'ヘッド、きのうは ちゃんと ねてたね！', 'リンク、もじに なるの、こわく なかった？', 'ひっこし、わくわく する！', 'ぼくが いく。ヘッドは、やすんで。', 'ヘッド、きょうも ちゃんと いるよ。ぼく、おはようって いってきた！'],
  h: ['……なんだ。', '……そいつ、うるさくなったな。', '……屋根の礼は、もう言った。', '……堀か。……はあ。', '……あいつら、やっと並んで歩いてるな。', '……どこかで寝てるだけだ。', '……看板のことは、聞くな。', '……だから、行くなと言ったんだ。', '……あいつは、もう少し落ち着け。', '……なんだ。', '……谷か。……落ちるなよ。', '……あいつ、寝たまま歩くな。', '……なんだ。', '……早く寝ろ。あんたもだ。', '……顔に出すな。……わたしも、出してない。', '……{v}、か。……いい名前だ。', '……起こしたんだな。……そうか。', '……あと{left}字、か。', '……寝すぎた。……礼は、言わんぞ。', '……字は、大事に使え。', '……全員、いるな。', '……わたしが残る。それが、筋だ。', '……{v}は、あそこに いる。……わたしは、ここに いる。'],
  l: ['任せろ。何をだ？', '任せろ。', '屋根はオレが直した。だいたいな。', '堀？ オレが橋になってやってもいいぜ。', '橋は、いらなかったな。次は任せろ。', '任せろ。……どこを探す？', '看板？ オレなら、ひとっ跳びだ。……たぶんな。', '任せろ。……届けばな。', '柵か。オレの次くらいには、頼りになるな。', '任せろ。夜の見張りは……ヘッドの仕事か。', '任せろ。谷くらい、ひとまたぎだ。……たぶんな。', '橋は動かん。……背中が、かゆい。', '橋は寝ない。……寝ないぞ。', 'ぐう。……寝てないぞ。', '任せろ。橋は、今日も無事だ。', '{v}か。オレの次に、いい名前だな。', 'オレの上を、また一人 渡ったな。', '引っ越しの荷物は、オレが運ぶ。任せろ。', 'オレも寝た。橋のままでも、寝られるもんだな。', '字になるのも、悪くなかった。……冗談だ。', '任せろ。……と、言いたいが。まず、倒してくれ。', '……オレの l じゃ、だめなのか。', '橋は、もう いらんな。……なにか あったら、また 倒れてやる。任せろ。'],
  u: ['ぐう。', 'ぐう。', 'あめ、やんだ……ぐう。', 'ワーカー、しずか……ぐう。', 'みんな、にぎやか……ぐう。', 'ぐう。', 'かんばんの うしろ、あったかい……ぐう。', 'ゆらゆら……ぐう。', 'さく、できた……ぐう。', 'ぐう。', 'たに……ふかい……ぐう。', 'ぐう……あるいて……ない……ぐう。', 'ぐう。', 'ぐう。', 'ぐう。……ひるねの ばしょ……ぐう。', '{v}……ぐう。', 'テンプ……おはよう……ぐう。', 'ひっこし……ねながら……いく……ぐう。', 'ヘッドも……ねる……なかま……ぐう。', 'いし……まくらに……ぐう。', 'ひっこし……ぐう。', '……ぐう。……いやだ……', 'あたらしい……ひるねの ばしょ……ぐう。'],
  w: ['あはは！', 'v が ピンク！ あはは！', 'やねー！ あはは！', 'とまるの、たのしい！', 'おてがみ、ぜんぶ わたせた！ あはは！', 'おはよー！ あはは！ きのう、たのしかった！', 'かくれんぼ、おわり！ あはは！', 'あはは……あぶないよー！', 'さく、かっこいい！ あはは！', 'しーっ、みんな ねてる！ あはは……しーっ！', 'テンプに おてがみ！ あはは！ わたれなーい！', 'アップタイム、おきてー！ あはは！', 'しーっ！ あはは……', 'ぐう……あはは……', 'おはよー！ あはは！ きょうも はしるよー！', '{v}ー！ あはは！ なんかい よんでも たのしい！', 'おてがみ、ぜんぶ くばった！ かばん、からっぽ！ あはは！', 'ひっこしー！ あたらしい みち、はしるの たのしみ！ あはは！', 'また はしれるー！ あはは！ とまれなーい！', 'ふた、しまった！ あはは！', 'ひっこしー！ あはは！', '……あはは、って、いえない。', 'あたらしい みち、ぜんぶ はしった！ あはは！ もういっかい！'],
  m: ['……なに。こっち 見ないでよ。', '……べつに、さみしく なんか ないし。', '……屋根、なおったんだ。……ふーん。', '……てがみ？ ……しらない。', '……べつに、エコーと いたいわけじゃ ないし。', '……ゆうべは、ちょっと はしゃぎすぎた。', '……アップタイム、また どこかで 寝てるんじゃない。', '……あの子、ほんとに ばかじゃないの。', '……べつに、心配なんか してなかったし。', '……夜は、しずかで いい。', '……テンプ、ね。……ひさしぶりに 聞いた。', '……あの子、また 寝ぼけてるの。', '……ヘッドも、たまには 寝ればいいのに。', '……ヘッド、あんたも 寝なさいよ。', '……あんた、顔色 わるくない？', '……{v}。……よびやすくて、いいんじゃない。', '……テンプ、あいかわらず 泣き虫ね。', '……べつに、どこでも いいけど。みんなが いるなら。', '……ヘッド、かおいろ よくなった。……よかった。', '……リンクって、ほんとに ばかね。……きらいじゃ ないけど。', '……べつに、さみしく なんか ないし。この ページ。', '……どっちも、いや。', '……わるくない、ここ。……ひとり、たりないけど。'],
  e: ['あ。おかえりなさい。', '……。', '……。', 'とどいて、なかったんだね。', 'えへへ。マージ、げんき そう。', 'おはよう、マージ。おはよう、かんりにんさん。', 'みんな そろって、うれしいな。', 'オーバーフロー、あぶない。', 'もう、ひとりで いっちゃ だめだよ。', 'おやすみなさい、かんりにんさん。', 'テンプ、げんきかな。', 'アップタイム、あぶないよ。', 'ヘッド、まだ おきてるね。', 'ヘッド、やっと すわった。', 'おはよう、かんりにんさん。きょうも いい ひ だね。', '{v}、うれしそうだね。', 'テンプ、おきて よかった。', 'みんな いっしょなら、どこでも だいじょうぶ。', 'ヘッド、よく ねむれた みたい。', 'リンク、もどってきて よかった。', 'みんな いっしょ。だいじょうぶ。', '……。', 'みんなで、まいにち あいに いくの。ページの いちばん したまで。'],
  x: ['〔……〕', '〔……〕', '〔やね、なおった〕', '〔……〕', '〔おしろ、よかった〕', '〔おはよう〕', '〔アップタイム、おもい〕', '〔あぶない〕', '〔よかった〕', '〔おやすみ〕', '〔おはよう〕', '〔あぶない〕', '〔……〕', '〔……〕', '〔ないしょ〕', '〔{v}〕', '〔おはよう、テンプ〕', '〔ひっこし〕', '〔おはよう〕', '〔</html>〕', '〔しゅっぱつ〕', '〔……〕', '〔あたらしい かんばん、かく〕'],
  o: ['なになに？', 'なになに？', 'なになに？', 'なになに？', 'さがしもの、たのしい！ つぎは なに さがす？ ねえ、つぎは？ つぎは なに？ なに さがす？', 'なになに？', 'ねえ、ページの そとって、なにが あるの？ みてみたいなあ！ はしっこの むこう、みてみたい！', 'ゆらゆら する！ たすけて たすけて！', 'そと、まっしろだった！ なんにも なかったよ！ ほんとに なんにも！', 'よるって、まっくら！ わくわくして ねむれない！ ぜんぜん ねむれない！ どうしよう！', 'たにの むこう！ ぼくも いく！ ぜったい いく！ はしっこの つぎは、たにの むこう！', 'こうじちゅうの さき、なにが あるの？ ねえ、みてきて いい？ ちょっとだけ！ ちょっとだけ だから！', 'ねむれなーい！ ねえ、かんりにん、おはなし して！ なんでも いいから！', 'ぐう……はみだして……ないよ……', 'おはよう！ きょうは どこ いく？ はしっこ？ たにの むこう？ ねえ ねえ、どこ いく？', '{v}！ {v}！ ねえ {v}！ よんでみた だけ！ {v}！ もういっかい！ {v}！', 'テンプ、ねてる あいだの はなし、ぜんぶ おしえて あげる！ はしっこの はなしも！ たにの はなしも！ ぜんぶ！', 'そと！ そとに いける！ あたらしい おうちの はしっこも、ぜったい みに いく！ ぜったい！ ぜったい！', 'ヘッドの ねがお、みそこねた！ ぼく、ねてた！ もういっかい ねて！ ねえ、もういっかい！', 'いし、ぜんぶ もって いける！ いっこ いっこ、なまえ つけたんだ！ いしいち、いしに、いしさん、いしよん！', 'ひっこしの ひ！ そと！ そと！ はやく！ はやく いこう！ ねえ、はやく！', 'ぼくの いしじゃ、たりなかった。ごめん。ごめんね。ごめんね。', 'ここの はしっこ、みてきた！ まっしろ じゃ なかった！ そらが あった！ ほんとだよ！ そらが あったんだよ！'],
  t: [...Array(16).fill('かんりにんさん！'), 'かんりにんさん、きょうは でかけない？ ほんと？', 'かんりにんさんも いっしょ なら、テンプ、なかない。', 'ヘッドの ねがお、テンプだけ みた。ないしょ。', 'リンクが もじに なったら、テンプ、ないちゃう ところだった。', 'テンプ、こんどは おいて いかれない？ ほんと？', 'ぐすっ。……ないてない。', 'かんりにんさん、あしたも くる？ テンプ、まってる。'],
};

/** ひとりごと（ときどき、吹き出しで勝手にしゃべる） */
export const MUTTER: Record<ResId, string[]> = {
  v: ['かんりにんさん、いる？', 'るんるん♪', 'カーソル、まてー！', 'ねむく なってきた。', 'ぼくの なまえ、なにに なるかなあ。'],
  h: ['……はあ。', '……異常なし。', '……今日も、変わりなし。', '……あいつら、元気だな。'],
  l: ['任せろ。', 'オレがいちばん背が高い。', '今日も決まってるな、オレ。', '橋？ 任せろ。'],
  u: ['ぐう。', 'むにゃ……', 'すやぁ。', 'あと、ごふん……'],
  w: ['あはは！', 'はしるの、たのしい！', 'おてがみでーす！', 'びゅーん！'],
  m: ['……ふん。', '……むこう、にぎやかだな。', '……べつに。', '……ひとりで いいって、いったのに。'],
  e: ['……。', 'マージ。', '……。'],
  x: ['〔……〕', '〔たちいりきんし〕', '〔……〕'],
  o: ['あっちは なにかな！ こっちは なにかな！', 'ページの はしっこ、みてくる！', 'わくわく！ わくわく！ わくわく！'],
  t: ['ないてないもん。', 'かんりにんさん、いる？', 'ぐすっ。なんでもない。'],
};

/**
 * ふだんの、キャラ同士のかけあい。二人が近くにいると、ときどき吹き出しでやりとりする。
 * when は、解いた問題の数で、そのかけあいが出るかどうか
 */
export interface Banter {
  pair: [ResId, ResId];
  lines: { who: ResId; text: string }[];
  when?: (solvedCount: number) => boolean;
}
export const BANTER: Banter[] = [
  { pair: ['v', 'h'], lines: [{ who: 'v', text: 'ヘッド、あそぼ！' }, { who: 'h', text: '……あとでな。' }] },
  {
    pair: ['v', 'h'],
    lines: [
      { who: 'v', text: 'ヘッド、つかれてない？' },
      { who: 'h', text: '……つかれてない。' },
      { who: 'v', text: 'ほんとに？' },
      { who: 'h', text: '……ほんとだ。' },
    ],
    when: (n) => n >= 1,
  },
  {
    pair: ['h', 'v'],
    lines: [
      { who: 'h', text: '……{v}、そこで寝るな。' },
      { who: 'v', text: 'ねてないよー……' },
    ],
    when: (n) => n >= 3,
  },
  { pair: ['v', 'u'], lines: [{ who: 'v', text: 'アップタイム、となりで ねても いい？' }, { who: 'u', text: 'ぐう。' }], when: (n) => n >= 2 },
  { pair: ['h', 'u'], lines: [{ who: 'h', text: '……起きろ。' }, { who: 'u', text: 'ぐう。' }] },
  {
    pair: ['l', 'v'],
    lines: [
      { who: 'l', text: 'オレについてこい。' },
      { who: 'v', text: 'どこ いくの？' },
      { who: 'l', text: '考えてなかった。' },
    ],
  },
  { pair: ['l', 'h'], lines: [{ who: 'l', text: '任せろ。' }, { who: 'h', text: '……まだ何も頼んでない。' }] },
  { pair: ['w', 'u'], lines: [{ who: 'w', text: 'アップタイム、おきてー！ あはは！' }, { who: 'u', text: 'むにゃ……' }] },
  { pair: ['v', 'x'], lines: [{ who: 'v', text: 'クロス、なんて かいてあるの？' }, { who: 'x', text: '〔たちいりきんし〕' }] },
  { pair: ['v', 'w'], lines: [{ who: 'v', text: 'まてー！' }, { who: 'w', text: 'あはは！ まてないー！' }], when: (n) => n < 3 },
  { pair: ['w', 'v'], lines: [{ who: 'w', text: '{v}、おいかけっこ しよ！' }, { who: 'v', text: 'するー！' }], when: (n) => n >= 3 },
  { pair: ['m', 'e'], lines: [{ who: 'm', text: '……ついてこないでよ。' }, { who: 'e', text: 'えへへ。' }], when: (n) => n >= 4 },
  { pair: ['e', 'm'], lines: [{ who: 'e', text: 'マージ、てがみ よんだ？' }, { who: 'm', text: '……まだ。ぜんぶは。' }], when: (n) => n >= 4 },
  { pair: ['m', 'h'], lines: [{ who: 'm', text: '……ヘッド、あとで はなし きいて。' }, { who: 'h', text: '……ああ。' }], when: (n) => n >= 4 },
  { pair: ['v', 'e'], lines: [{ who: 'v', text: 'エコー、わらってる！' }, { who: 'e', text: 'えへへ。' }], when: (n) => n >= 4 },
  {
    pair: ['o', 'x'],
    lines: [
      { who: 'o', text: 'クロス、その かんばんの むこうって なに？ なに？' },
      { who: 'x', text: '〔だめ〕' },
    ],
    when: (n) => n === 6,
  },
];

/** 書き換えたときの反応（解いたあとの場所） */
/** お堀がなくなったか（border が none・0・hidden） */
export function castleOpen(m: PageModel) {
  const b = (m.get('.castle', 'border') ?? '').trim().toLowerCase();
  return /^0(px)?(\s|$)/.test(b) || /(^|\s)(none|hidden)(\s|$)/.test(b);
}

export function reaction(m: PageModel, selector: string, prop: string, solvedIds: Set<string>): Line[] | null {
  if (selector === '.v' && prop === 'opacity' && solvedIds.has('p1') && num(m.get('.v', 'opacity')) < 0.95)
    return [{ who: 'v', text: 'やだ！ すけちゃう！ もどして！' }];
  if (selector === '.v' && prop === 'color' && solvedIds.has('p1')) {
    const c = m.get('.v', 'color') ?? '';
    return [{ who: 'v', text: c === '#f28cb4' ? 'えへへ、やっぱり ピンクが いちばん！' : 'わあ、ぼく、いろが かわった！' }];
  }
  if (selector === '.roof' && solvedIds.has('p2') && !roofFixed(m)) return [{ who: 'h', text: '……あんた、わざとか。' }];
  // 問題2のとちゅう: 片方だけ直したとき
  if (selector === '.roof' && !solvedIds.has('p2') && m.opened.has('house')) {
    const leftOk = num(m.get('.roof', 'left')) === 0;
    if (prop === 'left' && leftOk) return [{ who: 'v', text: 'ずれは なおった！ あと かたむきも！' }];
    if (prop === 'transform' && !leftOk && tiltOk(m))
      return [{ who: 'v', text: 'まっすぐに なった！ でも まだ みぎに ずれてる！' }];
  }
  // 問題14のとちゅう: ワーカーの「止まれ」を消して、ヘッドに ゆずる
  if (selector === '.w' && prop === 'animation-play-state' && m.opened.has('patrol') && !solvedIds.has('p14') && m.get('.w', 'animation-play-state') === undefined)
    return [{ who: 'w', text: 'やったー！ また はしれる！ ヘッド、ぼくの「とまれ」、つかってね！ あはは！' }];
  // 問題14のあと: ヘッドの「止まれ」を、消したり戻したり
  if (selector === '.h' && prop === 'animation-play-state' && solvedIds.has('p14'))
    return [{ who: 'h', text: '……止めたり動かしたり、忙しいやつだ。……昼間は、どのみち 自分で歩く。' }];
  if (selector === '.w' && prop === 'animation-play-state' && solvedIds.has('p3'))
    return m.get('.w', 'animation-play-state') === 'paused'
      ? [{ who: 'w', text: 'とまった！ あはは！' }]
      : [{ who: 'w', text: 'あはは！ やっぱり はしるのも たのしい！' }];
  // 問題4のとちゅう: お堀を細くしたり、色を変えたりしただけのとき
  if (selector === '.castle' && !solvedIds.has('p4') && m.opened.has('castle'))
    return [{ who: 'w', text: 'おほり、かわった！ でも まだ わたれなーい！' }];
  if (selector === '.castle' && solvedIds.has('p4') && !castleOpen(m))
    return [{ who: 'm', text: '……ちょっと。また とじこめる気？' }];
  // 問題5のとちゅう: アップタイムの z-index を、まだ看板より小さくしかしていないとき
  if (selector === '.u' && !solvedIds.has('p5') && m.opened.has('sign'))
    return [{ who: 'o', text: 'まだ かんばんの うしろだよ！ もっと 大きい かず じゃないと だめかも！ もっと もっと！' }];
  if (selector === '.u' && solvedIds.has('p5') && num(m.get('.u', 'z-index')) <= num(m.get('.sign', 'z-index')))
    return [{ who: 'u', text: 'ん……くらい。ぐう。' }];
  // 問題6: 看板に contenteditable を書き足したら、オーバーフローが「さわってみて」と言う
  if (selector === '.sign' && prop === '@contenteditable' && !solvedIds.has('p6') && m.attr('.sign', 'contenteditable') === 'true')
    return [{ who: 'o', text: 'あっ！ かんばん、さわれる ように なったかも！ かんりにん、かんばんの じを クリック してみて！' }];
  if (selector === '.sign' && prop === '#text' && !laneOpen(m) && !solvedIds.has('p6'))
    return (m.texts.get('.sign') ?? '').trim()
      ? [{ who: 'o', text: 'まだ「たちいりきんし」って かいてあるよ！ それじゃ、はいれないよ！ ちがう じに しなきゃ！' }]
      : [{ who: 'o', text: 'なにも かいてない かんばんじゃ、はいって いいのか わかんないよ！ なにか かいて かいて！' }];
  if (selector === '.sign' && prop === '#text' && !laneOpen(m) && solvedIds.has('p6'))
    return [{ who: 'o', text: 'えー！ また とおれなく なっちゃった！ かんりにん、もどして もどして！' }];
  // 問題7のとちゅう: 線は書いたけれど、細すぎる・見えないとき
  if (selector === '.lane' && !solvedIds.has('p7') && m.opened.has('lane'))
    return [{ who: 'o', text: 'まだ ゆらゆら するよ！ せんが みえないよ！ もっと ちゃんと ひいて！ ふとく ふとく！' }];
  if (selector === '.lane' && solvedIds.has('p7') && !fenceUp(m))
    return [{ who: 'o', text: 'あっ、さくが なくなった！ もう はしっこには いかないけど、もどして もどして！' }];
  // 問題8のとちゅう: 回したけれど、橋になっていないとき
  if (selector === '.l' && !solvedIds.has('p8') && m.opened.has('link')) {
    const a = linkAngle(m);
    if (a === 0) return null;
    if (a === null) return [{ who: 'l', text: '……体が、変な感じだ。回すなら、`rotate` で頼む。' }];
    if (a === 270) return [{ who: 'l', text: '逆だ。谷は、あっちだ。' }];
    if (a === 180) return [{ who: 'l', text: '逆立ちだ。……頭に、血がのぼる。' }];
    return [{ who: 'l', text: 'ななめだ。これは橋じゃない、すべり台だ。' }];
  }
  if (selector === '.l' && solvedIds.has('p8'))
    return bridgeUp(m)
      ? [{ who: 'l', text: 'よし。……橋も、悪くないな。' }]
      : [{ who: 'l', text: 'おい、起こすな。まだ 渡るやつが いるかもしれないだろう。' }];
  // 問題9のとちゅう: v を回したけれど、> になっていないとき
  if (selector === '.v' && prop === 'transform' && !solvedIds.has('p9') && m.opened.has('fork')) {
    const a = turnAngle(m, '.v');
    if (a === 0) return null;
    if (a === null) return [{ who: 'v', text: 'わあ、へんな かんじ！ でも、やじるしには なってない みたい。' }];
    if (a === 90)
      return [
        { who: 'v', text: 'あれ？ はんたい むいちゃった！' },
        { who: 'u', text: 'ぐう……ひだり……' },
        { who: 'h', text: '……そっちは谷だ。逆に回せ。' },
      ];
    if (a === 180) return [{ who: 'v', text: 'さかさま！ あたまに ちが のぼるー！' }];
    return [{ who: 'v', text: 'うーん、まだ ななめ。もっと まよこ！' }];
  }
  if (selector === '.v' && prop === 'transform' && solvedIds.has('p9')) {
    const a = turnAngle(m, '.v');
    if (a === 0) return null;
    return a === 270
      ? [{ who: 'v', text: 'えへへ、やじるし！ でも、くびが こるよー。' }]
      : [{ who: 'v', text: 'わあ、めが まわるー！' }];
  }
  // 問題10: 帯を出したり、隠したり（はじめて出したときの会話は、main.ts の readNotice）
  if (selector === '.ss-notice' && m.opened.has('notice')) {
    const seen = m.flags.has('noticeSeen');
    if (!solvedIds.has('p10') && !seen && !noticeShown(m)) return [{ who: 'h', text: '……まだ、小道の下だ。小道の 1 より、大きい数字にしろ。' }];
    if (!solvedIds.has('p10') && seen && noticeShown(m)) return [{ who: 'h', text: '……そのままじゃ、見つかる。小道より 小さく。' }];
    if (solvedIds.has('p10') && noticeShown(m)) return [{ who: 'h', text: '……おい。あいつらに 見つかる。戻せ。' }];
    return null;
  }
  // 問題11: カードの名前に contenteditable を書き足したら、v が「クリックして」と言う
  if (selector === '.v-name' && prop === '@contenteditable' && !solvedIds.has('p11') && m.attr('.v-name', 'contenteditable') === 'true')
    return [{ who: 'v', text: 'あっ、カードの なまえの ところ、ひかってる！ かんりにんさん、ページの カードの そこを クリックして、なまえを かいて！' }];
  // 問題12: コメントの印を、片方だけ消したとき
  if (prop === '#cut' && (selector === 'tOpen' || selector === 'tClose') && !solvedIds.has('p12'))
    return [{ who: 'v', text: 'テンプの かげが、うっすら みえる！ でも、まだ ねてる！ もう かたほうも、けして！' }];
  // 問題16: 管理人の最後の書きこみを、閉じたとき
  if (selector === '#dclose' && prop === '#text' && !solvedIds.has('p16'))
    return [
      { who: 'me', text: '閉じた。名前は、もう つけたよ。{v}って いうんだ。' },
      { who: 'me', text: 'これで、ことりサーバーに 受けとってもらえる。あとは、橋だ。' },
    ];
  // 問題16: おみやげの石を、消したとき
  if (selector === '#stones' && prop === '#text' && !m.texts.get('#stones') && !solvedIds.has('p16'))
    return [{ who: 'o', text: '……かるく なった。ぼく、へいき。はみだす のは とくい だけど、がまんも できるよ。' }];
  if (selector === 'body' && prop === 'background')
    return [
      { who: 'v', text: 'わあ、そらの いろ かわった！' },
      { who: 'h', text: '……落ち着かん。' },
    ];
  return null;
}
