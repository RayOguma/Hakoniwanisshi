// 試作: はじまり 〜 問題3。
// 検索エンジンで「箱庭日誌」を見つける → 住人たちに「おかえり」と迎えられる → ページの CSS を書き換えて直していく
import './style.css';
import { Dialog } from './dialog';
import { PageModel } from './model';
import { Page } from './page';
import { SourcePanel } from './source';
import { BANTER, CHATTER, INTRO, makeAreas, MUTTER, NET_FOUND, NET_LATER, NET_START, PROBLEMS, reaction, RESIDENTS, type Line, type ResId } from './story';
import { GuideView, RESULTS_CSS, RESULTS_FIRST, RESULTS_OLD, SearchView, yourTurn } from './web';

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
let skipping = false; // 開発用: 途中から始めるために、前の問題を解いた形にしているところ

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const toastEl = $('toast');
let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2600);
}

const search = new SearchView($('view-search'));
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
    await page?.fx(fx);
  },
);

async function play(lines: Line[]) {
  await dialog.play(lines);
  page?.focus(null);
}

// ---- タブ ----
const ADDRESS: Record<string, string> = {
  search: 'https://www.sagasu.example/',
  site: 'http://www.example.ne.jp/~hakoniwa/index.html',
  guide: 'https://yasashii-html.example.com/css/',
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

async function fade(text: string) {
  const f = $('fade');
  $('fade-text').textContent = text;
  f.classList.add('on');
  await sleep(2600);
  f.classList.remove('on');
  await sleep(900);
}

// ---- ソース ----
function openArea(id: string) {
  model.opened.add(id);
  source.render();
  if (!$('source').hidden) source.reveal(id);
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
  page?.setMark(introDone && p && !started ? p.owner : null);
}

async function talk(id: ResId) {
  if (dialog.busy || !introDone) return;
  stopFirstTouch?.();
  stopFirstTouch = null;
  const p = PROBLEMS[current];
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
    openArea(p.opens);
    void maybeNotice();
    return;
  }
  if (p && started && !solved.has(p.id) && p.hints[id]) {
    await play(p.hints[id]!);
    return;
  }
  const lines = CHATTER[id];
  await play([{ who: id, text: lines[Math.min(solved.size, lines.length - 1)] }]);
}

// ---- ページを書き換えたとき ----
model.onChange(async (rule, prop) => {
  page?.applyCss();
  source.render();
  if (skipping) return;
  // 会話のあいだに書き換えたときは、会話が終わってから、解けたかどうかを見る
  if (dialog.busy) {
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
  const r = reaction(model, rule.selector, prop, solved);
  if (r) {
    dialog.busy = true;
    const reopen = await closeSourceForTalk();
    await play(r);
    // まだ直すところがあるので、ソースは開き直す
    reopen();
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
  await play(p.done);
  if (p.afterFx) await page?.fx(p.afterFx);
  current++;
  started = false;
  refreshMark();
  return true;
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
  // 近くにいる二人がいたら、ときどき、かけあい
  const pairs = BANTER.filter((b) => (!b.when || b.when(solved.size)) && page!.near(b.pair[0], b.pair[1], 130));
  if (pairs.length && Math.random() < 0.6) {
    void banter(pairs[Math.floor(Math.random() * pairs.length)].lines);
    return;
  }
  const ids = (Object.keys(MUTTER) as ResId[]).filter((id) => page!.shown(id));
  const id = ids[Math.floor(Math.random() * ids.length)];
  const lines = MUTTER[id];
  page.bubble(id, lines[Math.floor(Math.random() * lines.length)]);
}, 4500);

/** かけあいを、吹き出しで順に出す */
async function banter(lines: { who: ResId; text: string }[]) {
  bantering = true;
  for (const l of lines) {
    if (dialog.busy) break;
    page?.bubble(l.who, l.text, 2600);
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
  PROBLEMS.forEach((p, i) => sel.append(new Option(`問題${i + 1}から（${RESIDENTS.find((r) => r.id === p.owner)?.face}）`, String(i + 1))));
  try {
    sel.value = localStorage.getItem(DEV_KEY) ?? '0';
  } catch {
    // 覚えておけなくても、はじまりから選べばいい
  }
  const label = Object.assign(document.createElement('label'), { className: 'tt-dev' });
  label.append('開発用：', sel);
  $('tt-start').after(label);
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

/** 開発用: 前の問題をぜんぶ解いた形にして、問題 from（1から数える）の「!」が出たところから始める */
async function devStart(from: number) {
  $('title').remove();
  showTab('site');
  page = new Page($('site'), $('site-wrap'), model, { talk: (id) => void talk(id) });
  await page.ready; // 住人のはじめの位置が決まるのを待つ（そのあとで、隠れる所などへ動かす）
  skipping = true;
  openArea('top');
  for (const p of PROBLEMS.slice(0, from - 1)) {
    model.opened.add(p.opens);
    noticed.add(p.opens);
    if (p.unlock) model.attrSlots.add(p.unlock);
    if (p.readyFx) await page.fx(p.readyFx, true);
    // 問題を始めたときの演出（オーバーフローが来る、など）も、済んだ形にする
    for (const l of p.prompt) if ('fx' in l && l.fx) await page.fx(l.fx, true);
    p.answer(model);
    solved.add(p.id);
    if (p.doneFx) await page.fx(p.doneFx, true);
    if (p.afterFx) await page.fx(p.afterFx, true);
  }
  skipping = false;
  const cur = PROBLEMS[from - 1];
  if (cur.readyFx) await page.fx(cur.readyFx, true);
  page.applyCss();
  source.render();
  introDone = true;
  current = from - 1;
  if (from > 1) {
    // 問題1で済ませた「はじめてのこと」（解説サイト・ソースのボタン）も、済んだ形にする
    guideFound = true;
    document.querySelector<HTMLElement>('.tab[data-tab="guide"]')!.hidden = false;
    $('btn-source').hidden = false;
  }
  refreshMark();
}

// ---- はじまり ----
async function start() {
  source.render();
  // タイトル画面（仮）
  if (import.meta.env.DEV) {
    const from = await devFrom();
    if (from > 0) return devStart(from);
  } else {
    await new Promise((r) => $('tt-start').addEventListener('click', r, { once: true }));
  }
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
  page = new Page($('site'), $('site-wrap'), model, { talk: (id) => void talk(id) });
  await sleep(2200);
  await play(INTRO);
  introDone = true;
  openArea('top');
  refreshMark();
  // はじめて住人に話しかける番。「!」の子（v）に、カーソルで合図する
  stopFirstTouch = yourTurn(page.residentEl(PROBLEMS[0].owner));
}

void start();
