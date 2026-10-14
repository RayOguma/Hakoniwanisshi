// 試作: はじまり 〜 問題3。
// 検索エンジンで「箱庭日誌」を見つける → 住人たちに「おかえり」と迎えられる → ページの CSS を書き換えて直していく
import './style.css';
import { Dialog } from './dialog';
import { Menu } from './menu';
import { applySettings } from './settings';
import { CafeView, KotoriView, TakaoView } from './links';
import { CAPACITY, PageModel, type ModelSave } from './model';
import { Page } from './page';
import { SourcePanel } from './source';
import { BANTER, CHATTER, daysLeft, HOME_TELL, INTRO, KOTORI_FOUND, KOTORI_OVER, NAME_ASK, nameTrouble, TOKENS, makeAreas, MUTTER, NET_FOUND, NET_LATER, NET_START, NOTICE_BACK, NOTICE_NEWS, NOTICE_READ, NOTICE_READ_KNOWN, noticeShown, ONCE_TALK, PROBLEMS, reaction, RESIDENTS, KOTORI_AGAIN, KOTORI_CHECK, TO_VALLEY, WORKER_OFFER, LINK_JOKE, P16_SHORT, P16_STONES, P16_STONES_AGAIN, P16_UNCLOSED, P17_OTHER, P17_SHORT, STAY_ASK, STAY_H, STAY_V, STAYER_STILL, stayer, CAFE_FIRST, SERVER_AFTER, SERVER_FIRST, TAKAO_FIRST, type Line, type Problem, type ResId } from './story';
import { GuideView, RESULTS_CSS, RESULTS_FIRST, RESULTS_OLD, RESULTS_HOME, RESULTS_SERVER, SearchView, ServerView, yourTurn } from './web';

const model = new PageModel(makeAreas());
const solved = new Set<string>();
let current = 0; // いまの問題（PROBLEMS の番号）
let started = false; // いまの問題を、話しかけて始めたか
let introDone = false;
let guideFound = false; // 主人公が、解説サイトを見つけたか
/** はじめて住人に話しかけるまで出す、カーソルの合図を止める関数 */
let stopFirstTouch: (() => void) | null = null;
/** はじめて「ソースを見る」を押すまで出す、カーソルの合図を止める関数 */
let stopSourceHint: (() => void) | null = null;
const noticed = new Set<string>(); // 主人公が、日記を読んでひとこと言った場所
/** 看板を打ち換えられるようになったとき、看板に出すカーソルの合図を止める関数 */
let stopSignHint: (() => void) | null = null;
/** v のカードの名前を打てるようになったとき、名前の欄に出すカーソルの合図を止める関数 */
let stopNameHint: (() => void) | null = null;
let skipping = false; // 開発用: 途中から始めるために、前の問題を解いた形にしているところ
const onceDone = new Set<string>(); // もう流した、一度だけの会話（ONCE_TALK）

/** 暗転して行う演出と、そのとき出す字 */
const FADES: Record<string, string> = { nextDay: '― 次の日 ―', nextDay3: '― 次の日 ―', thatNight: '― その夜 ―', dawn4: '― 朝 ―', nextDay5: '― 次の日 ―', night5: '― その夜 ―', nextDay6: '― 次の日 ―', night6: '― その夜 ―', nextDay7: '― 次の日 ―', moved: '― 引っ越し ―', theEnd: '― おわり ―' };

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const toastEl = $('toast');
let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  // 長い知らせは、読めるだけの時間、出しておく
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), Math.max(2600, msg.length * 110));
}

// 検索結果の「さくさくサーバー」は、そのページを開ける
const search = new SearchView($('view-search'), (id) => {
  if (id === 'server') void openServer();
});
new ServerView($('view-server'));
new TakaoView($('view-takao'));
new CafeView($('view-cafe'));
const kotori = new KotoriView($('view-kotori'));

/** 主人公が、検索して引っ越し先を探しているところ（そのあいだは、住人に話しかけても、問題は始まらない） */
let flowBusy = false;
/** ことりサーバーで、はかり直しているところ（アドレスを打って、ボタンを押すまで、結果は出さない） */
let measuring = false;
/** 容量メーターが出るとき、はじめに はみ出している字数の、帯のほかの分（帯を消すと、あと LEFT_AFTER 字で入る） */
const LEFT_AFTER = 9;
model.onFull = (what) => {
  toast('容量が 足りないみたい。この書き換えは、引っ越し先に 入らない');
  // 欄に打った字を、受けつけられる前の値に戻す
  source.render();
  void workerOffers();
  if (what === '.l') void bridgeShort();
  if (what === '.l') void bridgeEarly();
};

/** 問題17: まだ、だれが残るか決めていないのに、橋をかけようとしたとき */
async function bridgeEarly() {
  if (PROBLEMS[current]?.id !== 'p17' || !started || stayer(model)) return;
  await sleep(700);
  while (dialog.busy) await sleep(200);
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  await play(P17_SHORT);
  reopen();
  source.reveal('end');
}

/**
 * 問題17: </html> の字を、1つ消したとき。h か > なら、その子が、ページの終わりまで歩いて、一度だけ確かめる。
 * 「……うん」で決まる（戻せない）。1字空くので、あとは、リンクを倒して橋をかける。ほかの字なら、元に戻る
 */
async function pickLetter() {
  const cur = model.texts.get('#close');
  const who = cur === '</tml>' ? 'h' : cur === '</html' ? 'v' : null;
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  if (!who) {
    model.texts.set('#close', '</html>');
    refreshTokens();
    await play(P17_OTHER);
  } else {
    await play(STAY_ASK[who]);
    if (stayer(model)) {
      refreshMark();
      await play(who === 'h' ? STAY_H : STAY_V);
      // 橋をかけるので、ソースを開く
      setSourceOpen(true);
      source.render();
      source.reveal('link');
      return;
    }
  }
  reopen();
  source.render();
  source.reveal('end');
}

