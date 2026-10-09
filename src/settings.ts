// 設定（音量・文字の速さ・文字の大きさ）。ブラウザに覚えておく（覚えておけなくても、ふつうの設定で遊べる）

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type TextSize = 's' | 'm' | 'l';

export interface Settings {
  /** BGM の音量（0〜100）。音は、まだ入っていない */
  bgm: number;
  /** 効果音の音量（0〜100）。音は、まだ入っていない */
  se: number;
  /** 会話の字が出る速さ */
  speed: TextSpeed;
  /** 会話の字の大きさ */
  size: TextSize;
}

const KEY = 'hakoniwa-settings';
const DEFAULTS: Settings = { bgm: 70, se: 70, speed: 'normal', size: 'm' };

/** 1秒に出す字の数（0 は、すぐぜんぶ出す） */
export const SPEED_CPS: Record<TextSpeed, number> = { slow: 18, normal: 36, fast: 72, instant: 0 };
const SIZE_SCALE: Record<TextSize, number> = { s: 0.88, m: 1, l: 1.2 };

export const settings: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // 読めなければ、ふつうの設定
  }
  return { ...DEFAULTS };
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 覚えておけなくても、いまの設定のまま遊べる
  }
  applySettings();
}

/** 設定を画面に当てる（字の大きさ） */
export function applySettings() {
  document.documentElement.style.setProperty('--text-scale', String(SIZE_SCALE[settings.size]));
}
