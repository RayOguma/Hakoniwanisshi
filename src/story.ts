// 試作の中身（はじまり 〜 問題3）。くわしい流れは docs/シナリオ_はじまり〜問題3.md
import type { Area, PageModel } from './model';

export type ResId = 'v' | 'h' | 'w' | 'l' | 'u';
/** 話し手。me は主人公、narr は地の文 */
export type Who = ResId | 'me' | 'narr';
export interface Choice {
  label: string;
  /** 選んだときだけ流れる会話 */
  then?: Line[];
}
export type Line = { who: Who; text: string; fx?: string } | { choice: Choice[] };

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
}

export const RESIDENTS: Resident[] = [
  { id: 'h', face: '-h-', name: 'ヘッド', color: '#a9b8c8', hair: '#6a7a8c', speed: 38 },
  { id: 'v', face: '・v・', name: '', color: '#f28cb4', hair: '#d8668e', speed: 80, follows: true },
  { id: 'l', face: '・l・', name: 'リンク', color: '#8fd0aa', hair: '#4f9a72', speed: 55 },
  { id: 'u', face: '-u-', name: 'アップタイム', color: '#c4b6e8', hair: '#8a78c0', speed: 28 },
  { id: 'w', face: '・w・', name: 'ワーカー', color: '#f4cc7c', hair: '#d09a38', speed: 0 },
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
        '  作ったそばからため息をついた。先が思いやられる、だって。こっちのせりふだよ。 -->',
        '<div class="house">',
        '  <div class="roof"></div>',
        '  <div class="h">-h-</div>',
        '</div>',
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
      css: [
        {
          selector: '.w',
          allowAdd: true,
          props: [{ name: 'animation', value: 'run 14s linear infinite', locked: true, note: '止める処理を書き忘れた。まあいい、楽しそうだし' }],
        },
      ],
    },
  ];
}

// ---- はじまり（検索エンジン → 箱庭日誌） ----

export const NET_START: Line[] = [
  { who: 'me', text: 'さてと。今日も、ネットの海でも探検しますか〜。' },
];
export const NET_LATER: Line[] = [
  { who: 'me', text: '……うーん。今日は、これといって面白いものがないなあ。' },
  { who: 'me', text: 'もうちょっと、古くて、変なページとか……。' },
];
export const NET_FOUND: Line[] = [
  { who: 'me', text: '……「箱庭日誌」？ 最終更新、2012年……。' },
  { who: 'me', text: 'なんだこれ。……ちょっと、気になるな。' },
];

export const INTRO: Line[] = [
  { who: 'narr', text: '（ページの中を、小さな立方体たちが歩きまわっている。）' },
  { who: 'me', text: 'なにこれ……。かわいい……？' },
  { who: 'v', text: '…………あ。' },
  { who: 'v', text: 'あっ！ カーソル！ かんりにんさん？ かんりにんさんだ！' },
  { who: 'v', text: 'おかえりなさい！ ねえ、ひさしぶりだね！' },
  { who: 'me', text: '（……かんりにんさん？ もしかして、こっちのこと……？）' },
  { choice: [{ label: 'ただいま' }, { label: '……ただいま' }] },
  { who: 'w', text: 'ほんとだ！ かんりにんだ！ あはは！ おかえりー！' },
  { who: 'l', text: 'おう、帰ったか。……待ってたぜ。まあ、オレは別に待ってなかったけどな。' },
  { who: 'u', text: '……ん……おかえり……。……ぐう。' },
  { who: 'h', text: '…………おかえり。' },
  { who: 'h', text: '……はあ。ずいぶん、遅かったな。' },
  { who: 'v', text: 'ねえ、かんりにんさん。むかしみたいに、カーソルで ぼくを つんつん してみて！' },
  { who: 'v', text: 'つんつん されたら、ぼく、おはなし するよ！ みんなも そうだよ！' },
];