/**
 * 問題16: 橋をかけようとして（リンクを倒そうとして）、字が足りなかったとき。進みぐあいで、起きることが変わる。
 * ①最後の書きこみを、まだ閉じていない → 先に閉じるよう言われる ②石が残っている → オーバーフローが、石を置いていくと言う（石を消せるようになる）
 * ③石もない → あと1文字。だれも、なにも言えなくなる（ここで、問題16が解けたことになり、ヘッドと v が前に出る）
 */
async function bridgeShort() {
  if (PROBLEMS[current]?.id !== 'p16' || !started || model.flags.has('p16b')) return;
  await sleep(700);
  while (dialog.busy) await sleep(200);
  const closed = model.texts.get('#dclose') === '-->';
  const stones = !!model.texts.get('#stones');
  const lines = !closed ? P16_UNCLOSED : stones ? (model.flags.has('p16a') ? P16_STONES_AGAIN : P16_STONES) : P16_SHORT;
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  await play(lines);
  if (lines === P16_STONES) {
    model.flags.add('p16a');
    model.attrSlots.add('stonesFree');
  }
  if (lines === P16_SHORT) {
    model.flags.add('p16b');
    await trySolve();
    return;
  }
  reopen();
  source.render();
  if (lines !== P16_UNCLOSED) source.reveal('end');
}

/** 問題14: 容量が足りなくて、ヘッドに「止まれ」を書き足せなかったら、ワーカーが、自分の「止まれ」を ゆずると言う（1回だけ） */
async function workerOffers() {
  if (PROBLEMS[current]?.id !== 'p14' || !started || model.flags.has('wOffered')) return;
  // ゆずる行が、もう ないときは、言わない
  if (model.get('.w', 'animation-play-state') === undefined) return;
  model.flags.add('wOffered');
  await sleep(900);
  while (dialog.busy) await sleep(200);
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  await play(WORKER_OFFER);
  reopen();
  source.reveal('road');
}
const guide = new GuideView($('view-guide'));
const source = new SourcePanel($('source'), model, toast);
let page: Page | null = null;
const dialog = new Dialog(
  $('dialog'),
  (who, far, text) => {
    const res = !!who && RESIDENTS.some((r) => r.id === who);
    page?.setTalking(res ? [who!] : []);
    // クロスは、しゃべるかわりに、頭の上に札をひょこっと出す
    if (who === 'x' && text) page?.holdBoard('x', text);
    // しゃべる子のところへ送って、少し寄る（主人公や地の文、遠くから聞こえる声のときは、そのまま）
    if (res && !far) page?.focus(who!);
  },
  async (fx) => {
    // 「guide:記事:段落,段落」は、解説サイトの、そこを枠で囲む（ページの演出ではない）
    // 「source:場所」は、ソースのパネルを、その場所まで送る（日記を読みながら、その日記を見せる）
    if (fx.startsWith('source:')) {
      source.reveal(fx.slice('source:'.length));
      await sleep(500);
      return;
    }
    if (fx.startsWith('guide:')) {
      const [, id, paras] = fx.split(':');
      guide.mark(id === 'none' ? null : id, paras ? paras.split(',').map(Number) : [1]);
      return;
    }
    page?.focus(null);
    // 「次の日」「その夜」は、暗転して字を出し、暗いあいだに朝（夜）にする
    if (FADES[fx]) {
      // 日が変わったら、「あと○日」も、暗いあいだに変える
      await fade(FADES[fx], async () => {
        await page?.fx(fx);
        refreshTokens();
      });
      return;
    }
    // ページの演出ではないもの（荷物に石を詰める、リンクが字のかわりに立つ）
    if (mainFx(fx)) {
      // ページの演出も、あるもの
      if (['linkLetter', 'doorUp', 'stayNo', 'vTurns'].includes(fx)) await page?.fx(fx);
      return;
    }
    // v の名前が決まった（確かめの選択肢で「うん」を選んだ）
    if (fx === 'nameYes') {
      model.flags.add('vNamed');
      refreshTokens();
      page?.applyCss();
      source.render();
      return;
    }
    await page?.fx(fx);
  },
  // 暗転する演出は、その行の字を読んでから
  (fx) => !!FADES[fx],
);

/**
 * 進みぐあいで変わる字を、いまの値にする: v の名前（会話の窓の名前・せりふの {v}）と、
 * サービス終了まで あと何日か（せりふの {days}・帯・さくさくサーバーのページ・画面の上の表示）
 */
function refreshTokens() {
  const name = model.flags.has('vNamed') ? (model.texts.get('.v-name') ?? '').trim() : '';
  TOKENS.v = name || 'v';
  RESIDENTS.find((r) => r.id === 'v')!.name = name;
  const days = daysLeft(solved);
  TOKENS.days = String(days);
  for (const el of document.querySelectorAll('.days-left')) el.textContent = String(days);
  page?.setDays(days);
  // 画面の上の「あと○日」は、終わることを知ってから出す
  // 引っ越しが済んだら、もう 出さない
  const moved = model.flags.has('moved');
  $('days-chip').hidden = moved || !(model.flags.has('serverSeen') || model.flags.has('noticeSeen'));
  // 引っ越しが済んだら、箱庭日誌のアドレスは、ことりサーバー
  ADDRESS.site = moved ? 'https://kotori-server.example.net/hakoniwa/' : OLD_ADDRESS;
  if (document.querySelector('.tab.active')?.getAttribute('data-tab') === 'site') $('address').textContent = ADDRESS.site;
  // 容量メーター: はみ出している字数と、あと何字 入るか
  const over = model.size() - CAPACITY;
  TOKENS.over = String(Math.max(0, over));
  TOKENS.left = String(Math.max(0, -over));
  // ことりサーバーで はかった結果も、いまの大きさに
  if (model.flags.has('meter') && !measuring)
    kotori.showResult(
      model.size(),
      CAPACITY,
      // 字のかわりに、だれかが立っていても、閉じてある
      model.texts.get('#close') === '</html>' || !!stayer(model),
      // 管理人の最後の書きこみが見つかってからは、それを閉じるまで、受けとってもらえない
      model.flags.has('lastFound') && model.texts.get('#dclose') !== '-->',
    );
}

