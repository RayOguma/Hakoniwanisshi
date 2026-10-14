// ページの形（データ）。ソースのパネルに出す字と、ページに当てる本物の CSS は、どちらもここから作る。
// 書き換えられるのは CSS の値だけ（HTML と、住人の顔の文字には鍵がかかっている）
import type { Line } from './story';

export interface Prop {
  name: string;
  value: string;
  /** 値をクリックしたときに出す候補 */
  options?: string[];
  /** 書き換えられない */
  locked?: boolean;
  /** 行のうしろの、管理人のメモ（/* … *\/） */
  note?: string;
  /** プレイヤーが書き足した行（× で消せる） */
  added?: boolean;
}

export interface Rule {
  selector: string;
  props: Prop[];
  /** プレイヤーが行を書き足せる */
  allowAdd?: boolean;
}

export interface Area {
  id: string;
  title: string;
  /** HTML の行（日記のコメントもここ）。書き換えられない */
  html: string[];
  css: Rule[];
  /** はじめてソースでこの場所を見たときの、主人公の声（日記を読んで思うこと） */
  notice?: Line[];
  /**
   * 属性を書き足せるタグ（問題で開いたあとだけ）。html の line 行目が、open（例: <div class="sign"）＋属性＋ > ＋字＋ close になる。
   * 字は、ページで打ち換えたものを出す
   */
  tag?: { line: number; selector: string; open: string; text: string; close: string };
  /**
   * コメントを外せる行（問題で開いたあとだけ）。html の line 行目が、<!-- ＋ inner ＋ --> になる。
   * <!-- と --> は、クリックして消せる。消したかどうかは、flags の open・close で覚える。slot は、消せるようになった印（attrSlots）
   */
  comment?: { line: number; indent: string; inner: string; open: string; close: string; slot: string };
  /**
   * 中身が変わる行。html の その行は、texts の key の字になる（空なら、行ごと出さない）。
   * edit があれば、その印（attrSlots）がついたあと、プレイヤーが打てる（ページの終わりの、閉じタグ）
   */
  dyn?: Record<number, { key: string; edit?: string }>;
  /** かたまりごと消せる場所（問題で開いたあとだけ）。値は、消せるようになった印（attrSlots）の名前。消したかどうかは、flags の「gone:場所」 */
  removable?: string;
  /** 容量に数えない場所（引っ越し用のリンク。ことりサーバーの決まりで、字数に入らない） */
  free?: boolean;
}

/** 書き換えの前の値（「元に戻す」に使う） */
export type Snapshot = Record<string, Prop[]>;

/** セーブするページの形 */
export interface ModelSave {
  css: Snapshot;
  attrs: [string, [string, string][]][];
  texts: [string, string][];
  opened: string[];
  attrSlots: string[];
  flags?: string[];
}

/** 引っ越し先（ことりサーバー）に置ける、ページの大きさ（字数） */
export const CAPACITY = 10000;

export class PageModel {
  areas: Area[];
  opened = new Set<string>();
  /** HTML のタグに書き足した属性（例: .sign → contenteditable=true） */
  attrs = new Map<string, Map<string, string>>();
  /** ページの上で打ち換えた字（例: .sign → どうぞ） */
  texts = new Map<string, string>();
  /** 属性を書き足せるようになったタグ */
  attrSlots = new Set<string>();
  /** 物語の進みぐあいの印（例: noticeSeen = サービス終了の帯を読んだ） */
  flags = new Set<string>();
  /** 容量が足りなくて、書き換えを受けつけなかったときに呼ぶ */
  onFull: ((what: string) => void) | null = null;
  private initial: Snapshot;
  private listeners: ((rule: Rule, prop: string) => void)[] = [];

  constructor(areas: Area[]) {
    this.areas = areas;
    this.initial = this.snapshot();
  }

  onChange(fn: (rule: Rule, prop: string) => void) {
    this.listeners.push(fn);
  }

  rule(selector: string): Rule | undefined {
    for (const a of this.areas) for (const r of a.css) if (r.selector === selector) return r;
    return undefined;
  }

  get(selector: string, prop: string): string | undefined {
    return this.rule(selector)?.props.find((p) => p.name === prop)?.value;
  }