export interface Problem {
  id: string;
  /** 「!」を出して、話しかけると始まる子 */
  owner: ResId;
  /** この問題を始めると、ソースが開く場所 */
  opens: string;
  prompt: Line[];
  /** 問題のあいだに話しかけたときのヒント（住人ごと） */
  hints: Partial<Record<ResId, Line[]>>;
  solved: (m: PageModel) => boolean;
  done: Line[];
  /** 解説ページの、この問題の項目 */
  guide: string;
  /** 解けたときの演出 */
  doneFx?: string;
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
      { who: 'v', text: 'みんなは ちゃんと いろが あるのに。……ぼくだけ、すけてるの。' },
      { who: 'w', text: 'v は すけすけー！ あはは！' },
      { who: 'v', text: 'すけすけじゃ ないもん！ ……ね、かんりにんさん、なおして くれる？' },
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
              { who: 'me', text: '（……そう言われても。……でも、ちょっとかわいそうかも。）' },
              { who: 'v', text: 'おねがい、かんりにんさん……。' },
            ],
          },
        ],
      },
      { who: 'v', text: 'かんりにんさん、いつも うえの「ソースを見る」を ひらいて、なおしてたよね！' },
      { who: 'v', text: 'ぼくの ところも、きっと そこに かいてあるよ！' },
    ],
    hints: {
      v: [{ who: 'v', text: 'うえの「ソースを見る」だよ！ ぼくの ところに、「すけかた」みたいなのが かいてない？' }],
      l: [{ who: 'l', text: '任せろ。透けてるなら、上から色を塗ればいい。……塗るって、どうやるんだ？' }],
      u: [{ who: 'u', text: '……おぱしてぃ……いち……ぐう。' }],
      w: [{ who: 'w', text: 'すけすけー！ あはは！ ……なおしてあげて！' }],
      h: [{ who: 'h', text: '……`opacity` だ。透け具合の値。1 で、透けなくなる。' }],
    },
    solved: (m) => num(m.get('.v', 'opacity')) >= 0.95,
    done: [
      { who: 'v', text: 'わあ……！ ぼく、いろ ついた！ みて、みて！' },
      { who: 'w', text: 'v が ピンクだ！ あはは！' },
      { who: 'h', text: '……よかったな。' },
      { who: 'v', text: 'かんりにんさん、ありがとう！ やっぱり かんりにんさんだ！' },
    ],
  },
  {
    id: 'p2',
    owner: 'h',
    opens: 'house',
    guide: 'position',
    prompt: [
      { who: 'v', text: 'あっ、ヘッドの おうち、やねが ずれてる！' },
      { who: 'h', text: '……もう、ずっとだ。いいんだ、べつに。' },
      { who: 'l', text: '任せろ！ オレが支えてやる！' },
      { who: 'narr', text: '（リンクが屋根に手をかけて、持ち上げようとした……。）', fx: 'linkRoof' },
      { who: 'l', text: '……おっと。……まあ、こういうこともある。' },
      { who: 'h', text: '……はあ。' },
      { who: 'u', text: '……ん……つめたい……。……ぐう。' },
      { who: 'v', text: 'アップタイムが ぬれちゃう！ かんりにんさん、やね もどして！' },
    ],
    hints: {
      v: [{ who: 'v', text: 'やねが みぎに ずれてるし、リンクのせいで かたむいちゃった！ どっちも もどさなきゃ！' }],
      l: [{ who: 'l', text: '任せろ……いや、傾けたのはオレか。`transform` とかいうやつで、回っちまったらしい。' }],
      u: [{ who: 'u', text: '……ひだり……ぜろ……まっすぐ……ぐう。' }],
      w: [{ who: 'w', text: 'あめー！ あはは！ ……つめたいの？' }],
      h: [{ who: 'h', text: '……屋根の `left` がずれてるのと、`transform` で傾いてる。left は 0、transform は none だ。' }],
    },
    solved: (m) => roofFixed(m),
    doneFx: 'roofFixed',
    done: [
      { who: 'u', text: '……あめ、やんだ……。……ぐう。' },
      { who: 'l', text: 'な？ オレのおかげだろ。' },
      { who: 'v', text: 'ちがうよ！ リンクは かたむけただけだよ！ なおしたのは かんりにんさん！' },
      { who: 'h', text: '……ふん。……まあ、助かった。' },
      { who: 'h', text: '……器用なもんだな、あんた。' },
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
      { who: 'v', text: '……かんりにんさん、ワーカー とめて！' },
      { who: 'h', text: '……ワーカーのところは、行を書き足せたはずだ。あんたが、そう作った。' },
    ],
    hints: {
      v: [{ who: 'v', text: 'とまって、って かくんだよ、きっと！' }],
      l: [{ who: 'l', text: '任せろ。止まらないなら、もっと速く走らせればいい。そのうち疲れて止まる。' }],
      u: [{ who: 'u', text: '……とまるのは……ポーズ……ぐう。' }],
      w: [{ who: 'w', text: 'とまりかた、おしえてー！ あはは！' }],
      h: [{ who: 'h', text: '……`animation-play-state` だ。……止めるなら、`paused`。' }],
    },
    solved: (m) => m.get('.w', 'animation-play-state') === 'paused',
    doneFx: 'river',
    done: [
      { who: 'w', text: '……とまった！ あはは、とまれた！ とまるって、たのしいね！' },
      { who: 'v', text: 'おてがみ！ おてがみ！' },
      { who: 'w', text: 'はい！ ……あれ、これ、v のじゃないや。エコーから、マージへの おてがみだ。' },
      { who: 'v', text: 'マージ？ マージって、川の むこうの？' },
      { who: 'w', text: 'そう！ ずっと わたそうとしてたんだけど、川が あって、むこうに いけないの。だから ずっと はしってた！' },
      { who: 'v', text: '……エコーと マージ、ずっと あえてないの？' },
      { who: 'w', text: 'うん。おてがみだけ。ぼくが いるから、だいじょうぶ！ あはは！' },
      { who: 'narr', text: '（ページの「準備中」が、ひとつ外れた。……試作は、ここまで。）' },
    ],
  },
];