/**
 * 会話の中の演出のうち、ページではなく、ソースの中身を変えるもの。あてはまれば true。
 * stones: オーバーフローが、おみやげの石を、荷物に ぎりぎりまで詰める（</html> の7字に、1字足りなくなる）。
 * linkLetter: リンクが橋をやめて立ち、足りない l のかわりになる（ソースの最後が </htm・l・> になる）
 */
function mainFx(fx: string): boolean {
  if (fx === 'stones') {
    // 容量メーターが出てから（引っ越しの荷物の話なので）
    if (model.flags.has('meter') && !model.texts.has('#stones')) {
      const n = CAPACITY - model.size() - 6;
      model.texts.set('#stones', n >= 6 ? 'おみやげの' + '石'.repeat(n - 5) : '石'.repeat(Math.max(0, n)));
      refreshTokens();
      source.render();
    }
    return true;
  }
  if (fx === 'pack') {
    // オーバーフローが、荷物をひもでくくる。これからは、リンクと、ページの終わりの物しか、書き換えられない
    model.flags.add('packed');
    page?.applyCss();
    source.render();
    return true;
  }
  if (fx === 'doorUp') {
    // 引っ越し用のリンクを、ページのいちばん下に はる。ソースにも、その場所が開く
    model.flags.add('door');
    model.opened.add('door');
    page?.applyCss();
    source.render();
    return true;
  }
  if (fx === 'stayH' || fx === 'stayV') {
    // 問題17: だれが残るか、決まった（もう、戻せない）
    model.flags.add(fx);
    refreshTokens();
    page?.applyCss();
    source.render();
    return true;
  }
  if (fx === 'stayNo') {
    // 問題17:「待って」。消した字が、戻る
    model.texts.set('#close', '</html>');
    refreshTokens();
    source.render();
    return true;
  }
  if (fx === 'vTurns') {
    // 問題17: v が横を向いて、> になる（ソースの顔も ・>・ に）
    model.flags.add('vTurned');
    page?.applyCss();
    source.render();
    return true;
  }
  if (fx === 'linkLetter') {
    model.set('.l', 'transform', 'none');
    model.texts.set('#close', '</htm>');
    model.flags.add('lLetter');
    refreshTokens();
    page?.applyCss();
    source.render();
    return true;
  }
  return false;
}

/** 問題15: </html> が、1文字足りなくて入らなかったとき。リンクが、足りない l になろうとする（1回だけ） */
async function linkJoke() {
  if (model.flags.has('lJoke')) return;
  model.flags.add('lJoke');
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  await play(LINK_JOKE);
  reopen();
  source.reveal('end');
}

/** 容量メーターを出す。はじめは、「差しこまれた帯」を消すと、あと LEFT_AFTER 字で入る大きさにする */
function meterOn() {
  const band = model.areas.find((a) => a.id === 'notice')!;
  model.meterOn(model.areaSize(band) - LEFT_AFTER);
  refreshTokens();
  source.render();
}

/** ことりサーバーで、主人公が 箱庭日誌のアドレスを打ち、プレイヤーが「大きさを はかる」を押す */
async function measureAtKotori() {
  await kotori.typeAddress(ADDRESS.site);
  // 「大きさを はかる」は、プレイヤーが押す
  const btn = kotori.measureButton();
  btn.classList.add('glow');
  const stop = yourTurn(btn);
  await new Promise<void>((done) => btn.addEventListener('click', () => done(), { once: true }));
  btn.classList.remove('glow');
  stop();
  await sleep(600);
}

/**
 * 問題12のあと: 主人公が検索して、引っ越し先（ことりサーバー）を見つけ、ページの大きさを はかる。
 * はみ出していると分かって、容量メーターが出る。箱庭日誌に戻って、みんなに「引っ越そう」と伝える
 */
async function findHome() {
  await waitTab('search');
  await search.search('ホームページ 引っ越し 無料', RESULTS_HOME);
  // 引っ越し先は、プレイヤーが自分でクリックする
  await search.waitClick('kotori');
  model.flags.add('kotoriSeen');
  showTab('kotori');
  $('view-kotori').scrollTop = 0;
  await sleep(700);
  await play(KOTORI_FOUND);
  await measureAtKotori();
  meterOn();
  await sleep(900);
  await play(KOTORI_OVER);
  await waitTab('site');
  await play(HOME_TELL);
}

async function play(lines: Line[]) {
  await dialog.play(lines);
  page?.focus(null);
}

// ---- タブ ----
const OLD_ADDRESS = 'http://www.example.ne.jp/~hakoniwa/index.html';
const ADDRESS: Record<string, string> = {
  search: 'https://www.sagasu.example/',
  site: OLD_ADDRESS,
  guide: 'https://yasashii-html.example.com/css/',
  server: 'http://www.example.ne.jp/',
  takao: 'http://www.takao-guide.example.jp/',
  // 喫茶ポプラも、箱庭日誌と同じ さくさくサーバーに置いてある
  cafe: 'http://www.example.ne.jp/~popura/',
  kotori: 'https://kotori-server.example.net/',
};
function showTab(name: string) {
  const tab = document.querySelector<HTMLButtonElement>(`.tab[data-tab="${name}"]`)!;
  tab.hidden = false;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  $('address').textContent = ADDRESS[name];
  $('btn-source').classList.toggle('dim', name !== 'site');
}
for (const tab of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  tab.addEventListener('click', () => {
    if (!dialog.busy) showTab(tab.dataset.tab!);
  });
}

/**
 * さくさくサーバーのページを開く（箱庭日誌の「リンク」か、検索結果から）。
 * はじめて開いたときは、主人公が、サービス終了のお知らせを読む。帯を見る前に読むと、先に、終わることを知る
 */
const openServer = () => openExtra('server');

