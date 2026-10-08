// ソースのパネル。開いた場所の HTML（日記のコメントもここ）と CSS を出す。
// CSS の値は書き換えられる（鍵のかかった行はだめ）。書き足せる所には「行を書き足す」欄を出す
import { parseLine, validCss, type Area, type PageModel, type Prop, type Rule } from './model';

export class SourcePanel {
  constructor(
    private el: HTMLElement,
    private model: PageModel,
    private toast: (msg: string) => void,
  ) {}

  render() {
    const scroll = this.el.scrollTop;
    this.el.replaceChildren();
    const head = document.createElement('div');
    head.className = 'src-head';
    head.textContent = 'view-source: index.html';
    this.el.append(head);
    // 「ページのはじまり」（いちばんはじめの場所）だけは上に固定。ほかは、新しく読めるようになった所ほど上に出す
    const first = this.model.areas[0];
    const byId = new Map(this.model.areas.map((a) => [a.id, a]));
    const opened = [
      ...(this.model.opened.has(first.id) ? [first] : []),
      ...[...this.model.opened].filter((id) => id !== first.id).reverse().map((id) => byId.get(id)!),
    ];
    if (!opened.length) {
      this.el.append(Object.assign(document.createElement('p'), { className: 'src-empty', textContent: '（まだ、読めるところがない）' }));
    }
    for (const a of opened) this.el.append(this.area(a));
    this.el.scrollTop = scroll;
  }

  /** 開いたばかりの場所まで送る */
  reveal(areaId: string) {
    const target = this.el.querySelector<HTMLElement>(`[data-area="${areaId}"]`);
    if (target) {
      // 上に貼りついている見出し（view-source: index.html）に、場所の名前が隠れないよう、その分だけ下に
      const head = this.el.querySelector<HTMLElement>('.src-head')?.offsetHeight ?? 0;
      const top = target.getBoundingClientRect().top - this.el.getBoundingClientRect().top;
      this.el.scrollTo({ top: this.el.scrollTop + top - head - 8, behavior: 'smooth' });
    }
    target?.classList.add('flash');
    setTimeout(() => target?.classList.remove('flash'), 1600);
  }

  private area(a: Area): HTMLElement {
    const box = document.createElement('section');
    box.className = 'src-area';
    box.dataset.area = a.id;
    const title = document.createElement('div');
    title.className = 'src-title';
    title.textContent = a.title;
    if (a.css.some((r) => r.props.some((p) => !p.locked))) {
      const reset = button('元に戻す', 'src-reset', () => this.model.reset(a.id));
      title.append(reset);
    }
    box.append(title);

    const pre = document.createElement('div');
    pre.className = 'code';
    let inComment = false;
    for (const line of a.html) {
      const row = document.createElement('div');
      // 日記（コメント）の行は、色を変える
      if (line.trimStart().startsWith('<!--')) inComment = true;
      row.className = inComment ? 'ln comment' : 'ln html';
      row.textContent = line;
      if (line.includes('-->')) inComment = false;
      pre.append(row);
    }
    if (a.css.length) {
      pre.append(row('<style>', 'ln html'));
      for (const r of a.css) this.rule(pre, r);
      pre.append(row('</style>', 'ln html'));
    }
    box.append(pre);
    return box;
  }

  private rule(pre: HTMLElement, r: Rule) {
    pre.append(row(`${r.selector} {`, 'ln css-sel'));
    for (const p of r.props) pre.append(this.prop(r, p));
    if (r.allowAdd) {
      const add = document.createElement('div');
      add.className = 'ln add';
      const input = document.createElement('input');
      input.placeholder = '＋ 行を書き足す（例: color: red;）';
      input.spellcheck = false;
      // Enter でも、ほかの所をクリックしても、書いたことになる
      const commit = () => {
        if (!input.value.trim()) return;
        const parsed = parseLine(input.value);
        if (!parsed || !validCss(parsed.prop, parsed.value)) {
          this.toast('その書き方は、CSS として読めないみたい（「名前: 値;」の形で）');
          return;
        }
        if (r.props.some((p) => p.name === parsed.prop && p.locked)) {
          this.toast(`${parsed.prop} の行には、鍵がかかっているみたい。ちがう名前の行を書き足そう`);
          return;
        }
        this.model.add(r.selector, parsed.prop, parsed.value);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commit();
      });
      input.addEventListener('change', commit);
      add.append(input);
      pre.append(add);
    }
    pre.append(row('}', 'ln css-sel'));
  }

  private prop(r: Rule, p: Prop): HTMLElement {
    const line = document.createElement('div');
    line.className = 'ln css-prop';
    line.append(span(`  ${p.name}: `, 'pname'));
    if (p.locked) {
      line.append(span(p.value, 'pval locked'));
    } else {
      const input = document.createElement('input');
      input.className = 'pval';
      input.value = p.value;
      input.spellcheck = false;
      input.size = Math.max(8, p.value.length + 4);
      if (p.options) {
        const id = `opt-${r.selector.replace(/\W/g, '')}-${p.name}`;
        input.setAttribute('list', id);
        const dl = document.createElement('datalist');
        dl.id = id;
        for (const o of p.options) dl.append(Object.assign(document.createElement('option'), { value: o }));
        line.append(dl);
      }
      const commit = () => {
        const v = input.value.trim();
        if (v === p.value) return;
        if (!validCss(p.name, v)) {
          this.toast(`「${v}」は、${p.name} の値としては読めないみたい`);
          input.value = p.value;
          return;
        }
        this.model.set(r.selector, p.name, v);
      };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
      line.append(input);
    }
    line.append(span(';', 'punct'));
    if (p.note) line.append(span(` /* ${p.note} */`, 'note'));
    if (p.added) line.append(button('×', 'src-del', () => this.model.remove(r.selector, p.name)));
    return line;
  }
}

function row(text: string, cls: string) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}

function span(text: string, cls: string) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

function button(text: string, cls: string, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