  /**
   * 荷造りが済んで（flags の packed）、ひもでくくられた物か。くくられた物は、もう書き換えられない。
   * ひもの外にあるのは、リンク（.l）と、ページの終わりの物（# で始まる字: 石・閉じタグ・最後の日記を閉じる印）だけ
   */
  tied(selector: string) {
    return this.flags.has('packed') && selector !== '.l' && !selector.startsWith('#');
  }

  set(selector: string, prop: string, value: string) {
    const r = this.rule(selector);
    const p = r?.props.find((q) => q.name === prop);
    if (!r || !p || p.locked || this.tied(selector)) return;
    const old = p.value;
    if (!this.fits(() => (p.value = value), () => (p.value = old), selector)) return;
    this.emit(r, prop);
  }

  add(selector: string, prop: string, value: string) {
    const r = this.rule(selector);
    if (!r || this.tied(selector)) return;
    const old = r.props.find((p) => p.name === prop);
    if (old?.locked) return;
    const before = structuredClone(r.props);
    const write = () => {
      if (old) old.value = value;
      else r.props.push({ name: prop, value, added: true });
    };
    if (!this.fits(write, () => (r.props = before), selector)) return;
    this.emit(r, prop);
  }

  remove(selector: string, prop: string) {
    const r = this.rule(selector);
    if (!r || this.tied(selector)) return;
    r.props = r.props.filter((p) => !(p.name === prop && p.added));
    this.emit(r, prop);
  }

  attr(selector: string, name: string): string | undefined {
    return this.attrs.get(selector)?.get(name);
  }

  setAttr(selector: string, name: string, value: string) {
    if (this.tied(selector)) return;
    if (!this.attrs.has(selector)) this.attrs.set(selector, new Map());
    const m = this.attrs.get(selector)!;
    if (!this.fits(() => m.set(name, value), () => m.delete(name), selector)) return;
    this.emit({ selector, props: [] }, `@${name}`);
  }

  removeAttr(selector: string, name: string) {
    if (this.tied(selector)) return;
    this.attrs.get(selector)?.delete(name);
    this.emit({ selector, props: [] }, `@${name}`);
  }

  /** コメントの印（<!-- や -->）を消す。key は、消したことを覚える flags の名前 */
  cut(key: string) {
    this.flags.add(key);
    this.emit({ selector: key, props: [] }, '#cut');
  }

  setText(selector: string, text: string) {
    if (this.tied(selector)) return;
    const had = this.texts.has(selector);
    const old = this.texts.get(selector);
    const undo = () => (had ? this.texts.set(selector, old!) : this.texts.delete(selector));
    if (!this.fits(() => this.texts.set(selector, text), undo, selector)) {
      // ページの上で打った字を、元に戻すため（知らせるだけ。中身は変わっていない）
      this.emit({ selector, props: [] }, '#full');
      return;
    }
    this.emit({ selector, props: [] }, '#text');
  }

  /** 場所を、かたまりごと消す（ソースからも、ページからも、なくなる。戻せない） */
  removeArea(areaId: string) {
    if (this.flags.has('packed')) return;
    this.flags.add(`gone:${areaId}`);
    this.emit({ selector: `#area:${areaId}`, props: [] }, '#gone');
  }

  /** その場所が、消されたか */
  gone(areaId: string) {
    return this.flags.has(`gone:${areaId}`);
  }

  /** ソースの1行（タグに書き足した属性・打ち換えた字・外したコメントの印を、反映した形） */
  htmlLine(a: Area, i: number): string {
    if (a.tag && i === a.tag.line) {
      const attrs = [...(this.attrs.get(a.tag.selector) ?? [])].map(([n, v]) => ` ${n}="${v}"`).join('');
      return `${a.tag.open}${attrs}>${this.texts.get(a.tag.selector) ?? a.tag.text}${a.tag.close}`;
    }
    if (a.dyn?.[i]) return this.texts.get(a.dyn[i].key) ?? '';
    if (a.comment && i === a.comment.line) {
      const c = a.comment;
      return `${c.indent}${this.flags.has(c.open) ? '' : '<!-- '}${c.inner}${this.flags.has(c.close) ? '' : ' -->'}`;
    }
    return a.html[i];
  }

  /** その場所の、ソースの字数（改行は数えない） */
  areaSize(a: Area): number {
    const lines = a.html.map((_, i) => this.htmlLine(a, i));
    if (a.css.length) {
      lines.push('<style>', '</style>');
      for (const r of a.css) {
        lines.push(`${r.selector} {`, '}');
        for (const p of r.props) lines.push(`  ${p.name}: ${p.value};${p.note ? ` /* ${p.note} */` : ''}`);
      }
    }
    return lines.reduce((n, l) => n + [...l].length, 0);
  }

