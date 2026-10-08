// 住人たちのページ。シャドウ DOM の中に描くので、ページの CSS（プレイヤーが書き換える）が、ゲームの画面に漏れない。
// 住人は角の丸い CSS の立方体。ページの中を縦横無尽に歩きまわり、進む方向に顔を向ける。話すと、こちらを向く
import type { PageModel } from './model';
import { CARDS, LINKS, POSTS } from './site';
import { RESIDENTS, roofFixed, type Resident, type ResId } from './story';

const S = 46; // 立方体の大きさ
/** 上から見下ろす角度（頭のてっぺんと、進む方向の面が見える） */
const TILT = -58;

const BASE_CSS = `
:host { display: block; }
/* 住人が歩ける世界。ページ（.page）の外の、まわりの余白まで歩いていける */
.world { position: relative; min-height: 100%; padding: 1px 0; overflow: hidden; }
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
  position: relative; margin-top: 20px; height: 520px; border-radius: 16px;
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

.soon {
  position: absolute; left: 32px; right: 32px; height: 86px; border: 2px dashed #d8cfc2; border-radius: 14px;
  display: grid; place-items: center; color: #b8aca0; font-size: 13px; letter-spacing: 0.3em;
}
.soon.s1 { top: 300px; } .soon.s2 { top: 404px; }
.soon.river { border: none; background: linear-gradient(90deg, #cfe6f4, #b8d8ee, #cfe6f4); color: #6a98bc; letter-spacing: 0.1em; }

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

/* ワーカーは、CSS のアニメーションで、ページの中を走りまわる（止めると、そこで止まる） */
@keyframes run {
  0%   { transform: translate(calc(var(--pw) * 0.10), calc(var(--ph) * 0.12)); }
  12%  { transform: translate(calc(var(--pw) * 0.92), calc(var(--ph) * 0.06)); }
  26%  { transform: translate(calc(var(--pw) * 0.60), calc(var(--ph) * 0.35)); }
  40%  { transform: translate(calc(var(--pw) * 0.04), calc(var(--ph) * 0.50)); }
  55%  { transform: translate(calc(var(--pw) * 0.85), calc(var(--ph) * 0.72)); }
  70%  { transform: translate(calc(var(--pw) * 0.30), calc(var(--ph) * 0.95)); }
  85%  { transform: translate(calc(var(--pw) * 0.50), calc(var(--ph) * 0.25)); }
  100% { transform: translate(calc(var(--pw) * 0.10), calc(var(--ph) * 0.12)); }
}
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
  private soon: HTMLElement;
  private movers = new Map<string, Mover>();
  private mouse: { x: number; y: number } | null = null;
  private talking = new Set<string>();
  /** 雨もりが直るまで、アップタイムは軒下で寝ている */
  uptimeAtEaves = true;
  /** ページの左はし（幅が変わってページが動いたら、住人もいっしょに動かす） */
  private pageLeft = 0;
  private workerPaused = false;

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
    this.root.append(base, this.modelStyle);

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
        <div class="soon s1">準 備 中</div>
        <div class="soon s2">準 備 中</div>
      </div>
      <section class="sec" id="residents"><h2>住人たち</h2><div class="cards"></div></section>
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
    this.soon = this.page.querySelector('.soon.s1')!;
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('i');
      d.style.left = `${(i * 7) % 40}px`;
      d.style.animationDelay = `${i * 0.15}s`;
      this.rain.append(d);
    }
    for (const r of RESIDENTS) this.addResident(r);

    this.world.addEventListener('mousemove', (e) => {
      const b = this.world.getBoundingClientRect();
      this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
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

  /** ワーカーが走りまわる範囲（世界ぜんぶ）を、CSS の変数で渡す */
  private sizeVars() {
    this.world.style.setProperty('--pw', `${this.world.clientWidth - S}px`);
    this.world.style.setProperty('--ph', `${this.world.clientHeight - S}px`);
    // ソースを開け閉めしてページが横に動いたら、住人も同じだけ動く（軒下のアップタイムが、軒下からはずれないように）
    const left = this.page.offsetLeft;
    const dx = left - this.pageLeft;
    this.pageLeft = left;
    if (!dx) return;
    const W = this.world.clientWidth - S;
    for (const m of this.movers.values()) {
      if (m.r.id === 'w') continue;
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
        faceText.textContent = r.face;
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
    };
    [m.x, m.y] = spots[m.r.id];
    m.tx = m.x;
    m.ty = m.y;
    if (m.r.id === 'u') m.asleep = true;
    this.draw(m);
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
        m.x += (dx / dist) * v;
        m.y += (dy / dist) * v;
        m.angle = nearAngle(m.angle, (Math.atan2(dx, dy) * 180) / Math.PI);
        this.setWalking(m, true);
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
    // カーソルを追いかける子は、カーソルがページの中にある間は、step で追いかける
    if (m.r.follows && this.mouse) return;
    // ヘッドは、家のまわりにいることが少し多い
    if (id === 'h' && Math.random() < 0.3) {
      const g = this.gardenBox();
      m.tx = g.x + g.w / 2 - S / 2 + (Math.random() - 0.5) * 220;
      m.ty = g.y + 110 + Math.random() * 60;
      return;
    }
    // どこへでも行く。ただ、遠すぎる所へは一度に行かない（いま見えているあたりを、うろうろする）
    m.tx = clamp(m.x + (Math.random() - 0.5) * 900, 0, W);
    m.ty = clamp(m.y + (Math.random() - 0.5) * 700, 0, H);
  }

  private wake(m: Mover, awake: boolean) {
    m.asleep = !awake;
    m.faceText.textContent = awake ? '・u・' : '-u-';
  }

  /** ワーカーのいまの位置（CSS のアニメーションの位置 ＋ 画面内へ戻るためにずらした分） */
  private workerPos(m: Mover) {
    const cs = getComputedStyle(m.body);
    const t = new DOMMatrix(cs.transform);
    const [sx = 0, sy = 0] = cs.translate === 'none' ? [] : cs.translate.split(' ').map(parseFloat);
    return { x: t.m41 + sx, y: t.m42 + (sy || 0) };
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
    const w = this.movers.get('w');
    const paused = !!w && getComputedStyle(w.body).animationPlayState === 'paused';
    if (w && this.workerPaused && !paused) {
      // また走り出したら、ずらした分を戻す
      w.body.style.transition = 'translate 0.8s ease';
      w.body.style.translate = '0px 0px';
    }
    this.workerPaused = paused;
    // 屋根がずれているか、傾いていると、雨もり
    this.rain.style.display = roofFixed(this.model) ? 'none' : '';
  }

  /** 話している子は、こちらを向いて止まる */
  setTalking(ids: string[]) {
    this.talking = new Set(ids);
    for (const [id, m] of this.movers) m.el.classList.toggle('talking', this.talking.has(id));
    if (this.talking.has('w')) this.movers.get('w')!.angle = 0;
  }

  /** 止まったワーカーが見えないところにいたら、見えるところまで歩いてきて、止まる */
  async settleWorker(): Promise<void> {
    const m = this.movers.get('w');
    if (!m || !this.workerPaused) return;
    const pos = this.workerPos(m);
    const pad = 60;
    const W = this.world.clientWidth - S;
    const top = this.scroller.scrollTop;
    // 下のほうは会話の窓に隠れるので、少し上までにする
    const bottom = top + this.scroller.clientHeight - S - 170;
    const tx = clamp(pos.x, pad, W - pad);
    const ty = clamp(pos.y, top + pad, Math.max(top + pad, bottom));
    const dist = Math.hypot(tx - pos.x, ty - pos.y);
    if (dist < 1) return;
    const sec = clamp(dist / 520, 0.5, 2.2);
    const cs = getComputedStyle(m.body);
    const [sx = 0, sy = 0] = cs.translate === 'none' ? [] : cs.translate.split(' ').map(parseFloat);
    m.body.style.transition = `translate ${sec}s ease-out`;
    m.body.style.translate = `${sx + tx - pos.x}px ${(sy || 0) + ty - pos.y}px`;
    await sleep(sec * 1000 + 250);
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
      // リンクが屋根の下へ行って、持ち上げようとする → 屋根が斜めに
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
    if (name === 'river') {
      this.soon.classList.add('river');
      this.soon.textContent = '〜 川 〜（つづく）';
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
