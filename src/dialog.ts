// 会話の窓。ブラウザの下に重ねて出す。クリック・スペース・Enter で次へ。選択肢はボタン（選んだものだけの会話もある）
import { resident, type Choice, type Line, type Who } from './story';

export class Dialog {
  busy = false;

  constructor(
    private el: HTMLElement,
    /** 話し手が変わったとき（住人をこちらに向ける） */
    private onSpeaker: (who: Who | null) => void,
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
      await this.say(l.who, l.text);
    }
  }

  private say(who: Who, text: string): Promise<void> {
    this.onSpeaker(who === 'narr' || who === 'me' ? null : who);
    this.el.replaceChildren();
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
    body.innerHTML = codeMarks(text);
    const next = document.createElement('div');
    next.className = 'dlg-next';
    next.textContent = '▼';
    this.el.append(body, next);
    return waitNext(this.el);
  }

  private choose(options: Choice[]): Promise<Choice> {
    this.onSpeaker(null);
    this.el.replaceChildren();
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

function waitNext(el: HTMLElement): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
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