/** ふだんの一言（クリックしたとき）。解いた問題の数（0〜3）で変わる */
export const CHATTER: Record<ResId, string[]> = {
  v: ['ぼく、すけてる？', 'みて！ ぼく、ピンク！', 'ヘッドの おうち、なおって よかったね。', 'エコーと マージ、あえたら いいな。'],
  h: ['……なんだ。', '……そいつ、うるさくなったな。', '……屋根の礼は、もう言った。', '……川か。……はあ。'],
  l: ['任せろ。……何をだ？', '任せろ。', '屋根はオレが直した。だいたいな。', '川？ オレが橋になってやってもいいぜ。'],
  u: ['……ぐう。', '……ぐう。', '……あめ、やんだ……ぐう。', '……ワーカー、しずか……ぐう。'],
  w: ['あはは！', 'v が ピンク！ あはは！', 'やねー！ あはは！', 'とまるの、たのしい！'],
};

/** ひとりごと（ときどき、吹き出しで勝手にしゃべる） */
export const MUTTER: Record<ResId, string[]> = {
  v: ['かんりにんさん、いる？', 'るんるん♪', 'カーソル、まてー！', 'ねむく なってきた……'],
  h: ['……はあ。', '……異常なし。', '……今日も、変わりなし。', '……あいつら、元気だな。'],
  l: ['任せろ。', 'オレがいちばん背が高い。', '……今日も決まってるな、オレ。', '橋？ 任せろ。'],
  u: ['……ぐう。', '……むにゃ……', '……すやぁ……', '……あと……ごふん……'],
  w: ['あはは！', 'はしるの、たのしい！', 'おてがみでーす！', 'びゅーん！'],
};

/** 書き換えたときの反応（解いたあとの場所） */
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
  if (selector === 'body' && prop === 'background')
    return [
      { who: 'v', text: 'わあ、そらの いろ かわった！' },
      { who: 'h', text: '……落ち着かん。' },
    ];
  return null;
}
