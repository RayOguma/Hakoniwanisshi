// 住人たちのページ。シャドウ DOM の中に描くので、ページの CSS（プレイヤーが書き換える）が、ゲームの画面に漏れない。
// 住人は角の丸い CSS の立方体。ページの中を縦横無尽に歩きまわり、進む方向に顔を向ける。話すと、こちらを向く
import type { PageModel } from './model';
import { CARDS, LINKS, POSTS } from './site';
import { RESIDENTS, roofFixed, type Resident, type ResId } from './story';

const S = 46; // 立方体の大きさ
/** しゃべる子に寄るときの拡大 */
const ZOOM = 1.22;
/** 上から見下ろす角度（頭のてっぺんと、進む方向の面が見える） */
const TILT = -58;

const BASE_CSS = `
:host { display: block; }
/* 住人が歩ける世界。ページ（.page）の外の、まわりの余白まで歩いていける。しゃべる子に寄るときは、世界ごと拡大する */
.world { position: relative; min-height: 100%; padding: 1px 0; overflow: hidden; transition: transform 0.6s ease, transform-origin 0.6s ease; }
* { box-sizing: border-box; }
.page {
  position: relative; max-width: 860px; margin: 28px auto 140px; padding: 40px 48px 32px;
  background: #faf8f4; border-radius: 18px; box-shadow: 0 2px 24px rgba(60, 50, 40, 0.08);
  font-family: 'M PLUS Rounded 1c', 'BIZ UDGothic', sans-serif; color: #4a4540;
  transition: background 0.6s ease;
}
header { text-align: center; }
h1 { margin: 0; font-size: 34px; font-weight: 800; letter-spacing: 0.18em; color: #5a4a3e; }
.sub { margin-top: 6px; font-size: 13px; letter-spacing: 0.2em; color: #a0948a; }
nav { display: flex; justify-content: center; gap: 28px; margin: 22px 0 8px; font-size: 13px; color: #8a7e74; }
nav span { padding-bottom: 3px; border-bottom: 2px solid transparent; cursor: var(--cur-hand); }
nav span:hover { color: #5a4a3e; }
nav span.on { border-color: #e8a0b8; color: #5a4a3e; }

.garden {
  position: relative; margin-top: 20px; height: 400px; border-radius: 16px;
  background:
    radial-gradient(circle, rgba(160, 140, 120, 0.18) 1px, transparent 1.5px) 0 0 / 22px 22px,
    #f3efe6;
}
/* ヘッドの家 */
.house { position: absolute; left: 50%; top: 34px; width: 150px; margin-left: -75px; }
.roof {
  height: 44px; width: 150px; background: #d9826b; border-radius: 6px;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  transform-origin: 10% 100%; transition: left 0.5s ease, transform 0.6s cubic-bezier(.3,1.6,.5,1);
}
.walls {
  position: relative; height: 62px; width: 120px; margin: 0 auto; background: #fffaf2;
  border: 2px solid #e6d6c0; border-top: none; border-radius: 0 0 8px 8px;
}
.walls::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 22px; height: 32px; margin-left: -11px; background: #e6d6c0; border-radius: 11px 11px 0 0; }
.rain { position: absolute; left: calc(50% + 54px); top: 64px; width: 40px; height: 80px; pointer-events: none; }
.rain i {
  position: absolute; top: 0; width: 2px; height: 9px; background: #8ab8e0; border-radius: 1px;
  animation: drop 0.9s linear infinite;
}
@keyframes drop { from { transform: translateY(0); opacity: 1; } to { transform: translateY(70px); opacity: 0; } }

/* マージのお城。まわりのお堀は、お城の箱の border（線。ページの CSS で決まる）。堀があるあいだは、だれも渡れない */
.castle {
  position: relative; width: 440px; height: 240px; margin: 64px auto 0; border-radius: 56px;
  background: radial-gradient(circle, rgba(120, 150, 90, 0.28) 1.5px, transparent 2px) 0 0 / 18px 18px, #e2ebcb;
  box-shadow: 0 0 0 2px #d6cab2, inset 0 0 0 2px #c9d8ac;
}
.keep {
  position: absolute; left: 36px; top: 46px; width: 124px; height: 86px;
  background: #f3ebdc; border: 2px solid #cdbfa6; border-radius: 4px;
}
.keep::before {
  content: ''; position: absolute; left: -2px; right: -2px; top: -14px; height: 13px;
  background: repeating-linear-gradient(90deg, #f3ebdc 0 16px, transparent 16px 26px);
}
.keep::after {
  content: ''; position: absolute; left: 50%; bottom: 0; width: 28px; height: 38px; margin-left: -14px;
  background: #cdbfa6; border-radius: 14px 14px 0 0;
}
.flag { position: absolute; left: 96px; top: 6px; width: 2px; height: 28px; background: #8a7e74; }
.flag::after { content: ''; position: absolute; left: 2px; top: 0; width: 22px; height: 14px; background: #e8a890; clip-path: polygon(0 0, 100% 50%, 0 100%); }

/* 住人たち・日誌・リンク */
section.sec { margin-top: 56px; }
.sec h2 { margin: 0 0 18px; font-size: 18px; letter-spacing: 0.2em; color: #5a4a3e; text-align: center; }
.sec h2::after { content: ''; display: block; width: 28px; height: 3px; margin: 8px auto 0; background: #e8a0b8; border-radius: 2px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.card { display: flex; gap: 12px; align-items: center; padding: 12px 14px; background: #fff; border-radius: 12px; }
.card .ava { flex-shrink: 0; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 11px; font-size: 12px; font-weight: 800; color: #3a2e34; box-shadow: inset 0 -5px 0 rgba(0,0,0,0.1); }
.card b { display: block; font-size: 14px; color: #5a4a3e; }
.card p { margin: 2px 0 0; font-size: 12px; line-height: 1.6; color: #7a6e64; }
.post { padding: 22px 26px; margin-bottom: 16px; background: #fff; border-radius: 14px; }
.post .date { font-size: 11px; color: #b0a498; letter-spacing: 0.1em; }
.post h3 { margin: 4px 0 10px; font-size: 17px; color: #5a4a3e; }
.post p { margin: 0 0 8px; font-size: 14px; line-height: 1.9; }
.links { list-style: none; margin: 0; padding: 0; }
.links li { padding: 10px 4px; border-bottom: 1px solid #ece4d8; font-size: 14px; }
.links a { color: #b86a8a; text-decoration: underline; text-underline-offset: 3px; cursor: var(--cur-hand); }
.links span { margin-left: 10px; font-size: 12px; color: #a0948a; }

footer { margin-top: 26px; text-align: center; font-size: 11px; color: #b0a498; letter-spacing: 0.1em; }
.counter { font-family: monospace; color: #8a7e74; }

/* 住人（立方体） */
.res { position: absolute; left: 0; top: 0; width: ${S}px; height: ${S}px; cursor: var(--cur-hand); z-index: 2; }
.res.talking { z-index: 3; }
.body3d { position: relative; width: ${S}px; height: ${S}px; perspective: 320px; }
.hop { width: ${S}px; height: ${S}px; }
.res.walking .hop { animation: hop 0.42s ease-in-out infinite; }
.res.idle .hop { animation: sway 2.6s ease-in-out infinite; }
@keyframes hop { 50% { transform: translateY(-5px); } }
@keyframes sway { 50% { transform: translateY(-2px) scale(1.02, 0.98); } }
.cube { position: relative; width: ${S}px; height: ${S}px; transform-style: preserve-3d; transition: transform 0.35s ease; }
.f {
  position: absolute; inset: 0; background: currentColor; border-radius: 11px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.f-front { transform: translateZ(${S / 2 - 0.5}px); display: grid; place-items: center; }
.f-front span { color: #3a2e34; font-size: 13px; font-weight: 800; white-space: nowrap; }
.f-back { transform: rotateY(180deg) translateZ(${S / 2 - 0.5}px); filter: brightness(0.82); }
.f-left { transform: rotateY(-90deg) translateZ(${S / 2 - 0.5}px); filter: brightness(0.88); }
.f-right { transform: rotateY(90deg) translateZ(${S / 2 - 0.5}px); filter: brightness(0.88); }
.f-top { transform: rotateX(90deg) translateZ(${S / 2 - 0.5}px); background: var(--hair); }
.f-bottom { transform: rotateX(-90deg) translateZ(${S / 2 - 0.5}px); filter: brightness(0.7); }
.shadow { position: absolute; left: 6px; right: 6px; bottom: -6px; height: 10px; border-radius: 50%; background: rgba(60, 40, 30, 0.12); }

/* 「!」は字ではなく、丸い棒と丸い点で描く（太く、角を丸く。白いふちで、どこにいても見えるように） */
.mark {
  position: absolute; left: 50%; top: -34px; width: 10px; height: 26px; transform: translateX(-50%);
  animation: bob 0.8s ease-in-out infinite alternate; pointer-events: none;
}
.mark::before, .mark::after {
  content: ''; position: absolute; left: 0; width: 10px; background: #e0607a;
  box-shadow: 0 0 0 2px #fff, 0 2px 4px 2px rgba(60, 40, 30, 0.18);
}
.mark::before { top: 0; height: 17px; border-radius: 5px 5px 4px 4px / 5px 5px 7px 7px; }
.mark::after { bottom: 0; height: 7px; width: 7px; left: 1.5px; border-radius: 50%; }
@keyframes bob { to { transform: translate(-50%, -5px); } }
.bubble {
  position: absolute; left: 50%; bottom: ${S + 14}px; transform: translateX(-50%);
  max-width: 220px; width: max-content; padding: 6px 12px; background: #fff; border: 2px solid #4a4540; border-radius: 12px;
  font-size: 12px; line-height: 1.5; color: #4a4540; pointer-events: none; animation: pop 0.25s ease;
}
.bubble::after {
  content: ''; position: absolute; left: 50%; bottom: -8px; margin-left: -6px;
  border: 6px solid transparent; border-top-color: #4a4540; border-bottom: none;
}
.bubble.out { opacity: 0; transition: opacity 0.4s ease; }
@keyframes pop { from { transform: translateX(-50%) scale(0.6); opacity: 0; } }

`;

