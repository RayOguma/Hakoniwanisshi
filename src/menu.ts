// メニュー（「ソースを見る」の横のボタン）。セーブ・設定・遊び方。
// 開いているあいだは、うしろの会話やページは進まない（クリックもキーも、メニューの外へは通さない）
import { saveSettings, settings, type TextSize, type TextSpeed } from './settings';

export interface MenuHooks {
  /** セーブする。できなかったときは、そのわけを返す */
  save: () => string | null;
  /** ホーム（タイトル画面）に戻る */
  home: () => void;
}

export class Menu {
  private wrap: HTMLElement | null = null;

  constructor(
    button: HTMLElement,
    private hooks: MenuHooks,
  ) {
    button.addEventListener('click', () => this.open());
    // メニューを開いているあいだは、外へのキー（会話を進める・S でソースを開く）を止める。Esc で閉じる
    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.wrap) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
          return;
        }
        if (!this.wrap.contains(e.composedPath()[0] as Node)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  get isOpen() {
    return !!this.wrap;
  }

  /** メニューのいちばん上 */
  open() {
    this.show('メニュー', (body) => {
      body.className = 'menu-body menu-list';
      body.append(
        bigButton('💾 セーブ', 'いまの所まで、記録する', () => this.save()),
        bigButton('⚙ 設定', '音の大きさ・文字の速さ・文字の大きさ', () => this.settings()),
        bigButton('📖 遊び方', '操作のしかた・こまったときは', () => this.howTo()),
      );
    });
  }

  private save() {
    const err = this.hooks.save();
    if (err) {
      this.show('セーブ', (body) => {
        body.append(para(err));
        body.append(row(button('もどる', () => this.open())));
      });
      return;
    }
    this.show('セーブ', (body) => {
      body.append(para('セーブしました。'));
      body.append(para('つぎは、タイトル画面の「つづきから」で、ここから遊べます。', 'menu-note'));
      body.append(row(button('つづける', () => this.close(), true), button('ホームにもどる', () => this.hooks.home())));
    });
  }

  /** 設定。タイトル画面から開いたときは、「もどる」で閉じる（メニューには戻らない） */
  settings(fromTitle = false) {
    this.show('設定', (body) => {
      body.append(
        slider('BGM の音量', settings.bgm, (v) => {
          settings.bgm = v;
          saveSettings();
        }),
        slider('効果音の音量', settings.se, (v) => {
          settings.se = v;
          saveSettings();
        }),
        para('※ 音は、まだ入っていません（あとで入れます）。', 'menu-note'),
        choices<TextSpeed>(
          '文字の速さ',
          [
            ['slow', 'おそい'],
            ['normal', 'ふつう'],
            ['fast', 'はやい'],
            ['instant', 'すぐ'],
          ],
          settings.speed,
          (v) => {
            settings.speed = v;
            saveSettings();
          },
        ),
        choices<TextSize>(
          '文字の大きさ',
          [
            ['s', '小'],
            ['m', '中'],
            ['l', '大'],
          ],
          settings.size,
          (v) => {
            settings.size = v;
            saveSettings();
          },
        ),
        row(fromTitle ? button('とじる', () => this.close()) : button('もどる', () => this.open())),
      );
    });
  }

  private howTo() {
    this.show('遊び方', (body) => {
      const items: [string, string][] = [
        ['住人と話す', '住人をクリックすると、こちらを向いて話してくれます。頭の上に「!」が出ている子に話しかけると、お話が進みます。'],
        ['会話を進める', 'クリック・スペース・Enter で、次のせりふへ進みます。会話の窓の右上の「ログ」で、これまでの会話を見返せます。'],
        ['ページを直す', '「ソースを見る」（S キー）で、ページのソースが開きます。CSS の値をクリックして書き換えると、ページがすぐに変わります。'],
        ['行を書き足す', '「＋ 行を書き足す」の欄には、「名前: 値;」の形で、新しい行を書き足せます。書き足した行は × で消せます。'],
        ['元に戻す', '書き換えて分からなくなったら、場所ごとの「元に戻す」で、はじめの形に戻せます。'],
        ['こまったときは', '住人に話しかけると、その子なりのヒントをくれます（ヘッドは、ほとんど答えを教えてくれます）。「やさしいHTML・CSS入門」のタブにも、書き方の説明があります。'],
        ['日記', 'ソースの中の緑色の字は、このページを作った人の日記です。新しい場所が開くたびに、読めるようになります。'],
        ['セーブ', 'メニューの「セーブ」で、いまの所まで記録できます。タイトル画面の「つづきから」で、続きから遊べます（会話のあいだは、セーブできません）。'],
      ];
      const list = document.createElement('dl');
      list.className = 'menu-howto';
      for (const [t, d] of items) list.append(Object.assign(document.createElement('dt'), { textContent: t }), Object.assign(document.createElement('dd'), { textContent: d }));
      body.append(list, row(button('もどる', () => this.open())));
    });
  }

  /** メニューの窓を出す（中身を入れかえる） */
  private show(title: string, fill: (body: HTMLElement) => void) {
    if (!this.wrap) {
      this.wrap = Object.assign(document.createElement('div'), { id: 'menu' });
      // 窓の外をクリックしたら閉じる。窓の中のクリック・キーは、うしろ（会話）へ通さない
      this.wrap.addEventListener('click', (e) => {
        if (e.target === this.wrap) this.close();
        e.stopPropagation();
      });
      this.wrap.addEventListener('keydown', (e) => e.stopPropagation());
      document.body.append(this.wrap);
    }
    const panel = Object.assign(document.createElement('div'), { className: 'menu-panel' });
    const head = Object.assign(document.createElement('div'), { className: 'menu-head' });
    head.append(Object.assign(document.createElement('span'), { textContent: title }), button('× とじる', () => this.close()));
    const body = Object.assign(document.createElement('div'), { className: 'menu-body' });
    fill(body);
    panel.append(head, body);
    this.wrap.replaceChildren(panel);
    panel.querySelector<HTMLElement>('.menu-body button, .menu-body input')?.focus();
  }

  close() {
    this.wrap?.remove();
    this.wrap = null;
  }
}

