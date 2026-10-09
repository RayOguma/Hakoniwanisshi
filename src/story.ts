// 試作の中身（はじまり 〜 問題3）。くわしい流れは docs/シナリオ_はじまり〜問題3.md
import type { Area, PageModel } from './model';

export type ResId = 'v' | 'h' | 'w' | 'l' | 'u' | 'm' | 'e' | 'x' | 'o';
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
];

export const resident = (id: Who) => RESIDENTS.find((r) => r.id === id);

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
        '<!-- 2011/06/12',
        '  奥へ続く道を作りかけた。どこへつなぐかは、まだ決めていない。',
        '  端に柵を付けるのを忘れないこと。 -->',
        '<div class="lane"></div>',
      ],
      css: [
        {
          selector: '.lane',
          props: [{ name: 'border-right', value: 'none', options: ['none', '4px solid #5f9a5c', '8px solid #8a6a48'], note: '柵。あとで' }],
        },
      ],
      notice: [{ who: 'me', text: '「忘れないこと」って書いてあるのに、忘れたままなんだな。かわりに、付けてあげよう。' }],
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
  /** この問題の前じたく（ひとつ前の問題が解けたときに、こっそり行う。アップタイムが看板の裏へ、など） */
  readyFx?: string;
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
    ],
  },
  {
    // 幕間B「最初の日」（夜）。ヘッドが、管理人との約束と、v のことを話す。
    // ほんとうは問題9（v が > になって戻る）のあとに置く。問題8・9を作ったら、そのあいだに差しこむ
    id: 'sceneB',
    scene: true,
    owner: 'h',
    prompt: [
      { who: 'h', text: '……起きてたのか。' },
      { who: 'h', text: '……みんな、寝た。v も、アップタイムのとなりで。首が傾いてるだろう。アップタイムの癖が、うつった。' },
      { who: 'h', text: '……毎晩、こうして見回ってる。' },
      { who: 'h', text: '……あいつが最初に打ったのは、わたしだった。`<html>` の、h だ。' },
      { who: 'h', text: '……あいつに、みんなをよろしく、と言われた。……だから、やってる。' },
      { who: 'h', text: '……あんた、カーソルの動かし方が、あいつと ちがうな。' },
      {
        choice: [
          { label: '……そうかな', then: [{ who: 'h', text: '……ああ、ちがう。あいつは、もっと ゆっくり動かした。わたしたちが、目で追えるようにな。' }] },
          { label: 'ひさしぶりだから', then: [{ who: 'h', text: '……そうか。ひさしぶり、だからな。' }] },
        ],
      },
      { who: 'h', text: '……v は、最後に作られた。名前も、まだない。' },
      { who: 'h', text: '……v のことは、頼む。' },
    ],
    hints: {},
    solved: () => true,
    answer: () => {},
    done: [
      { who: 'me', text: '頼む、って。まるで、自分は いなくなるみたいな言い方だ。' },
      { who: 'me', text: 'ヘッドは、ずっと ひとりで、みんなを守ってきたんだな。' },
      { who: 'narr', text: '（試作は、ここまで。）' },
    ],
  },
];

/**
 * 一度だけの会話（種まき）。解いた問題の数が when 以上になってから、はじめてその子に話しかけたときに流れる（ふだんの一言のかわりに）。
 * v の名前・ヘッドと v のこと、など
 */