export interface PageHooks {
  talk: (id: ResId) => void;
}

interface Mover {
  r: Resident;
  el: HTMLElement;
  body: HTMLElement;
  cube: HTMLElement;
  faceText: HTMLElement;
  x: number;
  y: number;
  tx: number;
  ty: number;
  wait: number;
  angle: number;
  /** 決まった場所へ向かっている（演出）。着いたら呼ぶ */
  goal?: () => void;
  /** その場から動かない（演出・眠り） */
  hold?: boolean;
  /** 演出で急ぐときの速さ（ピクセル/秒） */
  rush?: number;
  asleep?: boolean;
  /** ワーカーの、前の位置（向きを決めるため） */
  last?: { x: number; y: number };
}

export class Page {
  private root: ShadowRoot;
  private modelStyle: HTMLStyleElement;
  private page: HTMLElement;
  private world!: HTMLElement;
  private rain: HTMLElement;
  private castle: HTMLElement;
  /** しゃべっている子に寄るときの、拡大の割合（1 はふつう） */
  private zoom = 1;
  /** ワーカーが走る道（お堀のまわり）。お城の位置から作る @keyframes run */
  private runStyle: HTMLStyleElement;
  private movers = new Map<string, Mover>();
  private mouse: { x: number; y: number } | null = null;
  private talking = new Set<string>();
  /** 雨もりが直るまで、アップタイムは軒下で寝ている */
  uptimeAtEaves = true;
  /** ページの左はし（幅が変わってページが動いたら、住人もいっしょに動かす） */
  private pageLeft = 0;
  /** お城の位置（ソースを開いてページの幅が変わると、上の段が折り返して、お城が上下にも動く） */
  private castleAt: { x: number; y: number } | null = null;