/** 箱庭日誌の「リンク」から開けるページと、はじめて開いたときの主人公の声（開いたかどうかは、model.flags に「名前Seen」で覚える） */
const EXTRA: Record<string, () => Line[]> = {
  server: () => (model.flags.has('noticeSeen') || (PROBLEMS[current]?.id === 'p10' && started) ? SERVER_AFTER : SERVER_FIRST),
  // ことりサーバーは、主人公が検索して見つける（findHome）。ここは、タブを出し直すためだけ
  kotori: () => [],
  takao: () => TAKAO_FIRST,
  cafe: () => CAFE_FIRST(model.flags.has('serverSeen') || model.flags.has('noticeSeen')),
};

async function openExtra(name: string) {
  if (dialog.busy) return;
  showTab(name);
  if (model.flags.has(`${name}Seen`)) return;
  // 声は、開く前に決める（さくさくサーバーを、いま はじめて開いたかどうかで変わるので）
  const lines = EXTRA[name]();
  model.flags.add(`${name}Seen`);
  refreshTokens();
  $(`view-${name}`).scrollTop = 0;
  await sleep(700);
  await play(lines);
}

/**
 * 引っ越しの朝（夜6のあと）: 出発の前に、主人公が、ことりサーバーのページを見直す。
 * 「閉じていない コメントが あります」と出ている（管理人の最後の書きこみ。問題16で、ソースに開く）。箱庭日誌に戻って、みんなで谷へ
 */
async function checkKotori() {
  // ここから、ことりサーバーは、閉じていないコメントのことを言う
  model.flags.add('lastFound');
  // 前に はかった結果は消して、アドレスを打つ所から、はかり直す
  measuring = true;
  kotori.clear();
  await waitTab('kotori');
  $('view-kotori').scrollTop = 0;
  await sleep(700);
  await play(KOTORI_AGAIN);
  await measureAtKotori();
  measuring = false;
  // 結果を出す（いちばん下。会話の窓に隠れない所まで、送られる）
  refreshTokens();
  await sleep(1300);
  await play(KOTORI_CHECK);
  await waitTab('site');
  await play(TO_VALLEY);
}

/** 箱庭日誌の下の「リンク」を、クリックしたとき */
function openLink(title: string) {
  if (dialog.busy || !introDone || flowBusy) return;
  if (title === 'さくさくサーバー') void openServer();
  else if (title === '高尾山 登山ガイド') void openExtra('takao');
  else if (title === '喫茶ポプラ') void openExtra('cafe');
  else if (guideFound) showTab('guide');
  else toast('このページは、あとで 見てみよう');
}

/** 暗転して、字を出す。whileDark は、暗いあいだに行うこと（朝にする、など） */
async function fade(text: string, whileDark?: () => Promise<void> | undefined) {
  const f = $('fade');
  $('fade-text').textContent = text;
  f.classList.add('on');
  await sleep(1300);
  await whileDark?.();
  await sleep(1300);
  f.classList.remove('on');
  await sleep(900);
}

// ---- ソース ----
function openArea(id: string) {
  model.opened.add(id);
  source.render();
  if (!$('source').hidden) source.reveal(id);
}

/** CSS の決まりに、行を書き足せるようにする。その決まりのある場所は、ソースのいちばん上へ出す */
function unlockAdd(selector: string) {
  const r = model.rule(selector);
  if (!r) return;
  r.allowAdd = true;
  const a = model.areas.find((x) => x.css.includes(r));
  if (a && model.opened.delete(a.id)) model.opened.add(a.id);
}

function setSourceOpen(open: boolean) {
  $('source').hidden = !open;
  $('btn-source').classList.toggle('on', open);
}

$('btn-source').addEventListener('click', () => {
  // 会話のあいだは開け閉めしない（ページの幅が変わって、住人の位置がずれるので）
  if (dialog.busy) return;
  $('btn-source').classList.remove('glow');
  stopSourceHint?.();
  stopSourceHint = null;
  document.getElementById('op-hint')?.remove();
  showTab('site');
  setSourceOpen($('source').hidden === true);
  if (!$('source').hidden) {
    source.render();
    void maybeLookUp();
    void maybeNotice();
  }
});

// S キーでも、ソースを開け閉めできる（字を打っているときは別。日本語入力中でも効くよう、key ではなく code で見る）
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyS' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const target = e.composedPath()[0] as HTMLElement;
  if (target?.isContentEditable || target?.closest?.('input, textarea')) return;
  if ($('btn-source').hidden) return;
  e.preventDefault();
  $('btn-source').click();
});

/** はじめてソースを開く番に、画面の下に出す案内（S キーを押す絵 ／ クリックする絵） */
function showOpHint() {
  const hint = Object.assign(document.createElement('div'), { id: 'op-hint' });
  hint.innerHTML = `
    <div class="oh-item"><span class="oh-key">S</span><span>キーを押す</span></div>
    <span class="oh-or">または</span>
    <div class="oh-item"><span class="oh-click"><i class="oh-hand"></i><i class="oh-ripple"></i></span><span>「ソースを見る」をクリック</span></div>`;
  document.body.append(hint);
}

/**
 * 会話は、ソースを閉じて、ページを元の幅に戻してから流す（住人の位置と、ページの位置がずれないように）。
 * 会話が終わったら呼ぶ関数を返す（開いていたなら、開き直す）
 */
async function closeSourceForTalk(): Promise<() => void> {
  if ($('source').hidden) return () => {};
  setSourceOpen(false);
  await sleep(450);
  return () => {
    setSourceOpen(true);
    source.render();
  };
}

/** ソースで、はじめて見た場所の日記について、主人公が思うこと（場所ごとに1回だけ） */
async function maybeNotice() {
  if ($('source').hidden) return;
  const areas = model.areas.filter((a) => a.notice && model.opened.has(a.id) && !noticed.has(a.id));
  if (!areas.length) return;
  for (const a of areas) noticed.add(a.id);
  await sleep(900);
  // まだ聞いていない場所が2つ以上あれば、順に流す
  for (const a of areas) {
    while (dialog.busy) await sleep(300);
    source.reveal(a.id);
    await play(a.notice!);
  }
}

