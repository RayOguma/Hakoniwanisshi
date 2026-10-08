// ページの形（データ）。ソースのパネルに出す字と、ページに当てる本物の CSS は、どちらもここから作る。
// 書き換えられるのは CSS の値だけ（HTML と、住人の顔の文字には鍵がかかっている）

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
}

/** 書き換えの前の値（「元に戻す」に使う） */
export type Snapshot = Record<string, Prop[]>;

export class PageModel {
  areas: Area[];
  opened = new Set<string>();
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

  set(selector: string, prop: string, value: string) {
    const r = this.rule(selector);
    const p = r?.props.find((q) => q.name === prop);
    if (!r || !p || p.locked) return;
    p.value = value;
    this.emit(r, prop);
  }

  add(selector: string, prop: string, value: string) {
    const r = this.rule(selector);
    if (!r) return;
    const old = r.props.find((p) => p.name === prop);
    if (old?.locked) return;
    if (old) old.value = value;
    else r.props.push({ name: prop, value, added: true });
    this.emit(r, prop);
  }

  remove(selector: string, prop: string) {
    const r = this.rule(selector);
    if (!r) return;
    r.props = r.props.filter((p) => !(p.name === prop && p.added));
    this.emit(r, prop);
  }

  /** 場所ごとに、はじめの形に戻す */
  reset(areaId: string) {
    const a = this.areas.find((x) => x.id === areaId);
    if (!a) return;
    for (const r of a.css) {
      r.props = structuredClone(this.initial[r.selector]);
      this.emit(r, '*');
    }
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
    for (const a of this.areas)
      for (const r of a.css) {
        const sel = r.selector === 'body' ? '.page' : r.selector;
        out.push(`${sel} { ${r.props.map((p) => `${p.name}: ${p.value};`).join(' ')} }`);
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