  constructor(
    host: HTMLElement,
    /** ページを縦に送る入れ物 */
    private scroller: HTMLElement,
    private model: PageModel,
    private hooks: PageHooks,
  ) {
    this.root = host.attachShadow({ mode: 'open' });
    const base = document.createElement('style');
    base.textContent = BASE_CSS + RESIDENTS.map((r) => `.${r.id} { color: ${r.color}; }`).join('\n');
    this.modelStyle = document.createElement('style');
    this.runStyle = document.createElement('style');
    this.root.append(base, this.runStyle, this.modelStyle);

    this.page = div('page');
    this.page.innerHTML = `
      <header>
        <h1>箱庭日誌</h1>
        <div class="sub">〜 定年エンジニアの手作りページ 〜</div>
        <nav><span class="on" data-go="home">ホーム</span><span data-go="residents">住人たち</span><span data-go="posts">日誌</span><span data-go="links">リンク</span></nav>
      </header>
      <div class="garden" id="home">
        <div class="house"><div class="roof"></div><div class="walls"></div></div>
        <div class="rain"></div>
      </div>
      <section class="sec" id="residents"><h2>住人たち</h2><div class="cards"></div></section>
      <div class="castle"><div class="keep"></div><div class="flag"></div></div>
      <section class="sec" id="posts"><h2>日誌</h2><div class="posts"></div></section>
      <section class="sec" id="links"><h2>リンク</h2><ul class="links"></ul></section>
      <footer>visitors <span class="counter">000127</span> ・ 最終更新 2012/02/</footer>
    `;
    this.world = div('world');
    this.world.append(this.page);
    this.root.append(this.world);
    this.fillSections();
    for (const n of this.page.querySelectorAll<HTMLElement>('nav span')) {
      n.addEventListener('click', () => {
        this.page.querySelectorAll('nav span').forEach((x) => x.classList.toggle('on', x === n));
        this.scrollTo(n.dataset.go!);
      });
    }
    this.rain = this.page.querySelector('.rain')!;
    this.castle = this.page.querySelector('.castle')!;
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('i');
      d.style.left = `${(i * 7) % 40}px`;
      d.style.animationDelay = `${i * 0.15}s`;
      this.rain.append(d);
    }
    for (const r of RESIDENTS) this.addResident(r);