/** はじめてソースを開いたとき、主人公が検索して、解説サイトを見つける */
async function maybeLookUp() {
  if (guideFound || !started || current !== 0) return;
  guideFound = true;
  await sleep(1400);
  while (dialog.busy) await sleep(300);
  // 調べる前に、もう直してしまったときは、調べない
  if (solved.has(PROBLEMS[0].id)) return;
  await play([
    { who: 'me', text: 'うわ、なんだこれ。英語と記号が、ずらーっと並んでる。' },
    { who: 'me', text: '「HTML」？ なんだこれ、さっぱり わからないな。' },
    { who: 'me', text: 'とりあえず、「透けてる」のを直す方法を、調べてみるか。' },
  ]);
  showTab('search');
  await search.search('ホームページ 透けてる 直し方', RESULTS_CSS);
  // 検索結果は、プレイヤーが自分でクリックする
  await search.waitClick('guide');
  showTab('guide');
  // サイトは、いちばん上の「CSS の書き方の基本」から読む。そのあと、下に opacity を見つける
  guide.show('basics');
  await sleep(600);
  // 読んでいる所を、せりふごとに、黄色い枠で囲む
  await play([
    { who: 'me', text: 'なるほど。ホームページの見た目は、「CSS」っていうので決めてるのか。', fx: 'guide:basics:1' },
    { who: 'me', text: '書き方は「名前: 値;」。名前と値は「:」で区切って、最後に「;」。', fx: 'guide:basics:3' },
    { who: 'me', text: 'ふーん。これも、あとで役に立つかもな。' },
  ]);
  guide.mark(null);
  guide.show('opacity', true);
  await sleep(1200);
  await play([
    { who: 'me', text: 'あった。透け具合を変えるのが「opacity」。1 にすれば、透けなくなる、と。', fx: 'guide:opacity:1' },
    { who: 'me', text: 'このページ、あとでまた見に来よう。' },
  ]);
  guide.mark(null);
  // はじめてのタブ移動: 箱庭日誌のタブを光らせて、プレイヤーに押してもらう
  await waitTab('site');
}

/** そのタブが押されるまで待つ（タブを光らせ、カーソルで合図する） */
function waitTab(name: string): Promise<void> {
  const tab = document.querySelector<HTMLButtonElement>(`.tab[data-tab="${name}"]`)!;
  tab.classList.add('glow');
  const stop = yourTurn(tab);
  return new Promise((done) =>
    tab.addEventListener(
      'click',
      () => {
        tab.classList.remove('glow');
        stop();
        done();
      },
      { once: true },
    ),
  );
}

// ---- 住人に話しかける ----
function refreshMark() {
  const p = PROBLEMS[current];
  // 問題17は、だれが残るか決めるまで、ヘッドと v の両方に「!」
  if (introDone && p?.auto && started && !flowBusy) return page?.setMark(stayer(model) ? [] : ['h', 'v']);
  page?.setMark(introDone && p && !started && !flowBusy ? [p.owner] : []);
}

/** 前の問題から、そのまま続く問題（問題17）は、話しかけなくても始まる */
function autoStart() {
  const p = PROBLEMS[current];
  if (!p?.auto || started) return;
  started = true;
  if (p.unlock) model.attrSlots.add(p.unlock);
  source.render();
  refreshMark();
}

async function talk(id: ResId) {
  if (dialog.busy || !introDone || flowBusy) return;
  stopFirstTouch?.();
  stopFirstTouch = null;
  const p = PROBLEMS[current];
  // 引っ越しのあと: 字になった子は、もう 答えない
  if (id === stayer(model) && model.flags.has('moved')) {
    await play(STAYER_STILL[id as 'h' | 'v']);
    return;
  }
  if (p && !started && id === p.owner && p.scene) {
    started = true;
    refreshMark();
    await playScene(p);
    return;
  }
  if (p && !started && id === p.owner) {
    started = true;
    refreshMark();
    // 演出（屋根・雨など）は、ページを元の幅に戻して見せる。会話のあと、開いていたソースは開き直す
    dialog.busy = true;
    const reopen = await closeSourceForTalk();
    await play(p.prompt);
    if ($('btn-source').hidden) {
      // はじめて「ソースを見る」が出るときは、ボタンを光らせて、押してもらう
      $('btn-source').hidden = false;
      $('btn-source').classList.add('glow');
      stopSourceHint = yourTurn($('btn-source'));
      showOpHint();
    }
    reopen();
    if (p.unlock) model.attrSlots.add(p.unlock);
    // かたまりごと消せるようになった場所は、ソースのいちばん上へ出す
    const removable = p.unlock?.startsWith('remove:') ? p.unlock.slice(7) : null;
    if (removable && model.opened.delete(removable)) model.opened.add(removable);
    // 書き足せるようになった場所は、新しく開く場所のすぐ下に出す
    if (p.unlockAdd) unlockAdd(p.unlockAdd);
    if (p.opens) openArea(p.opens);
    else source.render();
    void maybeNotice();
    return;
  }
  // 問題のとちゅうで、ヒントが変わることがある（帯を読んだあと、など）
  const hints = p?.hintsFn?.(model) ?? (p?.later?.when(model) ? p.later.hints : p?.hints);
  if (p && started && !solved.has(p.id) && hints?.[id]) {
    await play(hints[id]!);
    return;
  }
  // 一度だけの会話（v の名前のこと、など）。まだ流していないものがあれば、ふだんの一言のかわりに
  const once = ONCE_TALK.find((o) => o.who === id && solved.size >= o.when && !onceDone.has(o.id) && !(o.beforeName && model.flags.has('vNamed')));
  if (once) {
    onceDone.add(once.id);
    await play(once.lines);
    return;
  }
  const lines = CHATTER[id];
  await play([{ who: id, text: lines[Math.min(solved.size, lines.length - 1)] }]);
}

