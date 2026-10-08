// 試作: はじまり 〜 問題3。
// 検索エンジンで「箱庭日誌」を見つける → 住人たちに「おかえり」と迎えられる → ページの CSS を書き換えて直していく
import './style.css';
import { Dialog } from './dialog';
import { PageModel } from './model';
import { Page } from './page';
import { SourcePanel } from './source';
import { CHATTER, INTRO, makeAreas, MUTTER, NET_FOUND, NET_LATER, NET_START, PROBLEMS, reaction, RESIDENTS, type Line, type ResId } from './story';
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
let diaryNoticed = false; // 主人公が、ソースの緑の字（日記）に気づいたか

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
  (who) => page?.setTalking(who && RESIDENTS.some((r) => r.id === who) ? [who] : []),
  async (fx) => {
    await page?.fx(fx);
  },
);

const play = (lines: Line[]) => dialog.play(lines);

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
    void maybeNoticeDiary();
  }
});

// S キーでも、ソースを開け閉めできる（字を打っているときは別。日本語入力中でも効くよう、key ではなく code で見る）
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyS' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if ((e.target as HTMLElement).closest?.('input, textarea')) return;
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

/** はじめてヘッドの家のソースを見たとき、主人公が、緑の字（日記のコメント）に気づく */
async function maybeNoticeDiary() {
  if (diaryNoticed || !model.opened.has('house') || $('source').hidden) return;
  diaryNoticed = true;
  await sleep(900);
  while (dialog.busy) await sleep(300);
  source.reveal('house');
  await play([
    { who: 'me', text: '……ん？ この緑色の字、なんだろう。' },
    { who: 'me', text: '「2009/04/03 最初の住人を作った」……。日付と、そのときのこと？' },
    { who: 'me', text: '……日記みたいに なってるのかな。' },
  ]);
}

/** はじめてソースを開いたとき、主人公が検索して、解説サイトを見つける */
async function maybeLookUp() {
  if (guideFound || !started || current !== 0) return;
  guideFound = true;
  await sleep(1400);
  while (dialog.busy) await sleep(300);
  await play([
    { who: 'me', text: '……うわ、なんだこれ。英語と記号が、ずらーっと……。' },
    { who: 'me', text: '「HTML」？ ……なんだこれ、さっぱり わからないな。' },
    { who: 'me', text: '……とりあえず、「透けてる」のを直す方法を、調べてみるか。' },
  ]);
  showTab('search');
  await search.search('ホームページ 透けてる 直し方', RESULTS_CSS);
  // 検索結果は、プレイヤーが自分でクリックする
  await search.waitClick('guide');
  showTab('guide');
  // サイトは、いちばん上の「CSS の書き方の基本」から読む。そのあと、下に opacity を見つける
  guide.show('basics');
  await sleep(600);
  await play([
    { who: 'me', text: 'なるほど……。ホームページの見た目は、「CSS」っていうので決めてるのか。' },
    { who: 'me', text: '書き方は「名前: 値;」。名前と値は「:」で区切って、最後に「;」……。' },
    { who: 'me', text: 'ふーん。これも、あとで役に立つかもな。' },
  ]);
  guide.show('opacity', true);
  await sleep(1200);
  await play([
    { who: 'me', text: '……あった。透け具合を変えるのが「opacity」。1 にすれば、透けなくなる……と。' },
    { who: 'me', text: 'このページ、あとでまた見に来よう。' },
  ]);
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
    page?.scrollTo('home');
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
    openArea(p.opens);
    void maybeNoticeDiary();
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
  // 会話のあいだに書き換えたときは、会話が終わってから、解けたかどうかを見る
  if (dialog.busy) {
    void solveWhenFree();
    return;
  }
  if (await trySolve()) return;
  const r = reaction(model, rule.selector, prop, solved);
  if (r) {
    dialog.busy = true;
    const reopen = await closeSourceForTalk();
    await page?.settleWorker();
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
  await page?.settleWorker();
  if (p.doneFx) await page?.fx(p.doneFx);
  await play(p.done);
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
setInterval(() => {
  if (!page || !introDone || dialog.busy || Math.random() < 0.35) return;
  const ids = Object.keys(MUTTER) as ResId[];
  const id = ids[Math.floor(Math.random() * ids.length)];
  const lines = MUTTER[id];
  page.bubble(id, lines[Math.floor(Math.random() * lines.length)]);
}, 4500);

// ---- はじまり ----
async function start() {
  source.render();
  // タイトル画面（仮）
  await new Promise((r) => $('tt-start').addEventListener('click', r, { once: true }));
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