    this.world.addEventListener('mousemove', (e) => {
      // 寄って拡大しているときは、拡大の分を戻して、世界の中の座標にする
      const b = this.world.getBoundingClientRect();
      this.mouse = { x: (e.clientX - b.left) / this.zoom, y: (e.clientY - b.top) / this.zoom };
    });
    this.world.addEventListener('mouseleave', () => (this.mouse = null));
    new ResizeObserver(() => this.sizeVars()).observe(this.world);
    this.sizeVars();
    this.applyCss();

    let prev = performance.now();
    const loop = (now: number) => {
      this.step(Math.min(0.05, (now - prev) / 1000));
      prev = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** 大きさが変わったとき: ワーカーの道を作り直し、ページが横に動いたら住人も動かす */
  private sizeVars() {
    this.makeRunPath();
    // ソースを開け閉めしてページが横に動いたら、住人も同じだけ動く（軒下のアップタイムが、軒下からはずれないように）
    const left = this.page.offsetLeft;
    const dx = left - this.pageLeft;
    this.pageLeft = left;
    if (!dx) return;
    const W = this.world.clientWidth - S;
    for (const m of this.movers.values()) {
      if (m.r.id === 'w' || m.r.id === 'm' || m.r.id === 'e') continue;
      m.x = clamp(m.x + dx, 0, W);
      m.tx = clamp(m.tx + dx, 0, W);
      this.draw(m);
    }
  }

  private fillSections() {
    const cards = this.page.querySelector('.cards')!;
    for (const c of CARDS) {
      const card = div('card');
      const ava = Object.assign(div('ava'), { textContent: c.face });
      ava.style.background = c.color;
      const info = document.createElement('div');
      info.append(Object.assign(document.createElement('b'), { textContent: c.name }), Object.assign(document.createElement('p'), { textContent: c.text }));
      card.append(ava, info);
      cards.append(card);
    }
    const posts = this.page.querySelector('.posts')!;
    for (const p of POSTS) {
      const art = document.createElement('article');
      art.className = 'post';
      art.append(Object.assign(div('date'), { textContent: p.date }), Object.assign(document.createElement('h3'), { textContent: p.title }));
      for (const t of p.body) art.append(Object.assign(document.createElement('p'), { textContent: t }));
      posts.append(art);
    }
    const links = this.page.querySelector('.links')!;
    for (const l of LINKS) {
      const li = document.createElement('li');
      li.append(Object.assign(document.createElement('a'), { textContent: l.title }), Object.assign(document.createElement('span'), { textContent: l.note }));
      links.append(li);
    }
  }

  /** ページの中の、その場所まで送る */
  scrollTo(id: string) {
    const el = this.page.querySelector<HTMLElement>(`#${id}`);
    if (!el) return;
    const top = id === 'home' ? 0 : this.page.offsetTop + el.offsetTop - 16;
    this.scroller.scrollTo({ top, behavior: 'smooth' });
  }

  private addResident(r: Resident) {
    const el = div('res idle');
    // 体の色は、住人ごとの CSS で決める（ページの CSS で書き換えられるよう、ここでは直接書かない）
    const body = div(`${r.id} body3d`);
    const hop = div('hop');
    const cube = div('cube');
    cube.style.setProperty('--hair', r.hair);
    let faceText!: HTMLElement;
    for (const f of ['front', 'back', 'left', 'right', 'top', 'bottom']) {
      const face = div(`f f-${f}`);
      if (f === 'front') {
        faceText = document.createElement('span');
        faceText.textContent = r.aloneFace ?? r.face;
        face.append(faceText);
      }
      cube.append(face);
    }
    hop.append(div('shadow'), cube);
    body.append(hop);
    el.append(body);
    el.addEventListener('click', () => this.hooks.talk(r.id));
    this.world.append(el);
    const m: Mover = { r, el, body, cube, faceText, x: 0, y: 0, tx: 0, ty: 0, wait: Math.random() * 2, angle: 0 };
    this.movers.set(r.id, m);
    requestAnimationFrame(() => this.home(m));
  }

  /** はじめの位置 */
  private home(m: Mover) {
    const g = this.gardenBox();
    const spots: Record<ResId, [number, number]> = {
      h: [g.x + g.w / 2 - S / 2, g.y + 112],
      v: [g.x + g.w / 2 - 140, g.y + 210],
      l: [g.x + g.w / 2 + 110, g.y + 200],
      u: [g.x + g.w / 2 + 52, g.y + 132],
      w: [0, 0],
      m: [0, 0],
      e: [0, 0],
    };
    [m.x, m.y] = spots[m.r.id];
    if (m.r.id === 'm') {
      const i = this.castleBox().inner;
      [m.x, m.y] = [i.x + i.w / 2 - S / 2, i.y + i.h / 2 - S / 2];
    }
    if (m.r.id === 'e') {
      // お堀の左の外（ワーカーの走る道よりも外）に立って、お城のほうを向いている
      const c = this.castleBox();
      [m.x, m.y] = [c.x - S * 2 - 44, c.y + c.h / 2 - S / 2];
      m.hold = true;
      m.angle = 90;
    }
    m.tx = m.x;
    m.ty = m.y;
    if (m.r.id === 'u') m.asleep = true;
    this.draw(m);
  }

  /** お城の位置（世界の中の座標）。外側はお堀（border）をふくむ。内側は、お城の地面 */
  private castleBox() {
    const el = this.castle;
    const b = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
    const x = this.page.offsetLeft + el.offsetLeft;
    const y = this.page.offsetTop + el.offsetTop;
    return { x, y, w: el.offsetWidth, h: el.offsetHeight, inner: { x: x + b, y: y + b, w: el.offsetWidth - b * 2, h: el.offsetHeight - b * 2 }, river: b > 0 };
  }

  /**
   * お城が動いたら、マージとエコーも同じだけ動く。
   * それでもマージがお城の外にいたら（お堀があるあいだは）、中へ戻す
   */
  private followCastle() {
    const c = this.castleBox();
    if (this.castleAt) {
      const dx = c.x - this.castleAt.x;
      const dy = c.y - this.castleAt.y;
      if (dx || dy) {
        for (const id of ['m', 'e']) {
          const m = this.movers.get(id);
          if (!m) continue;
          m.x += dx;
          m.y += dy;
          m.tx += dx;
          m.ty += dy;
        }
      }
    }
    this.castleAt = { x: c.x, y: c.y };
    const m = this.movers.get('m');
    if (m && c.river && this.blocked(m, m.x, m.y)) {
      const i = c.inner;
      m.x = clamp(m.x, i.x + 6, i.x + i.w - S - 6);
      m.y = clamp(m.y, i.y + 6, i.y + i.h - S - 6);
      m.tx = m.x;
      m.ty = m.y;
    }
  }

  /** その位置に行けないか（お堀があるあいだ、マージはお城から出られず、ほかの子はお城に入れない） */
  private blocked(m: Mover, x: number, y: number) {
    const isl = this.castleBox();
    if (!isl.river) return false;
    if (m.r.id === 'm') {
      const i = isl.inner;
      return x < i.x + 4 || y < i.y + 4 || x + S > i.x + i.w - 4 || y + S > i.y + i.h - 4;
    }
    const pad = 6;
    return x + S > isl.x - pad && x < isl.x + isl.w + pad && y + S > isl.y - pad && y < isl.y + isl.h + pad;
  }

  /** ワーカーの道: お城（お堀）のまわりを、角を落とした四角で、ぐるっと1周（同じ速さで走るよう、長さで割りふる） */
  private makeRunPath() {
    const isl = this.castleBox();
    const gap = 16;
    const l = isl.x - S - gap;
    const r = isl.x + isl.w + gap;
    const t = isl.y - S - gap;
    const b = isl.y + isl.h + gap;
    const c = 34; // 角を落とす長さ
    const pts = [
      [l + c, t], [r - c, t], [r, t + c], [r, b - c], [r - c, b], [l + c, b], [l, b - c], [l, t + c], [l + c, t],
    ];
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const frames = pts.map(([x, y], i) => `${((len[i] / total) * 100).toFixed(2)}% { transform: translate(${x}px, ${y}px); }`);
    this.runStyle.textContent = `@keyframes run { ${frames.join(' ')} }`;
  }

  /** 庭の位置（世界の中の座標） */
  private gardenBox() {
    const g = this.page.querySelector('.garden') as HTMLElement;
    return { x: this.page.offsetLeft + g.offsetLeft, y: this.page.offsetTop + g.offsetTop, w: g.clientWidth, h: g.clientHeight };
  }

  /** 1こま進める */
  private step(dt: number) {
    const W = this.world.clientWidth - S;
    const H = this.world.clientHeight - S;
    this.followCastle();
    for (const m of this.movers.values()) {
      if (m.r.id === 'w') {
        this.stepWorker(m);
        continue;
      }
      const talking = this.talking.has(m.r.id);
      if (talking) {
        this.setWalking(m, false);
        this.draw(m);
        continue;
      }
      // カーソルを追いかける子は、カーソルがページの中にある間、毎こまカーソルを目指す（遠いほど速く）。そばまで来たら止まる
      const chasing = !!(m.r.follows && this.mouse && !m.hold);
      if (chasing) {
        const cx = clamp(this.mouse!.x - S / 2, 0, W);
        const cy = clamp(this.mouse!.y + 16, 0, H);
        const far = Math.hypot(cx - m.x, cy - m.y);
        if (far > 36) {
          m.tx = cx;
          m.ty = cy;
        } else {
          m.tx = m.x;
          m.ty = m.y;
        }
      }
      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const speed = m.rush ?? (chasing ? Math.min(320, m.r.speed + dist * 1.6) : m.r.speed);
        const v = Math.min(dist, speed * dt);
        const nx = m.x + (dx / dist) * v;
        const ny = m.y + (dy / dist) * v;
        if (this.blocked(m, nx, ny) && !this.blocked(m, m.x, m.y)) {
          // お堀に行きあたった。そこで止まって、べつの所へ行く
          m.tx = m.x;
          m.ty = m.y;
          m.wait = Math.min(m.wait, 0.4);
          this.setWalking(m, false);
        } else {
          m.x = nx;
          m.y = ny;
          m.angle = nearAngle(m.angle, (Math.atan2(dx, dy) * 180) / Math.PI);
          this.setWalking(m, true);
        }
      } else {
        this.setWalking(m, false);
        if (m.goal) {
          const g = m.goal;
          m.goal = undefined;
          g();
        }
        m.wait -= dt;
        if (m.wait <= 0 && !m.hold) this.nextTarget(m, W, H);
      }
      this.draw(m);
    }
  }