/** 幕間: はじまりの会話 → （遊ぶ）→ 終わりの会話。終わったら、日記の場所が開く */
async function playScene(p: Problem) {
  dialog.busy = true;
  await closeSourceForTalk();
  await play(p.prompt);
  if (p.play === 'chase' && page) {
    dialog.busy = true; // おいかけっこのあいだは、住人をクリックしても話さない
    toast('カーソルを動かして、にげよう！');
    const who = await page.chase(['v', 'o'], 9000);
    dialog.busy = false;
    const lines = p.playLines?.[who];
    if (lines) await play(lines);
  }
  await trySolve();
  if (p.opens) {
    openArea(p.opens);
    void maybeNotice();
  }
}

// ---- ページを書き換えたとき ----
model.onChange(async (rule, prop) => {
  // 本物の閉じタグが入ったら、リンクは、もう 字のかわりではない
  if (model.texts.get('#close') === '</html>') model.flags.delete('lLetter');
  // 容量メーターの数字（せりふの {over}・{left}）も、書き換えるたびに変わる
  refreshTokens();
  page?.applyCss();
  source.render();
  if (skipping) return;
  // 会話のあいだに書き換えたときは、会話が終わってから、解けたかどうかを見る
  if (dialog.busy) {
    // 問題17: 会話のあいだに消した字は、数えない（元に戻す）
    if (rule.selector === '#close' && prop === '#text' && PROBLEMS[current]?.id === 'p17' && !stayer(model)) {
      model.texts.set('#close', '</html>');
      refreshTokens();
      source.render();
    }
    void solveWhenFree();
    return;
  }
  if (await trySolve()) return;
  if (rule.selector === '.sign' && prop === '@contenteditable' && model.attr('.sign', 'contenteditable') === 'true' && page && !stopSignHint) {
    stopSignHint = yourTurn(page.signEl());
  }
  if (rule.selector === '.sign' && prop === '#text') {
    stopSignHint?.();
    stopSignHint = null;
  }
  // 問題17: </html> の字を、1つ消した
  if (rule.selector === '#close' && prop === '#text' && PROBLEMS[current]?.id === 'p17' && started && !stayer(model)) {
    await pickLetter();
    return;
  }
  // 問題15: 閉じタグが、容量に入らなかった
  if (rule.selector === '#close' && prop === '#full' && PROBLEMS[current]?.id === 'p15' && started) {
    await linkJoke();
    return;
  }
  // 問題11: v のカードの名前。打てるようになったら、名前の欄に合図を出す。打ったら、v が確かめる
  if (rule.selector === '.v-name' && prop === '@contenteditable' && model.attr('.v-name', 'contenteditable') === 'true' && page && !stopNameHint) {
    stopNameHint = yourTurn(page.vNameEl());
  }
  if (rule.selector === '.v-name' && prop === '#text') {
    stopNameHint?.();
    stopNameHint = null;
    if (PROBLEMS[current]?.id === 'p11' && started && !model.flags.has('vNamed')) {
      await askName();
      return;
    }
  }
  // 問題10: サービス終了の帯を、はじめて前に出したとき
  if (rule.selector === '.ss-notice' && PROBLEMS[current]?.id === 'p10' && started && noticeShown(model) && !model.flags.has('noticeSeen')) {
    await readNotice();
    return;
  }
  const r = reaction(model, rule.selector, prop, solved);
  if (r) {
    dialog.busy = true;
    const reopen = await closeSourceForTalk();
    await play(r);
    // まだ直すところがあるので、ソースは開き直す
    reopen();
    // v のカードに名前を打てるようになったら、カードが見える所まで送る（ソースが開いて、ページの幅が変わってから）
    if (rule.selector === '.v-name' && prop === '@contenteditable' && stopNameHint) {
      await sleep(500);
      page?.showVCard();
    }
  }
});

/** いまの問題が解けていたら、解けたときの会話を流す */
async function trySolve(): Promise<boolean> {
  const p = PROBLEMS[current];
  if (!p || !started || solved.has(p.id) || !p.solved(model)) return false;
  solved.add(p.id);
  // 会話が終わるまで、ほかの書き換えで二重に始まらないように
  dialog.busy = true;
  // 解けたあとは、次の問題を探しに行くので、ソースは閉じたままにする
  await closeSourceForTalk();
  if (p.doneFx) await page?.fx(p.doneFx);
  // 次の問題の前じたく（アップタイムが看板の裏へ、など）は、いま見ていない所で、こっそり
  const next = PROBLEMS[current + 1];
  if (next?.readyFx) await page?.fx(next.readyFx);
  await play(p.doneAlt?.when(model) ? p.doneAlt.lines : p.done);
  if (p.afterFx) await page?.fx(p.afterFx);
  current++;
  started = false;
  refreshMark();
  refreshTokens();
  // 解けたあとに続く流れ（主人公が、引っ越し先を探す）
  if (p.afterFlow) {
    flowBusy = true;
    refreshMark();
    await (p.afterFlow === 'findHome' ? findHome() : checkKotori());
    flowBusy = false;
    refreshMark();
  }
  autoStart();
  if (p.id === 'p17') toast('おしまい。ここからは、自由に 見てまわれます（ソースの いちばん下も、見てみてください）');
  return true;
}

/** v のカードに名前を打ったとき: こまった名前なら v が言う。よければ、v が「これで いいの？」と確かめる（「うん」で決まる） */
async function askName() {
  const name = (model.texts.get('.v-name') ?? '').trim();
  dialog.busy = true;
  const reopen = await closeSourceForTalk();
  await play(nameTrouble(name) ?? NAME_ASK(name));
  if (model.flags.has('vNamed')) await trySolve();
  else reopen();
}

