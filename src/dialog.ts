// 会話の窓。ブラウザの下に重ねて出す。クリック・スペース・Enter で次へ。選択肢はボタン（選んだものだけの会話もある）
import { settings, SPEED_CPS } from './settings';
import { resident, type Choice, type Line, type Who } from './story';

/** ログに残す1行（選択肢で選んだものは choice） */
interface LogLine {
  who: Who;
  text: string;
  choice?: boolean;
}

export class Dialog {
  busy = false;
  /** これまでの会話（ログ） */
  private log: LogLine[] = [];
  private logEl: HTMLElement | null = null;

  constructor(
    private el: HTMLElement,
    /** 話し手が変わったとき（住人をこちらに向ける） */
    private onSpeaker: (who: Who | null, far?: boolean, text?: string) => void,
    /** せりふの前の演出（屋根がななめになる、など） */
    private onFx: (name: string) => Promise<void>,
  ) {}

  async play(lines: Line[]): Promise<void> {
    this.busy = true;
    this.el.hidden = false;
    await this.run(lines);
    this.onSpeaker(null);
    this.el.hidden = true;
    this.busy = false;
  }

  private async run(lines: Line[]) {
    for (const l of lines) {
      if ('choice' in l) {
        const picked = await this.choose(l.choice);
        if (picked.then) await this.run(picked.then);
        continue;
      }
      if (l.fx) {
        // 演出のあいだは、だれもこちらを向いて止まっていない（話し手が歩いていけるように）
        this.onSpeaker(null);
        this.el.hidden = true;
        await this.onFx(l.fx);
        this.el.hidden = false;
      }
      await this.say(l.who, l.text, l.far);
    }
  }

  private async say(who: Who, text: string, far?: boolean): Promise<void> {
    this.onSpeaker(who === 'narr' || who === 'me' ? null : who, far, text);
    this.log.push({ who, text });
    this.el.replaceChildren(this.logButton());
    const r = resident(who);
    if (r || who === 'me') {
      const name = document.createElement('div');
      name.className = 'dlg-name';
      if (r) {
        name.style.background = r.color;
        const face = Object.assign(document.createElement('span'), { className: 'dlg-face', textContent: r.face });
        name.append(face);
        // v は、名前をつけてもらうまで、顔だけ
        if (r.name) name.append(Object.assign(document.createElement('span'), { className: 'dlg-who', textContent: r.name }));
      } else {
        name.classList.add('me');
        name.textContent = 'あなた';
      }
      this.el.append(name);
    }
    const body = document.createElement('div');
    body.className = who === 'narr' ? 'dlg-text narr' : who === 'me' ? 'dlg-text me' : 'dlg-text';
    // オーバーフローのせりふは、折り返さずに、窓の右からはみ出す
    if (who === 'o') body.classList.add('spill');
    // クロスは、しゃべらない。札に書いた字を見せる（〔 〕は外して、札の形で出す）
    body.innerHTML =
      who === 'x' ? `<span class="dlg-board">${codeMarks(text.replace(/^〔|〕$/g, ''))}</span>` : codeMarks(text);
    const next = document.createElement('div');
    next.className = 'dlg-next';
    next.textContent = '▼';
    this.el.append(body, next);
    await typeOut(this.el, body);
    return waitNext(this.el, () => !!this.logEl);
  }