  private nextTarget(m: Mover, W: number, H: number) {
    m.wait = 0.6 + Math.random() * 2.6;
    const id = m.r.id;
    // アップタイムは、ほとんど寝ている。たまに起きて、少しだけ歩いて、また寝る
    if (id === 'u') {
      if (m.asleep) {
        if (this.uptimeAtEaves || Math.random() < 0.75) {
          m.wait = 3 + Math.random() * 4;
          return;
        }
        this.wake(m, true);
      } else if (Math.random() < 0.5) {
        this.wake(m, false);
        m.wait = 4 + Math.random() * 5;
        return;
      }
      m.tx = clamp(m.x + (Math.random() - 0.5) * 140, 0, W);
      m.ty = clamp(m.y + (Math.random() - 0.5) * 100, 0, H);
      return;
    }
    // マージは、お城の中を、うろうろする
    if (id === 'm') {
      const i = this.castleBox().inner;
      m.tx = i.x + 6 + Math.random() * (i.w - S - 12);
      m.ty = i.y + 6 + Math.random() * (i.h - S - 12);
      m.wait = 1.5 + Math.random() * 3.5;
      return;
    }
    // カーソルを追いかける子は、カーソルがページの中にある間は、step で追いかける
    if (m.r.follows && this.mouse) return;
    // ヘッドは、家のまわりにいることが少し多い
    if (id === 'h' && Math.random() < 0.3) {
      const g = this.gardenBox();
      m.tx = g.x + g.w / 2 - S / 2 + (Math.random() - 0.5) * 220;
      m.ty = g.y + 110 + Math.random() * 60;
      return;
    }
    // どこへでも行く。ただ、遠すぎる所へは一度に行かない（いま見えているあたりを、うろうろする）。お城の中（お堀の上）は、えらばない
    for (let i = 0; i < 6; i++) {
      m.tx = clamp(m.x + (Math.random() - 0.5) * 900, 0, W);
      m.ty = clamp(m.y + (Math.random() - 0.5) * 700, 0, H);
      if (!this.blocked(m, m.tx, m.ty)) break;
    }
  }