/** サービス終了の帯を読む → 検索のタブで、本当かどうかを確かめる → ページに戻って、隠し直すよう頼まれる */
async function readNotice() {
  dialog.busy = true;
  await closeSourceForTalk();
  // 先に、さくさくサーバーのページで お知らせを読んでいたら、主人公とヘッドの言うことが変わる
  const known = model.flags.has('serverSeen');
  await play(known ? NOTICE_READ_KNOWN : NOTICE_READ);
  showTab('search');
  await search.search('さくさくサーバー サービス終了', RESULTS_SERVER);
  // ニュースは、プレイヤーが自分でクリックする
  await search.waitClick('news');
  await play(NOTICE_NEWS);
  await waitTab('site');
  await play(NOTICE_BACK);
  model.flags.add('noticeSeen');
  refreshTokens();
  // 隠し直すので、ソースを開く
  setSourceOpen(true);
  source.render();
  source.reveal('notice');
}

let solveWaiting = false;
async function solveWhenFree() {
  if (solveWaiting) return;
  solveWaiting = true;
  while (dialog.busy) await sleep(200);
  solveWaiting = false;
  await trySolve();
}

// ---- ひとりごと（ときどき、吹き出しで勝手にしゃべる） ----
let bantering = false;
setInterval(() => {
  if (!page || !introDone || dialog.busy || bantering || Math.random() < 0.35) return;
  // 近くにいる二人がいたら、ときどき、かけあい（夜のあいだは、しない）
  const pairs = page.isNight() ? [] : BANTER.filter((b) => (!b.when || b.when(solved.size)) && page!.near(b.pair[0], b.pair[1], 130));
  if (pairs.length && Math.random() < 0.6) {
    void banter(pairs[Math.floor(Math.random() * pairs.length)].lines);
    return;
  }
  const ids = (Object.keys(MUTTER) as ResId[]).filter((id) => page!.shown(id));
  const id = ids[Math.floor(Math.random() * ids.length)];
  const lines = MUTTER[id];
  let text = lines[Math.floor(Math.random() * lines.length)];
  // 名前がついたあとは、名前を楽しみにする ひとりごとを、名前を喜ぶ ひとりごとに
  if (id === 'v' && model.flags.has('vNamed') && text.includes('なまえ')) text = 'ぼく、{v}！ えへへ。';
  page.bubble(id, text);
  nod(id, text);
}, 4500);

/** v が眠そうなことを言ったら、少しのあいだ、首を傾けて、うとうとする */
function nod(id: ResId, text: string) {
  if (id === 'v' && /ねむく|ねてない/.test(text)) page?.sleepy('v', 3800);
}

/** かけあいを、吹き出しで順に出す */
async function banter(lines: { who: ResId; text: string }[]) {
  bantering = true;
  for (const l of lines) {
    if (dialog.busy) break;
    page?.bubble(l.who, l.text, 2600);
    nod(l.who, l.text);
    await sleep(1900);
  }
  bantering = false;
}

// ---- 開発用: 何問目から始めるか ----
// 開発サーバー（npm run dev）のときだけ、タイトル画面に選ぶ欄を出す。アドレスに ?start=3 とつけると、タイトルも飛ばして問題3から
const DEV_KEY = 'hakoniwa-dev-from';
function devFrom(): Promise<number> {
  const param = Number(new URLSearchParams(location.search).get('start'));
  if (param >= 1 && param <= PROBLEMS.length) return Promise.resolve(param);
  const sel = document.createElement('select');
  sel.id = 'tt-from';
  sel.append(new Option('はじまりから', '0'));
  PROBLEMS.forEach((p, i) => {
    const face = RESIDENTS.find((r) => r.id === p.owner)?.face;
    sel.append(new Option(`${i + 1}. ${p.scene ? '幕間' : '問題'}から（${face}）`, String(i + 1)));
  });
  try {
    sel.value = localStorage.getItem(DEV_KEY) ?? '0';
  } catch {
    // 覚えておけなくても、はじまりから選べばいい
  }
  const label = Object.assign(document.createElement('label'), { className: 'tt-dev' });
  label.append('開発用：', sel);
  $('tt-settings').after(label);
  return new Promise((done) =>
    $('tt-start').addEventListener(
      'click',
      () => {
        try {
          localStorage.setItem(DEV_KEY, sel.value);
        } catch {
          // 覚えておけなくてもいい
        }
        done(Number(sel.value));
      },
      { once: true },
    ),
  );
}

// ---- セーブ ----
// ブラウザに1つだけ記録する。読みこむときは、前の問題をぜんぶ解いた形にしてから（startFrom）、セーブした値に戻す
const SAVE_KEY = 'hakoniwa-save';
interface SaveData {
  v: 1;
  /** セーブした日時 */
  at: string;
  /** いまの問題（PROBLEMS の番号） */
  current: number;
  /** いまの問題を、話しかけて始めていたか */
  started: boolean;
  solved: string[];
  onceDone: string[];
  noticed: string[];
  guideFound: boolean;
  sourceButton: boolean;
  model: ModelSave;
}

function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const d = raw ? (JSON.parse(raw) as SaveData) : null;
    return d?.v === 1 ? d : null;
  } catch {
    return null;
  }
}