  /** 会話の窓の右上の「ログ」ボタン */
  private logButton() {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'dlg-log-btn', textContent: 'ログ' });
    b.addEventListener('click', (e) => {
      e.stopPropagation(); // 会話を進めない
      this.openLog();
    });
    return b;
  }

  /** これまでの会話を、一覧で見せる（いちばん下が、いまのせりふ） */
  private openLog() {
    if (this.logEl) return;
    const wrap = Object.assign(document.createElement('div'), { id: 'log' });
    const panel = Object.assign(document.createElement('div'), { className: 'log-panel' });
    const head = Object.assign(document.createElement('div'), { className: 'log-head' });
    const close = Object.assign(document.createElement('button'), { type: 'button', className: 'log-close', textContent: '× とじる' });
    head.append(Object.assign(document.createElement('span'), { textContent: '会話のログ' }), close);
    const list = Object.assign(document.createElement('div'), { className: 'log-list' });
    for (const l of this.log) {
      const row = Object.assign(document.createElement('div'), { className: `log-row ${l.who === 'narr' ? 'narr' : ''}` });
      const r = resident(l.who);
      if (r || l.who === 'me') {
        const name = Object.assign(document.createElement('span'), { className: 'log-name' });
        if (r) {
          name.style.background = r.color;
          name.textContent = r.name ? `${r.face} ${r.name}` : r.face;
        } else {
          name.classList.add('me');
          name.textContent = 'あなた';
        }
        row.append(name);
      }
      const text = Object.assign(document.createElement('div'), { className: 'log-text' });
      if (l.choice) text.innerHTML = `<span class="log-choice">選んだ：${codeMarks(l.text)}</span>`;
      else if (l.who === 'x') text.innerHTML = `<span class="dlg-board">${codeMarks(l.text.replace(/^〔|〕$/g, ''))}</span>`;
      else text.innerHTML = codeMarks(l.text);
      row.append(text);
      list.append(row);
    }
    panel.append(head, list);
    wrap.append(panel);
    document.body.append(wrap);
    this.logEl = wrap;
    list.scrollTop = list.scrollHeight;
    const shut = () => {
      wrap.remove();
      this.logEl = null;
      document.removeEventListener('keydown', onKey, true);
    };
    // 閉じるのは、ボタン・まわりのクリック・Esc（そのクリックやキーで、会話が進まないように）
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') shut();
      }
    };
    document.addEventListener('keydown', onKey, true);
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      shut();
    });
    wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === wrap) shut();
    });
  }

  private choose(options: Choice[]): Promise<Choice> {
    this.onSpeaker(null);
    this.el.replaceChildren(this.logButton());
    const row = document.createElement('div');
    row.className = 'dlg-choices';
    return new Promise((done) => {
      const buttons: HTMLButtonElement[] = [];
      // ピンクになるのは、選んでいる1つだけ（カーソルを乗せた所か、キーボードで選んだ所）
      const pick = (b: HTMLButtonElement) => {
        for (const x of buttons) x.classList.toggle('sel', x === b);
        b.focus();
      };
      for (const o of options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.label;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.log.push({ who: 'me', text: o.label, choice: true });
          done(o);
        });
        b.addEventListener('pointerenter', () => pick(b));
        b.addEventListener('focus', () => pick(b));
        b.addEventListener('keydown', (e) => {
          const i = buttons.indexOf(b);
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pick(buttons[(i + buttons.length - 1) % buttons.length]);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pick(buttons[(i + 1) % buttons.length]);
        });
        buttons.push(b);
        row.append(b);
      }
      this.el.append(row);
      pick(buttons[0]);
    });
  }
}

/** せりふの `コード` を、枠つきで出す */
export function codeMarks(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * せりふの字を、1文字ずつ出す（設定の「文字の速さ」）。クリック・スペース・Enter で、残りを一度に出す。
 * `コード` の枠などのタグはそのままで、中の字だけを少しずつ出す
 */
function typeOut(el: HTMLElement, body: HTMLElement): Promise<void> {
  const cps = SPEED_CPS[settings.speed];
  if (!cps) return Promise.resolve();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const parts: { node: Text; text: string }[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push({ node: n as Text, text: n.textContent ?? '' });
  for (const p of parts) p.node.textContent = '';
  const total = parts.reduce((a, p) => a + p.text.length, 0);
  const next = el.querySelector<HTMLElement>('.dlg-next');
  if (next) next.style.visibility = 'hidden';
  return new Promise((done) => {
    let shown = 0;
    let skip = false;
    const start = performance.now();
    const draw = (count: number) => {
      let left = count;
      for (const p of parts) {
        p.node.textContent = p.text.slice(0, Math.max(0, left));
        left -= p.text.length;
      }
    };
    const onClick = () => (skip = true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        skip = true;
      }
    };
    el.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    const tick = (now: number) => {
      shown = skip ? total : Math.min(total, Math.floor(((now - start) / 1000) * cps));
      draw(shown);
      if (shown < total) {
        requestAnimationFrame(tick);
        return;
      }
      el.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      if (next) next.style.visibility = '';
      done();
    };
    requestAnimationFrame(tick);
  });
}

/** 次のせりふへ進むのを待つ。paused が true のあいだ（ログを見ているあいだ）は、進まない */
function waitNext(el: HTMLElement, paused: () => boolean): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      if (paused()) return;
      el.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      done();
    };
    const onClick = () => finish();
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        finish();
      }
    };
    // 前のせりふを進めたクリックで、すぐ次へ進まないように、少し待ってから受けつける
    setTimeout(() => {
      el.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
    }, 150);
  });
}