  private wake(m: Mover, awake: boolean) {
    m.asleep = !awake;
    m.faceText.textContent = awake ? '・u・' : '-u-';
  }

  /** ワーカーのいまの位置（CSS のアニメーションの位置） */
  private workerPos(m: Mover) {
    const t = new DOMMatrix(getComputedStyle(m.body).transform);
    return { x: t.m41, y: t.m42 };
  }

  /** ワーカーは CSS のアニメーションで動く。前の位置からの向きで、顔を向ける */
  private stepWorker(m: Mover) {
    const pos = this.workerPos(m);
    if (m.last) {
      const dx = pos.x - m.last.x;
      const dy = pos.y - m.last.y;
      const moving = Math.hypot(dx, dy) > 0.3 && !this.talking.has('w');
      if (moving) m.angle = nearAngle(m.angle, (Math.atan2(dx, dy) * 180) / Math.PI);
      this.setWalking(m, moving);
    }
    m.last = pos;
    this.drawCube(m);
  }

  private setWalking(m: Mover, on: boolean) {
    m.el.classList.toggle('walking', on);
    m.el.classList.toggle('idle', !on);
  }

  private draw(m: Mover) {
    m.el.style.transform = `translate(${m.x}px, ${m.y}px)`;
    this.drawCube(m);
  }