  /**
   * ページの大きさ（字数）。ソースに出ている字（消した場所は、数えない）に、ソースに出ていない分（日誌の記事など。#pad）を足したもの。
   * #pad は、容量メーターが出るときに決める（meterOn）
   */
  size(): number {
    const shown = this.areas.filter((a) => !this.gone(a.id) && !a.free).reduce((n, a) => n + this.areaSize(a), 0);
    return shown + Number(this.texts.get('#pad') ?? 0);
  }

  /**
   * 容量メーターを出す。はじめは、overBy 字だけ はみ出すように、ソースに出ていない分（#pad）を決める
   * （プレイヤーが それまでに書き足したもの・つけた名前の長さが ちがっても、同じだけ はみ出すように）
   */
  meterOn(overBy: number) {
    if (this.flags.has('meter')) return;
    this.texts.set('#pad', '0');
    this.texts.set('#pad', String(CAPACITY + overBy - this.size()));
    this.flags.add('meter');
  }

  /**
   * 書き換えてみて、容量に入らなければ、元に戻す（メーターが出てから。もう はみ出しているときは、増える書き換えだけ断る）。
   * 入ったら true
   */
  private fits(write: () => void, undo: () => void, what: string): boolean {
    if (!this.flags.has('meter')) {
      write();
      return true;
    }
    const before = this.size();
    write();
    const after = this.size();
    if (after <= CAPACITY || after <= before) return true;
    undo();
    this.onFull?.(what);
    return false;
  }

  /** 場所ごとに、はじめの形に戻す */
  reset(areaId: string) {
    const a = this.areas.find((x) => x.id === areaId);
    if (!a || this.flags.has('packed')) return;
    for (const r of a.css) {
      r.props = structuredClone(this.initial[r.selector]);
      this.emit(r, '*');
    }
  }

  /** セーブ用に、いまの形を書き出す（CSS の値・書き足した属性・打ち換えた字・開いた場所） */
  dump(): ModelSave {
    return {
      css: this.snapshot(),
      attrs: [...this.attrs].map(([sel, m]) => [sel, [...m]]),
      texts: [...this.texts],
      opened: [...this.opened],
      attrSlots: [...this.attrSlots],
      flags: [...this.flags],
    };
  }

  /** セーブした形に戻す（ページへの反映は、呼んだ側で行う） */
  load(d: ModelSave) {
    for (const a of this.areas)
      for (const r of a.css) if (d.css[r.selector]) r.props = structuredClone(d.css[r.selector]);
    this.attrs = new Map(d.attrs.map(([sel, kv]) => [sel, new Map(kv)]));
    this.texts = new Map(d.texts);
    this.opened = new Set(d.opened);
    this.attrSlots = new Set(d.attrSlots);
    this.flags = new Set(d.flags ?? []);
  }

  private emit(r: Rule, prop: string) {
    for (const fn of this.listeners) fn(r, prop);
  }

  private snapshot(): Snapshot {
    const s: Snapshot = {};
    for (const a of this.areas) for (const r of a.css) s[r.selector] = structuredClone(r.props);
    return s;
  }

  /** ページに当てる CSS（body は、ページの外枠 .page に読みかえる） */
  css(): string {
    const out: string[] = [];
    for (const a of this.areas) {
      // 消した場所の決まりは、もう ない
      if (this.gone(a.id)) continue;
      for (const r of a.css) {
        const sel = r.selector === 'body' ? '.page' : r.selector;
        out.push(`${sel} { ${r.props.map((p) => `${p.name}: ${p.value};`).join(' ')} }`);
      }
    }
    return out.join('\n');
  }
}

/** 書いた値が、CSS として正しいか */
export function validCss(prop: string, value: string): boolean {
  if (!/^[a-z-]+$/.test(prop)) return false;
  return typeof CSS !== 'undefined' && CSS.supports(prop, value);
}

/** 「animation-play-state: paused;」のような1行を読む */
export function parseLine(line: string): { prop: string; value: string } | null {
  const m = line.trim().match(/^([a-zA-Z-]+)\s*:\s*([^;]+?)\s*;?$/);
  if (!m) return null;
  return { prop: m[1].toLowerCase(), value: m[2].trim() };
}