function button(text: string, onClick: () => void, main = false) {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: text, className: main ? 'menu-btn main' : 'menu-btn' });
  b.addEventListener('click', onClick);
  return b;
}

function bigButton(title: string, note: string, onClick: () => void) {
  const b = Object.assign(document.createElement('button'), { type: 'button', className: 'menu-big' });
  b.append(Object.assign(document.createElement('b'), { textContent: title }), Object.assign(document.createElement('span'), { textContent: note }));
  b.addEventListener('click', onClick);
  return b;
}

function para(text: string, cls = '') {
  return Object.assign(document.createElement('p'), { textContent: text, className: cls });
}

function row(...items: HTMLElement[]) {
  const d = Object.assign(document.createElement('div'), { className: 'menu-row' });
  d.append(...items);
  return d;
}

function slider(label: string, value: number, onChange: (v: number) => void) {
  const wrap = Object.assign(document.createElement('label'), { className: 'menu-set' });
  const out = Object.assign(document.createElement('span'), { className: 'menu-val', textContent: String(value) });
  const input = Object.assign(document.createElement('input'), { type: 'range', min: '0', max: '100', step: '5', value: String(value) });
  input.addEventListener('input', () => {
    out.textContent = input.value;
    onChange(Number(input.value));
  });
  wrap.append(Object.assign(document.createElement('span'), { className: 'menu-label', textContent: label }), input, out);
  return wrap;
}

function choices<T extends string>(label: string, opts: [T, string][], value: T, onChange: (v: T) => void) {
  const wrap = Object.assign(document.createElement('div'), { className: 'menu-set' });
  const seg = Object.assign(document.createElement('div'), { className: 'menu-seg' });
  for (const [v, text] of opts) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: text, className: v === value ? 'on' : '' });
    b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      onChange(v);
    });
    seg.append(b);
  }
  wrap.append(Object.assign(document.createElement('span'), { className: 'menu-label', textContent: label }), seg);
  return wrap;
}