  private drawCube(m: Mover) {
    const talking = this.talking.has(m.r.id);
    m.cube.style.transform = talking ? 'rotateX(-14deg) rotateY(0deg)' : `rotateX(${TILT}deg) rotateY(${m.angle}deg)`;
  }

  /** ページの CSS を当て直す（プレイヤーが書き換えたとき） */
  applyCss() {
    this.modelStyle.textContent = this.model.css();
    // お堀（お城の border）が変わると、ワーカーの道も変わる
    this.makeRunPath();
    // 屋根がずれているか、傾いていると、雨もり
    this.rain.style.display = roofFixed(this.model) ? 'none' : '';
  }

  /** しゃべる子のところへ、ページを送って、少し寄る（null で、寄るのをやめる） */
  focus(id: string | null) {
    if (!id) {
      this.zoom = 1;
      this.world.style.transform = '';
      return;
    }
    const m = this.movers.get(id);
    if (!m) return;
    const p = id === 'w' ? this.workerPos(m) : { x: m.x, y: m.y };
    const cx = p.x + S / 2;
    const cy = p.y + S / 2;
    // 下は会話の窓に隠れるので、画面の上から 4 割くらいの所に来るように送る
    const max = this.scroller.scrollHeight - this.scroller.clientHeight;
    this.scroller.scrollTo({ top: clamp(cy - this.scroller.clientHeight * 0.4, 0, max), behavior: 'smooth' });
    this.zoom = ZOOM;
    this.world.style.transformOrigin = `${cx}px ${cy}px`;
    this.world.style.transform = `scale(${ZOOM})`;
  }