/** セーブする。できなかったときは、そのわけを返す */
function saveGame(): string | null {
  if (!introDone || !page) return 'まだ セーブできないみたい。箱庭日誌のページに入ってから、セーブできます。';
  if (dialog.busy) return '会話のあいだは、セーブできないみたい。会話が終わってから、もう一度ためしてね。';
  const data: SaveData = {
    v: 1,
    at: new Date().toISOString(),
    current,
    started,
    solved: [...solved],
    onceDone: [...onceDone],
    noticed: [...noticed],
    guideFound,
    sourceButton: !$('btn-source').hidden,
    model: model.dump(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    return 'セーブできませんでした（このブラウザでは、記録できないみたい）。';
  }
  return null;
}

const menu = new Menu($('btn-menu'), {
  save: saveGame,
  // ホーム（タイトル画面）に戻る。開発用の ?start=… は外す
  home: () => (location.href = location.pathname),
});
applySettings();
// タイトル画面の「設定」（はじめる前に、音や文字を変えたい人のため）
$('tt-settings').addEventListener('click', () => menu.settings(true));

/**
 * 前の問題をぜんぶ解いた形にして、問題 from（1から数える）の「!」が出たところから始める。
 * 開発用の「何問目から」と、セーブの「つづきから」（save があるとき）で使う
 */
async function startFrom(from: number, save?: SaveData) {
  $('title').remove();
  showTab('site');
  page = new Page($('site'), $('site-wrap'), model, { talk: (id) => void talk(id), link: openLink });
  await page.ready; // 住人のはじめの位置が決まるのを待つ（そのあとで、隠れる所などへ動かす）
  skipping = true;
  openArea('top');
  for (const p of PROBLEMS.slice(0, from - 1)) {
    if (p.unlockAdd) unlockAdd(p.unlockAdd);
    if (p.opens) {
      model.opened.add(p.opens);
      noticed.add(p.opens);
    }
    if (p.unlock) model.attrSlots.add(p.unlock);
    if (p.readyFx) await page.fx(p.readyFx, true);
    // 問題を始めたときの演出（オーバーフローが来る、など）も、済んだ形にする
    for (const l of p.prompt) if ('fx' in l && l.fx) await page.fx(l.fx, true);
    p.answer(model);
    solved.add(p.id);
    if (p.doneFx) await page.fx(p.doneFx, true);
    // 解けたあとの会話の中の演出（夜になる、など）も、済んだ形にする
    if (p.afterFx) await page.fx(p.afterFx, true);
    // 引っ越し先を見つけた形にする（ことりサーバーのタブ・容量メーター）
    if (p.afterFlow === 'findHome') {
      model.flags.add('kotoriSeen');
      meterOn();
    }
    // 引っ越しの朝、ことりサーバーを見直して、みんなで谷へ行った形にする
    if (p.afterFlow === 'checkKotori') {
      model.flags.add('lastFound');
      mainFx('doorUp');
      await page.fx('allToValley', true);
    }
    // 解けたあとの会話の中の演出（夜になる、荷物に石を詰める、など）も、済んだ形にする
    for (const l of p.done) if ('fx' in l && l.fx && !mainFx(l.fx)) await page.fx(l.fx, true);
  }
  // 一度だけの会話は、もう済んだことにする（前の問題のあいだに流れるはずだったもの）
  for (const o of ONCE_TALK) if (o.when < from - 1) onceDone.add(o.id);
  const cur = PROBLEMS[from - 1];
  if (cur?.readyFx) await page.fx(cur.readyFx, true);
  if (save) {
    // セーブした値に戻す（解いたあとに自分で書き換えた所・一度だけの会話・読んだ日記など）
    model.load(save.model);
    for (const id of save.onceDone) onceDone.add(id);
    for (const id of save.noticed) noticed.add(id);
    // 問題を始めたところでセーブしていたら、始めた形にする（ソースの場所が開き、ヒントが聞ける）
    if (save.started && cur) {
      for (const l of cur.prompt) if ('fx' in l && l.fx) await page.fx(l.fx, true);
      if (cur.unlock) model.attrSlots.add(cur.unlock);
      if (cur.opens) model.opened.add(cur.opens);
      if (cur.unlockAdd) unlockAdd(cur.unlockAdd);
      started = true;
    }
  }
  skipping = false;
  refreshTokens();
  // ことりサーバーで、もう はかってあるなら、アドレスの欄も、打ってあった形に
  if (model.flags.has('meter')) kotori.setAddress(ADDRESS.site);
  page.applyCss();
  source.render();
  introDone = true;
  current = from - 1;
  if (from > 1 || save?.guideFound) {
    // 問題1で済ませた「はじめてのこと」（解説サイト・ソースのボタン）も、済んだ形にする
    guideFound = true;
    document.querySelector<HTMLElement>('.tab[data-tab="guide"]')!.hidden = false;
    $('btn-source').hidden = false;
  }
  autoStart();
  if (save?.sourceButton) $('btn-source').hidden = false;
  // さくさくサーバーのページを、もう見ていたら、タブを出しておく
  for (const name of Object.keys(EXTRA))
    if (model.flags.has(`${name}Seen`)) document.querySelector<HTMLElement>(`.tab[data-tab="${name}"]`)!.hidden = false;
  refreshMark();
}

// ---- はじまり ----
async function start() {
  source.render();
  // タイトル画面（仮）。セーブがあれば「つづきから」も出す
  const save = readSave();
  $('tt-continue').hidden = !save;
  const picked = await new Promise<number | 'continue'>((done) => {
    $('tt-continue').addEventListener('click', () => done('continue'), { once: true });
    if (import.meta.env.DEV) void devFrom().then(done);
    else $('tt-start').addEventListener('click', () => done(0), { once: true });
  });
  if (picked === 'continue') return startFrom(save!.current + 1, save!);
  if (picked > 0) return startFrom(picked);
  $('title').classList.add('out');
  await sleep(1000);
  $('title').remove();
  await play(NET_START);
  await search.search('おもしろい サイト', RESULTS_FIRST);
  await sleep(1200);
  // 1時間のあいだに、出ていたサイトはぜんぶ見てしまった（暗いあいだに、題名を紫にしておく）
  const later = fade('― 1時間後 ―');
  await sleep(1500);
  search.markAllVisited();
  await later;
  await play(NET_LATER);
  await search.search('古い 個人サイト', RESULTS_OLD);
  await sleep(500);
  await play(NET_FOUND);
  await search.waitClick('hako');

  showTab('site');
  page = new Page($('site'), $('site-wrap'), model, { talk: (id) => void talk(id), link: openLink });
  await sleep(2200);
  await play(INTRO);
  introDone = true;
  openArea('top');
  refreshMark();
  // はじめて住人に話しかける番。「!」の子（v）に、カーソルで合図する
  stopFirstTouch = yourTurn(page.residentEl(PROBLEMS[0].owner));
}

void start();
