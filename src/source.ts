// ソースのパネル。開いた場所の HTML（日記のコメントもここ）と CSS を出す。
// CSS の値は書き換えられる（鍵のかかった行はだめ）。書き足せる所には「行を書き足す」欄を出す
import { CAPACITY, parseLine, validCss, type Area, type PageModel, type Prop, type Rule } from './model';

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
    // 容量メーター（引っ越し先に、ページが入るか）。出てからは、書き換えるたびに動く
    if (this.model.flags.has('meter')) head.append(this.meter());
    this.el.append(head);
    // 「ページのはじまり」（いちばんはじめの場所）だけは上に固定。ほかは、新しく読めるようになった所ほど上に出す
    const first = this.model.areas[0];
    const byId = new Map(this.model.areas.map((a) => [a.id, a]));
    const opened = [
      ...(this.model.opened.has(first.id) ? [first] : []),
      ...[...this.model.opened].filter((id) => id !== first.id).reverse().map((id) => byId.get(id)!),
    ].filter((a) => !this.model.gone(a.id)); // 消した場所は、出さない
    if (!opened.length) {
      this.el.append(Object.assign(document.createElement('p'), { className: 'src-empty', textContent: '（まだ、読めるところがない）' }));
    }
    for (const a of opened) this.el.append(this.area(a));
    this.el.scrollTop = scroll;
  }

  /** 容量メーター: 棒と、「いまの字数 / 入る字数」 */
  private meter(): HTMLElement {
    const size = this.model.size();
    const over = size - CAPACITY;
    const box = document.createElement('div');
    box.className = over > 0 ? 'src-meter over' : 'src-meter';
    const bar = document.createElement('div');
    bar.className = 'src-meter-bar';
    const fillEl = document.createElement('i');
    fillEl.style.width = `${Math.min(100, (size / CAPACITY) * 100)}%`;
    bar.append(fillEl);
    const text = document.createElement('span');
    text.textContent = `容量 ${size.toLocaleString()} / ${CAPACITY.toLocaleString()} 字${over > 0 ? `（${over} 字 はみ出し）` : `（あと ${-over} 字）`}`;
    box.append(bar, text);
    return box;
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
    // 荷造りが済んだら、くくった荷（リンクと、ページの終わりのほか）には、札をつける
    const packed = this.model.flags.has('packed');
    if (packed && !['link', 'end', 'last', 'door'].includes(a.id)) title.append(span('🔒 くくった荷', 'src-tied'));
    if (!packed && a.css.some((r) => r.props.some((p) => !p.locked))) {
      const reset = button('元に戻す', 'src-reset', () => this.model.reset(a.id));
      title.append(reset);
    }
    // かたまりごと消せる場所（引っ越しの荷物を、減らすとき）
    if (a.removable && this.model.attrSlots.has(a.removable)) {
      title.append(button('× この かたまりを消す', 'src-remove', () => this.model.removeArea(a.id)));
    }
    box.append(title);

    const pre = document.createElement('div');
    pre.className = 'code';
    let inComment = false;
    a.html.forEach((line, i) => {
      if (a.tag && i === a.tag.line && this.model.attrSlots.has(a.tag.selector)) {
        pre.append(this.tagLine(a.tag));
        return;
      }
      if (a.comment && i === a.comment.line) {
        pre.append(this.commentLine(a.comment));
        return;
      }
      if (a.dyn?.[i]) {
        this.dynLine(pre, a.dyn[i]);
        return;
      }
      const row = document.createElement('div');
      // 日記（コメント）の行は、色を変える
      if (line.trimStart().startsWith('<!--')) inComment = true;
      row.className = inComment ? 'ln comment' : 'ln html';
      row.textContent = line;
      if (line.includes('-->')) inComment = false;
      pre.append(row);
    });
    if (a.css.length) {
      pre.append(row('<style>', 'ln html'));
      for (const r of a.css) this.rule(pre, r);
      pre.append(row('</style>', 'ln html'));
    }
    box.append(pre);
    return box;
  }

  /**
   * 中身が変わる行（ページの終わりの物）: 管理人の最後の日記を閉じる印（#dclose）・オーバーフローの おみやげの石（#stones）・ページを閉じるタグ（#close）。
   * 打てるようになったら（印が attrSlots についたら）、欄や × を出す
   */
  private dynLine(pre: HTMLElement, d: { key: string; edit?: string }) {
    const cur = this.model.texts.get(d.key) ?? '';
    const open = !!d.edit && this.model.attrSlots.has(d.edit);
    // 最後の日記が閉じていないあいだは、そのあとの行も、コメントに のみこまれている
    const swallowed = this.model.opened.has('last') && this.model.texts.get('#dclose') !== '-->';
    const cls = swallowed || d.key === '#dclose' ? 'ln comment' : 'ln html';
    const field = (placeholder: string, want: string, wrong: string) => {
      const add = document.createElement('div');
      add.className = 'ln add';
      const input = document.createElement('input');
      input.placeholder = placeholder;
      input.spellcheck = false;
      const commit = () => {
        const v = input.value.trim();
        if (!v) return;
        if (v.toLowerCase() !== want) {
          this.toast(wrong);
          return;
        }
        this.model.setText(d.key, want);
      };
      onEnter(input, commit);
      input.addEventListener('change', commit);
      add.append(input);
      pre.append(add);
    };
    if (d.key === '#dclose') {
      if (cur) pre.append(row(cur, cls));
      else if (open) field('＋ ここに、コメントを閉じる印を書く', '-->', 'コメントを閉じる印は、--> みたい');
      return;
    }
    if (d.key === '#stones') {
      if (!cur) return;
      const line = row(cur, cls);
      // 置いていくと決まったら、× で消せる
      if (open) line.append(button('×', 'src-del', () => this.model.setText(d.key, '')));
      pre.append(line);
      return;
    }
    // #close: ページを閉じるタグ。問題17: h か > のかわりに残った子は、顔つきの字として、ここに残る
    const stayH = this.model.flags.has('stayH');
    const stayV = this.model.flags.has('stayV');
    const pick = this.model.attrSlots.has('pick');
    if (stayH || stayV) {
      const line = document.createElement('div');
      line.className = cls;
      if (stayH) line.append(span('</', ''), span('-h-', 'src-face h'), span('tml>', ''));
      else line.append(span('</html', ''), span(this.model.flags.has('vTurned') ? '・>・' : '・v・', 'src-face v'));
      pre.append(line);
      return;
    }
    // 問題17: </html> の字を、1つずつ、クリックして消せる（h か > を消すと、その子が、かわりに立つ）
    if (pick && cur === '</html>') {
      const line = document.createElement('div');
      line.className = `${cls} cm-line`;
      [...cur].forEach((ch, i) => {
        const cut = () => this.model.setText(d.key, cur.slice(0, i) + cur.slice(i + 1));
        line.append(Object.assign(button(ch, 'cm-cut', cut), { title: 'クリックして、消す' }));
      });
      pre.append(line);
      return;
    }
    // #close: リンクが l のかわりに立っているあいだは、顔を出す
    if (cur === '</htm>' && this.model.flags.has('lLetter')) {
      const line = document.createElement('div');
      line.className = cls;
      line.append(span('</htm', ''), span('・l・', 'src-face'), span('>', ''));
      pre.append(line);
    } else if (cur) pre.append(row(cur, cls));
    if (open && cur !== '</html>' && !pick)
      field(cur ? '＋ 打ち直す（</html>）' : '＋ ここに、ページを閉じるタグを書く', '</html>', 'ここには、ページを閉じるタグ </html> を書くみたい');
  }

  /** コメントを外せる行（例: <!-- <div class="t">T_T</div> -->）。<!-- と --> を、クリックして消す */
  private commentLine(c: NonNullable<Area['comment']>): HTMLElement {
    const line = document.createElement('div');
    const openCut = this.model.flags.has(c.open);
    const closeCut = this.model.flags.has(c.close);
    // 両方消えたら、ふつうの HTML の行。片方でも残っていれば、まだコメントの色
    line.className = openCut && closeCut ? 'ln html' : 'ln comment cm-line';
    const mark = (text: string, key: string) =>
      this.model.attrSlots.has(c.slot)
        ? Object.assign(button(text, 'cm-cut', () => this.model.cut(key)), { title: 'クリックして、消す' })
        : span(text, '');
    line.append(span(c.indent, ''));
    if (!openCut) line.append(mark('<!--', c.open), span(' ', ''));
    line.append(span(c.inner, ''));
    if (!closeCut) line.append(span(' ', ''), mark('-->', c.close));
    return line;
  }

  /** 属性を書き足せるタグの行（例: <div class="sign" ＋属性>立入禁止</div>） */
  private tagLine(tag: NonNullable<Area['tag']>): HTMLElement {
    const line = document.createElement('div');
    line.className = 'ln html tag-line';
    line.append(span(tag.open, 'tag'));
    const tied = this.model.tied(tag.selector);
    for (const [name, value] of this.model.attrs.get(tag.selector) ?? []) {
      line.append(span(` ${name}="${value}"`, 'attr'));
      if (!tied) line.append(button('×', 'src-del', () => this.model.removeAttr(tag.selector, name)));
    }
    if (tied) {
      line.append(span(`>${this.model.texts.get(tag.selector) ?? tag.text}${tag.close}`, 'tag'));
      return line;
    }
    const input = document.createElement('input');
    input.className = 'attr-add';
    input.placeholder = '＋ 属性';
    input.spellcheck = false;
    input.size = 10;
    const commit = () => {
      const v = input.value.trim();
      if (!v) return;
      const m = v.match(/^([a-zA-Z-]+)(?:\s*=\s*["']?([^"']*)["']?)?$/);
      const name = m?.[1].toLowerCase();
      // v のカード: ここに名前を打とうとした人へ（名前は、ページのカードに打つ）
      if (tag.selector === '.v-name' && name !== 'contenteditable') {
        this.toast('ここに書くのは、名前ではなく「属性」みたい。contenteditable と書き足すと、ページのカードに 名前を打てるようになる');
        input.value = '';
        return;
      }
      if (!m) {
        this.toast('属性は、「名前」か「名前="値"」の形で書くみたい');
        return;
      }
      if (name !== 'contenteditable') {
        this.toast(`「${name}」は、ここでは使えないみたい`);
        return;
      }
      this.model.setAttr(tag.selector, name, m[2] === undefined || m[2] === '' ? 'true' : m[2]);
    };
    onEnter(input, commit);
    input.addEventListener('change', commit);
    line.append(input, span(`>${this.model.texts.get(tag.selector) ?? tag.text}${tag.close}`, 'tag'));
    return line;
  }

  private rule(pre: HTMLElement, r: Rule) {
    pre.append(row(`${r.selector} {`, 'ln css-sel'));
    for (const p of r.props) pre.append(this.prop(r, p));
    if (r.allowAdd && !this.model.tied(r.selector)) {
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
      onEnter(input, commit);
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
    const tied = this.model.tied(r.selector);
    if (p.locked || tied) {
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
      onEnter(input, () => input.blur());
      line.append(input);
    }
    line.append(span(';', 'punct'));
    if (p.note) line.append(span(` /* ${p.note} */`, 'note'));
    if (p.added && !tied) line.append(button('×', 'src-del', () => this.model.remove(r.selector, p.name)));
    return line;
  }
}

/**
 * 入力欄で Enter を押したとき。日本語入力のままだと、Enter のキーが「Enter」として届かないことがあるので、
 * 「改行を入れようとした」合図（beforeinput）でも受ける。変換を決める Enter は、数えない
 */
function onEnter(input: HTMLInputElement, fn: () => void) {
  // ふつうの Enter では、両方の合図が続けて来るので、1回だけ受ける
  let last = -1000;
  const once = () => {
    if (performance.now() - last < 100) return;
    last = performance.now();
    fn();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) once();
  });
  input.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertLineBreak') once();
  });
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