  /** 話している子は、こちらを向いて止まる */
  setTalking(ids: string[]) {
    this.talking = new Set(ids);
    for (const [id, m] of this.movers) {
      m.el.classList.toggle('talking', this.talking.has(id));
      // ひとりのときは笑っていない子も、話すときは、にこにこする
      if (m.r.aloneFace) m.faceText.textContent = this.talking.has(id) ? m.r.face : m.r.aloneFace;
    }
    if (this.talking.has('w')) this.movers.get('w')!.angle = 0;
  }

  /** 「!」を出す子 */
  setMark(id: string | null) {
    for (const [rid, m] of this.movers) {
      m.body.querySelector('.mark')?.remove();
      if (rid === id) m.body.append(div('mark'));
    }
  }

  /** 吹き出しで、ひとりごと */
  bubble(id: string, text: string, ms = 3200) {
    const m = this.movers.get(id);
    if (!m || this.talking.has(id)) return;
    m.body.querySelector('.bubble')?.remove();
    const b = Object.assign(div('bubble'), { textContent: text });
    m.body.append(b);
    setTimeout(() => b.classList.add('out'), ms);
    setTimeout(() => b.remove(), ms + 500);
  }

  /** 住人の要素（カーソルの合図を出すため） */
  residentEl(id: ResId): HTMLElement {
    return this.movers.get(id)!.el;
  }

  isAsleep(id: string) {
    return !!this.movers.get(id)?.asleep;
  }

  /** 演出 */
  async fx(name: string): Promise<void> {
    if (name === 'linkRoof') {
      // リンクが屋根の下へ行って、持ち上げようとする → 屋根が斜めに（家が見える所まで送ってから）
      this.scrollTo('home');
      const l = this.movers.get('l')!;
      const g = this.gardenBox();
      l.hold = true;
      l.rush = 260; // 「任せろ！」と言ったそばから、急いで屋根へ
      await new Promise<void>((done) => {
        l.tx = g.x + g.w / 2 - 50;
        l.ty = g.y + 70;
        l.goal = done;
      });
      l.rush = undefined;
      // 屋根がななめに押し上がる（ソースにも transform として出る）
      this.model.set('.roof', 'transform', 'rotate(-11deg)');
      await sleep(900);
    }
    if (name === 'roofFixed') {
      const l = this.movers.get('l')!;
      l.hold = false;
      l.wait = 1;
      this.uptimeAtEaves = false;
    }
  }
}

function div(cls: string) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 回る向きが、いちばん近くなるような角度（359° → 1° で、ぐるっと回らないように） */
function nearAngle(prev: number, target: number) {
  let d = ((target - prev) % 360) + 360;
  d = ((d + 180) % 360) - 180;
  return prev + d;
}