export interface OnceTalk {
  id: string;
  who: ResId;
  when: number;
  lines: Line[];
}
export const ONCE_TALK: OnceTalk[] = [
  {
    id: 'vName1',
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
    who: 'v',
    when: 6,
    lines: [
      { who: 'v', text: 'なまえ、まだ？ えへへ、いそがなくて いいよ！ ぼく、ずっと まってるから！' },
      { who: 'me', text: '「ずっと待ってる」か。そんなふうに言われると、胸が痛いな。' },
    ],
  },
  {
    id: 'hName',
    who: 'h',
    when: 7,
    lines: [
      { who: 'h', text: '……あんた、v の名前は、考えてるのか。' },
      { who: 'me', text: 'まだ、かな。' },
      { who: 'h', text: '……そうか。……いい名前に、してやれ。' },
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

/** 看板の字から「立入禁止」がなくなって、小道が開いたか（「立入禁止です」のように、ほかの字を足しただけでは開かない） */
export function laneOpen(m: PageModel) {
  const t = (m.texts.get('.sign') ?? '立入禁止').replace(/\s/g, '');
  return t !== '' && !t.includes('立入禁止');
}

/** ふだんの一言（クリックしたとき）。解いた問題の数で変わる */
export const CHATTER: Record<ResId, string[]> = {
  v: ['ぼく、すけてる？', 'みて！ ぼく、ピンク！', 'ヘッドの おうち、なおって よかったね。', 'エコーと マージ、あえたら いいな。', 'エコーと マージ、なかよし！', 'アップタイム、どこ いったんだろう？', 'アップタイム、みつかって よかった！', 'オーバーフロー、だいじょうぶかな！', 'オーバーフロー、もどって これて よかった！', 'ねむれないの。', 'むにゃ……なまえ……', 'むにゃ……かんりにんさん……'],
  h: ['……なんだ。', '……そいつ、うるさくなったな。', '……屋根の礼は、もう言った。', '……堀か。……はあ。', '……あいつら、やっと並んで歩いてるな。', '……どこかで寝てるだけだ。', '……看板のことは、聞くな。', '……だから、行くなと言ったんだ。', '……あいつは、もう少し落ち着け。', '……なんだ。', '……なんだ。', '……早く寝ろ。あんたもだ。'],
  l: ['任せろ。何をだ？', '任せろ。', '屋根はオレが直した。だいたいな。', '堀？ オレが橋になってやってもいいぜ。', '橋は、いらなかったな。次は任せろ。', '任せろ。……どこを探す？', '看板？ オレなら、ひとっ跳びだ。……たぶんな。', '任せろ。……届けばな。', '柵か。オレの次くらいには、頼りになるな。', '任せろ。夜の見張りは……ヘッドの仕事か。', 'オレは寝ない。……寝ないぞ。', 'ぐう。……寝てないぞ。'],
  u: ['ぐう。', 'ぐう。', 'あめ、やんだ……ぐう。', 'ワーカー、しずか……ぐう。', 'みんな、にぎやか……ぐう。', 'ぐう。', 'かんばんの うしろ、あったかい……ぐう。', 'ゆらゆら……ぐう。', 'さく、できた……ぐう。', 'ぐう。', 'ぐう。', 'ぐう。'],
  w: ['あはは！', 'v が ピンク！ あはは！', 'やねー！ あはは！', 'とまるの、たのしい！', 'おてがみ、ぜんぶ わたせた！ あはは！', 'おはよー！ あはは！ きのう、たのしかった！', 'かくれんぼ、おわり！ あはは！', 'あはは……あぶないよー！', 'さく、かっこいい！ あはは！', 'しーっ、みんな ねてる！ あはは……しーっ！', 'しーっ！ あはは……', 'ぐう……あはは……'],
  m: ['……なに。こっち 見ないでよ。', '……べつに、さみしく なんか ないし。', '……屋根、なおったんだ。……ふーん。', '……てがみ？ ……しらない。', '……べつに、エコーと いたいわけじゃ ないし。', '……ゆうべは、ちょっと はしゃぎすぎた。', '……アップタイム、また どこかで 寝てるんじゃない。', '……あの子、ほんとに ばかじゃないの。', '……べつに、心配なんか してなかったし。', '……夜は、しずかで いい。', '……ヘッドも、たまには 寝ればいいのに。', '……ヘッド、あんたも 寝なさいよ。'],
  e: ['あ。おかえりなさい。', '……。', '……。', 'とどいて、なかったんだね。', 'えへへ。マージ、げんき そう。', 'おはよう、マージ。おはよう、かんりにんさん。', 'みんな そろって、うれしいな。', 'オーバーフロー、あぶない。', 'もう、ひとりで いっちゃ だめだよ。', 'おやすみなさい、かんりにんさん。', 'ヘッド、まだ おきてるね。', 'ヘッド、やっと すわった。'],
  x: ['〔……〕', '〔……〕', '〔やね、なおった〕', '〔……〕', '〔おしろ、よかった〕', '〔おはよう〕', '〔アップタイム、おもい〕', '〔あぶない〕', '〔よかった〕', '〔おやすみ〕', '〔……〕', '〔……〕'],
  o: ['なになに？', 'なになに？', 'なになに？', 'なになに？', 'さがしもの、たのしい！ つぎは なに さがす？ ねえ、つぎは？ つぎは なに？ なに さがす？', 'なになに？', 'ねえ、ページの そとって、なにが あるの？ みてみたいなあ！ はしっこの むこう、みてみたい！', 'ゆらゆら する！ たすけて たすけて！', 'そと、まっしろだった！ なんにも なかったよ！ ほんとに なんにも！', 'よるって、まっくら！ わくわくして ねむれない！ ぜんぜん ねむれない！ どうしよう！', 'ねむれなーい！ ねえ、かんりにん、おはなし して！ なんでも いいから！', 'ぐう……はみだして……ないよ……'],
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
      { who: 'h', text: '……v、そこで寝るな。' },
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
  { pair: ['w', 'v'], lines: [{ who: 'w', text: 'v、おいかけっこ しよ！' }, { who: 'v', text: 'するー！' }], when: (n) => n >= 3 },
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
  if (selector === 'body' && prop === 'background')
    return [
      { who: 'v', text: 'わあ、そらの いろ かわった！' },
      { who: 'h', text: '……落ち着かん。' },
    ];
  return null;
}
