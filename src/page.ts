// 住人たちのページ。シャドウ DOM の中に描くので、ページの CSS（プレイヤーが書き換える）が、ゲームの画面に漏れない。
// 住人は角の丸い CSS の立方体。ページの中を縦横無尽に歩きまわり、進む方向に顔を向ける。話すと、こちらを向く
import type { PageModel } from './model';
import { CARDS, LINKS, POSTS } from './site';
import { bridgeUp, fenceUp, fill, laneOpen, linkAngle, RESIDENTS, roofFixed, stayer, turnAngle, type Resident, type ResId } from './story';

const S = 46; // 立方体の大きさ
/** しゃべる子に寄るときの拡大 */
const ZOOM = 1.22;
/** 小道の生け垣の太さ */
const HEDGE = 13;
/** 谷の幅（リンクが横になると、ちょうど届く）と、谷の上の辺の太さ */
const CHASM = 60;
const CHASM_TOP = 30;
/** 背の高いリンクの、頭の高さ（ほかの子より、これだけ上に出る） */
const TALL = 27;
/** 上から見下ろす角度（頭のてっぺんと、進む方向の面が見える） */
const TILT = -58;

const BASE_CSS = `
:host { display: block; }
/* 住人が歩ける世界。ページ（.page）の外の、まわりの余白まで歩いていける。しゃべる子に寄るときは、世界ごと拡大する */
/* isolation: 中の重なりの順番（夜の暗がり・吹き出し）を、世界の中だけで決める。これがないと、寄っていないとき、夜の暗がりが、会話の窓の上にまで かぶさる */
.world { position: relative; isolation: isolate; min-height: 100%; padding: 1px 0; overflow: hidden; transition: transform 0.6s ease, transform-origin 0.6s ease; }
* { box-sizing: border-box; }
.page {
  position: relative; max-width: 860px; margin: 28px auto 300px; padding: 40px 48px 32px;
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

/* クロスの看板「立入禁止」。重なりの順番は、ページの CSS の z-index で決まる（アップタイムが裏で寝ている） */
.sign {
  position: absolute; right: 70px; top: 256px; width: 104px; height: 72px;
  display: grid; place-items: center; background: #f6eedc; border: 3px solid #b89a72; border-radius: 6px;
  font-size: 15px; font-weight: 800; letter-spacing: 0.15em; color: #b0503c; box-shadow: 0 3px 0 rgba(120, 90, 60, 0.25);
}
.sign::after {
  content: ''; position: absolute; left: 50%; top: 100%; width: 8px; height: 40px; margin: 3px 0 0 -4px;
  background: #b89a72; border-radius: 0 0 3px 3px;
}
/* 看板が、字を打ち換えられるようになったとき（contenteditable） */
.sign[contenteditable='true'] { cursor: text; outline: 3px dashed #f2b84a; outline-offset: 4px; }
.sign[contenteditable='true']:focus { outline-style: solid; }
/* 生け垣の小道。看板のうしろから、ページの右の端を越えて、外まで続く。開くまでは、奥のほうがかすんで見える */
.lane { position: absolute; left: 0; top: 0; pointer-events: none; }
.lane .hedge {
  position: absolute; left: 0; right: 0; height: ${HEDGE}px; border-radius: 9px;
  background: radial-gradient(circle at 8px 7px, #7fb27a 6px, transparent 6.5px) 0 0 / 16px 14px, #5f9a5c;
}
.lane .hedge.top { top: 0; }
.lane .hedge.bottom { bottom: 0; }
.lane .floor {
  position: absolute; left: 0; right: 0; top: ${HEDGE}px; bottom: ${HEDGE}px;
  background: repeating-linear-gradient(90deg, rgba(180, 150, 110, 0.18) 0 10px, transparent 10px 22px), #efe4cf;
}
/* 小道の右の端の柵は、ページの CSS の border-right（問題7）。生け垣と同じくらい、角を丸く */
.lane { border-radius: 0 9px 9px 0; transition: border-color 0.4s ease; }
.lane.closed { -webkit-mask-image: linear-gradient(90deg, #000 45%, rgba(0, 0, 0, 0.18)); mask-image: linear-gradient(90deg, #000 45%, rgba(0, 0, 0, 0.18)); }
/* 谷（ページのいちばん下）。右下のすみを、Ｌ字に切りとっている。橋がないと、だれも渡れない。向こうは、まだ工事中 */
.cliff { height: 230px; margin-top: 30px; }
.valley { position: absolute; left: 0; top: 0; pointer-events: none; }
.valley div { position: absolute; }
.chasm { background: #2e2730; }
.chasm.across { background: linear-gradient(180deg, #7a6c74, #2e2730 40%, #2e2730 60%, #7a6c74); border-radius: 10px 0 0 0; }
.chasm.down { background: linear-gradient(90deg, #7a6c74, #2e2730 40%, #2e2730 60%, #7a6c74); }
.fog { background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.6) 70%); }
.wip {
  padding: 5px 12px; border-radius: 5px; box-shadow: 0 3px 0 rgba(60, 50, 40, 0.2);
  background: repeating-linear-gradient(-45deg, #f2c94c 0 9px, #4a4540 9px 18px);
}
.wip span {
  display: block; padding: 3px 10px; background: #fffaf2; border-radius: 3px; white-space: nowrap;
  font: 800 12px 'M PLUS Rounded 1c', 'BIZ UDGothic', sans-serif; letter-spacing: 0.15em; color: #4a4540;
}
/* 分かれ道（谷の向こう）。矢印の札を立てるはずだった柱と、右へ続く道 */
.road {
  height: ${S + 16}px; border-radius: 9px 0 0 9px;
  background: repeating-linear-gradient(90deg, rgba(180, 150, 110, 0.18) 0 10px, transparent 10px 22px), #efe4cf;
}
/* テンプの寝床（谷の向こう）。ふとんと、まくら。テンプは、コメントの中にいるあいだ、ページに出ない */
.bed { width: 84px; height: 66px; background: #fdf6e6; border: 2px solid #d9cbb0; border-radius: 12px; box-shadow: 0 3px 0 rgba(120, 100, 70, 0.18); }
.bed::before { content: ''; position: absolute; left: 14px; top: 5px; width: 52px; height: 15px; background: #fff; border: 2px solid #d9cbb0; border-radius: 8px; }
.bed::after { content: ''; position: absolute; left: 3px; right: 3px; bottom: 3px; height: 32px; background: #b9dbe6; border-radius: 6px 6px 9px 9px; }
/* コメントの印を、片方だけ消したとき: テンプの影が、うっすら見える */
.res.ghost { opacity: 0.3; pointer-events: none; }
/* アップタイムの昼寝場所（日だまりと、小さな ざぶとん） */
.nap { width: 104px; height: 104px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 208, 96, 0.8), rgba(255, 208, 96, 0) 68%); }
.nap::after {
  content: ''; position: absolute; left: 22px; top: 30px; width: 60px; height: 52px;
  background: #f8e6b4; border: 2px solid #e6c97c; border-radius: 14px;
}
/* 戸口が立っているあいだは、ページの下を広くする（戸口の前に集まった子たちが、会話の窓に隠れない所まで、送れるように） */
.page.door-up { margin-bottom: 520px; }
/* 引っ越しのリンク（谷の向こうの空き地に立つ、戸口）。ことりサーバーへ続く。くぐると、よそのページへ行ける */
.gate {
  width: 66px; height: 84px; border: 4px solid #7aa7d8; border-bottom-width: 7px; border-radius: 34px 34px 5px 5px;
  background: radial-gradient(circle at 50% 72%, #fff, #dcefff 72%); box-shadow: 0 0 20px rgba(120, 170, 230, 0.55);
  animation: gate-glow 2.4s ease-in-out infinite alternate;
}
.gate::before {
  content: '🐦 ことりサーバーへ'; position: absolute; left: 50%; top: -28px; transform: translateX(-50%); white-space: nowrap;
  font: 800 12px 'M PLUS Rounded 1c', 'BIZ UDGothic', sans-serif; color: #3a6fb8; text-decoration: underline; text-underline-offset: 3px;
}
@keyframes gate-glow { to { box-shadow: 0 0 34px rgba(120, 170, 230, 0.9); } }
.guidepost { width: 8px; height: 46px; background: #b89a72; border-radius: 3px; }
.guidepost::before {
  content: ''; position: absolute; left: -25px; top: -36px; width: 58px; height: 38px;
  border: 3px dashed #c9b79a; border-radius: 6px;
}
/* レンタルサーバーの会社が差しこんだ「サービス終了のお知らせ」の帯。小道の下に隠れている（重なりの順番は、ページの CSS の z-index） */
.ss-notice {
  left: 0; top: 0; overflow: hidden; pointer-events: none; display: flex; align-items: center;
  background: #fff2a8; border: 3px solid #d9534f; border-radius: 2px;
  font: 800 15px 'MS PGothic', 'BIZ UDGothic', sans-serif; color: #c0392b; white-space: nowrap;
}
.ss-notice i { font-style: normal; }
.ss-notice span { display: inline-block; padding-left: 100%; animation: ss-flow 22s linear infinite; }
@keyframes ss-flow { to { transform: translateX(-100%); } }
/* クロスは、吹き出しのかわりに、小さな看板（札）をひょこっと出す */
.bubble.board {
  padding: 4px 12px; background: #f6eedc; border: 3px solid #b89a72; border-radius: 5px;
  font-size: 13px; font-weight: 800; letter-spacing: 0.12em; color: #b0503c;
  box-shadow: 0 2px 0 rgba(120, 90, 60, 0.25); animation: board-pop 0.35s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.bubble.board::after {
  left: 50%; bottom: -15px; width: 5px; height: 12px; margin-left: -2.5px;
  border: none; background: #b89a72; border-radius: 0 0 2px 2px;
}
@keyframes board-pop { from { transform: translate(-50%, -30%) scale(0.5); opacity: 0; } }
/* オーバーフローの吹き出しは、枠からはみ出す */
.bubble.spill { width: 110px; max-width: none; white-space: nowrap; }
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
/* v のカード（問題11）。名前の所は、決まるまで点線の空欄。contenteditable を書き足すと、打てる */
.vcard { outline: 2px dashed #e8c8d4; outline-offset: -2px; }
.vcard.named { outline: none; }
.v-name { min-width: 96px; min-height: 21px; }
.v-name:empty::before { content: '（なまえ）'; font-weight: 500; color: #c9bfb4; }
.v-name[contenteditable='true'] { cursor: text; outline: 3px dashed #f2b84a; outline-offset: 3px; border-radius: 3px; }
.v-name[contenteditable='true']:focus { outline-style: solid; }
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
/* 道の端で、落ちそうになって、左右に揺れる（オーバーフロー、問題7） */
.res.teeter .hop { transform-origin: 50% 100%; animation: teeter 0.9s ease-in-out infinite; }
@keyframes teeter { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(14deg) translateX(3px); } }
/* 眠くなると、首（頭）が横に傾く（v。アップタイムの癖が、うつった） */
.res.sleepy .hop { transform-origin: 50% 100%; animation: nod 3.2s ease-in-out infinite; }
@keyframes nod { 0%, 100% { transform: rotate(-16deg); } 50% { transform: rotate(-25deg) translateY(1px); } }
/* 夜。住人の上にかぶせる（吹き出しよりは下） */
.night {
  position: absolute; inset: 0; z-index: 50; pointer-events: none; opacity: 0; transition: opacity 2.6s ease;
  background: radial-gradient(circle at var(--lx, 50%) var(--ly, 300px), rgba(255, 220, 150, 0.16), transparent 220px), rgba(30, 38, 78, 0.42);
}
.night.on { opacity: 1; }
/* 乾杯で、みんないっせいに跳ねる */
.res.cheer .hop { animation: cheer 0.45s ease-out 2; }
@keyframes cheer { 50% { transform: translateY(-16px); } }
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
/* リンクは背が高い（立方体2つ分）。足もとは、ほかの子と同じ所 */
.l .cube { height: ${S * 2}px; top: -${S - 8}px; }
.l .f-top { bottom: auto; height: ${S}px; }
.l .f-bottom { top: auto; height: ${S}px; }
.l > .mark { top: -${34 + TALL}px; }
/* リンクを回すと（ページの CSS の transform）、足もとを軸に倒れる */
.body3d.l { transform-origin: 50% 100%; transition: transform 0.7s cubic-bezier(0.45, 0, 0.6, 1.25); }
/* v を回すと（ページの CSS の transform）、その場で、くるっと向きが変わる */
.body3d.v { transition: transform 0.6s cubic-bezier(0.45, 0, 0.6, 1.25); }
/* v が、首をかしげている（柱の前。これ以上は、自分では曲がらない） */
.res.tilting .hop { transform-origin: 50% 100%; transform: rotate(-32deg); animation: none; transition: transform 0.5s ease; }
/* 顔が > になったときは、字を大きく（矢印の札に見えるように） */
.res.arrow .f-front span { font-size: 18px; }
/* 字のかわりに残った子（問題17）。もう、ゆれない。v は、横を向いて > になる */
.res.letter .hop { animation: none; }
.res.turned .body3d.v { transform: rotate(-90deg); }
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
/* 吹き出しは、住人とは別の、いちばん手前の層に出す（ほかの子や物に隠れないように）。位置は、毎こま、しゃべる子の頭の上に合わせる */
.bubbles { position: absolute; inset: 0; z-index: 100; pointer-events: none; }
.bubble {
  position: absolute; left: 0; top: 0; transform: translate(-50%, -100%);
  max-width: 220px; width: max-content; padding: 6px 12px; background: #fff; border: 2px solid #4a4540; border-radius: 12px;
  font-size: 12px; line-height: 1.5; color: #4a4540; pointer-events: none; animation: pop 0.25s ease;
}
.bubble::after {
  content: ''; position: absolute; left: 50%; bottom: -8px; margin-left: -6px;
  border: 6px solid transparent; border-top-color: #4a4540; border-bottom: none;
}
.bubble.out { opacity: 0; transition: opacity 0.4s ease; }
@keyframes pop { from { transform: translate(-50%, -100%) scale(0.6); opacity: 0; } }

`;

export interface PageHooks {
  talk: (id: ResId) => void;
  /** ページの下の「リンク」をクリックしたとき */
  link: (title: string) => void;
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
  /** 物の裏に隠れている（かけあいに出ない） */
  hidden?: boolean;
  asleep?: boolean;
  /** ワーカーの、前の位置（向きを決めるため） */
  last?: { x: number; y: number };
  /** 歩く速さ（ふだんの速さを変えるとき。ワーカーが自由に歩くようになったら、など） */
  speed?: number;
}

export class Page {
  private root: ShadowRoot;
  private modelStyle: HTMLStyleElement;
  private page: HTMLElement;
  private world!: HTMLElement;
  private rain: HTMLElement;
  private castle: HTMLElement;
  private sign!: HTMLElement;
  /** 谷（ページのいちばん下）。場所は、ページの中の .cliff に合わせる */
  private cliff!: HTMLElement;
  private valley = div('valley');
  /** サービス終了のお知らせの帯（小道と同じ所。問題10で、ソースの場所が開くまでは出さない） */
  private ssNotice = div('ss-notice');
  /** v の紹介カード（問題11で、クロスが足す）と、その名前の欄・紹介文 */
  private vCard = div('card vcard');
  private vName = document.createElement('b');
  private vText = document.createElement('p');
  private vCardShown = false;
  /** リンクが、谷のふちにいる（問題8から）。ページの幅が変わっても、ふちについていく */
  private linkAtValley = false;
  /** v が、柱の前で、首をかしげている（問題9のあいだ） */
  private vTilting = false;
  /** ヘッドが、クロスの看板の前にいる（問題10のあいだ）。ページの幅が変わっても、看板についていく */
  private headAtSign = false;
  /** テンプが、目をさました（問題12）。それまでは、寝床で寝ている */
  private tAwake = false;
  /** クロスが、看板のそばを はなれた（引っ越しの朝から） */
  private crossFree = false;
  /** テンプが、寝床を出て、自由に歩いている */
  private tFree = false;
  /** 問題17: 字の所へ歩いていった子の、元いた場所（「待って」で、戻る） */
  private stayFrom: { id: string; x: number; y: number } | null = null;
  /** 谷の位置（ページの幅が変わると、上の段が折り返して、谷も動く。そのとき、谷のそばにいる子も、いっしょに動かす） */
  private valleyAt: { x: number; y: number } | null = null;
  /** 生け垣の小道（看板のうしろから、ページの外まで） */
  private lane = div('lane closed');
  /** しゃべっている子に寄るときの、拡大の割合（1 はふつう） */
  private zoom = 1;
  /** ワーカーが走る道（お堀のまわり）。お城の位置から作る @keyframes run */
  private runStyle: HTMLStyleElement;
  /** ヘッドの見回りの道（庭の中を、ぐるっと1周）。@keyframes patrol。見回りのあいだだけ、ある */
  private patrolStyle = document.createElement('style');
  /** ヘッドが、夜の見回りをしている（問題14）。ページの CSS の animation で歩く */
  private patrolling = false;
  private movers = new Map<string, Mover>();
  /** 吹き出しの層と、いま出ている吹き出し（住人ごと） */
  private bubbleLayer = div('bubbles');
  private bubbles = new Map<string, HTMLElement>();
  /** 会話の窓で答えているあいだ、出しっぱなしにする札 */
  private heldBoard: { id: string; el: HTMLElement } | null = null;
  private mouse: { x: number; y: number } | null = null;
  private talking = new Set<string>();
  /** 住人が、はじめの位置についたら（最初のこまのあと）、かなう */
  ready: Promise<void>;
  /** 雨もりが直るまで、アップタイムは軒下で寝ている */
  uptimeAtEaves = true;
  /** ページの左はし（幅が変わってページが動いたら、住人もいっしょに動かす） */
  private pageLeft = 0;
  /** お城の位置（ソースを開いてページの幅が変わると、上の段が折り返して、お城が上下にも動く） */
  private castleAt: { x: number; y: number } | null = null;
  /** マージとエコーが会えた（問題4のあと）。二人いっしょに歩く */
  private together = false;
  /** ワーカーが、お堀のまわりを走るのをやめて、ほかの子と同じように歩く（夜1から） */
  private workerFree = false;
  /** オーバーフローが、小道のいちばん端にいる（問題6のあと〜問題7）。ページの幅が変わっても、端についていく */
  private overflowAtEdge = false;
  /** おいかけっこで、カーソルを追いかけている子 */
  private chasers = new Set<string>();
  /** 夜（幕間A のあと） */
  private nightEl = div('night');

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
    this.root.append(base, this.runStyle, this.patrolStyle, this.modelStyle);

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
        <div class="sign">立入禁止</div>
      </div>
      <section class="sec" id="residents"><h2>住人たち</h2><div class="cards"></div></section>
      <div class="castle"><div class="keep"></div><div class="flag"></div></div>
      <section class="sec" id="posts"><h2>日誌</h2><div class="posts"></div></section>
      <section class="sec" id="links"><h2>リンク</h2><ul class="links"></ul></section>
      <footer>visitors <span class="counter">000127</span> ・ 最終更新 <span class="updated">2012/02/</span></footer>
      <div class="cliff" id="valley"></div>
    `;
    this.world = div('world');
    this.lane.append(div('hedge top'), div('floor'), div('hedge bottom'));
    const wip = div('wip');
    wip.append(Object.assign(document.createElement('span'), { textContent: 'この先、工事中' }));
    this.valley.append(div('fog'), div('chasm across'), div('chasm down'), wip, div('road'), div('guidepost'), div('nap'), div('bed'), div('gate'));
    // 小道と谷は、ページの上、住人の下（看板は z-index で、小道より手前）
    this.ssNotice.append(
      Object.assign(document.createElement('span'), {
        innerHTML:
          '【重要】さくさくサーバー 個人ホームページサービスは、3月31日（あと<i class="days-left">7</i>日）をもって終了いたします。終了後、公開中のページは すべて削除されます。長らくのご愛顧、ありがとうございました。',
      }),
    );
    // 帯は、小道よりも先に置く（z-index が同じなら、小道が上）
    this.world.append(this.page, this.ssNotice, this.lane, this.valley, this.nightEl, this.bubbleLayer);
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
    this.sign = this.page.querySelector('.sign')!;
    this.cliff = this.page.querySelector('.cliff')!;
    // 看板の字を、ページの上で打ち換える（contenteditable のとき）。Enter か、ほかの所をクリックしたら決まる
    endOnEnter(this.sign);
    this.sign.addEventListener('blur', () => {
      const t = (this.sign.textContent ?? '').replace(/[\r\n]/g, '').trim();
      if (t !== (this.model.texts.get('.sign') ?? '立入禁止')) this.model.setText('.sign', t);
    });
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('i');
      d.style.left = `${(i * 7) % 40}px`;
      d.style.animationDelay = `${i * 0.15}s`;
      this.rain.append(d);
    }
    for (const r of RESIDENTS) this.addResident(r);
    // はじめの位置は、最初のこまで決まる（addResident）。その次のこまで、ついたことにする
    this.ready = new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));

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
    // ほかのタブを見ているあいだ（ページが隠れているあいだ）は、位置が測れないので、何もしない
    if (!this.world.clientWidth) return;
    this.makeRunPath();
    this.makePatrolPath();
    // ソースを開け閉めしてページが横に動いたら、住人も同じだけ動く（軒下のアップタイムが、軒下からはずれないように）
    const left = this.page.offsetLeft;
    const dx = left - this.pageLeft;
    this.pageLeft = left;
    if (!dx) return;
    const W = this.world.clientWidth - S;
    for (const m of this.movers.values()) {
      // マージとエコーは、会えるまでは、お城といっしょに動く（followCastle）
      if (this.onRails(m) || (!this.together && (m.r.id === 'm' || m.r.id === 'e'))) continue;
      // 谷のそばにいる子は、谷といっしょに動かす（followValley）
      if (this.byValley(m)) continue;
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
    // v のカード（はじめは、ない）
    const vAva = Object.assign(div('ava'), { textContent: '・v・' });
    vAva.style.background = RESIDENTS.find((r) => r.id === 'v')!.color;
    this.vName.className = 'v-name';
    const vInfo = document.createElement('div');
    vInfo.append(this.vName, this.vText);
    this.vCard.append(vAva, vInfo);
    cards.append(this.vCard);
    // 名前を、ページの上で打つ（contenteditable のとき）。Enter か、ほかの所をクリックしたら決まる
    endOnEnter(this.vName);
    this.vName.addEventListener('blur', () => {
      // せりふに そのまま出すので、記号（タグや、置きかえの字）は外す
      const t = (this.vName.textContent ?? '').replace(/[<>&`{}\r\n]/g, '').trim();
      if (t !== (this.model.texts.get('.v-name') ?? '')) this.model.setText('.v-name', t);
      else this.vName.textContent = t;
    });
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
      const a = Object.assign(document.createElement('a'), { textContent: l.title });
      a.addEventListener('click', () => this.hooks.link(l.title));
      li.append(a, Object.assign(document.createElement('span'), { textContent: l.note }));
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
      x: [0, 0],
      o: [0, 0],
      t: [0, 0],
    };
    [m.x, m.y] = spots[m.r.id];
    if (m.r.id === 'm') {
      const i = this.castleBox().inner;
      [m.x, m.y] = [i.x + i.w / 2 - S / 2, i.y + i.h / 2 - S / 2];
    }
    if (m.r.id === 'x') {
      // クロスは、看板の左に立っている
      const s = this.signBox();
      [m.x, m.y] = [s.x - S - 12, s.y + 14];
      m.hold = true;
    }
    if (m.r.id === 't') {
      // テンプは、コメントを外してもらうまで、ページに出ない（applyCss で、出す）
      m.el.style.display = 'none';
      m.hidden = true;
      m.hold = true;
    }
    if (m.r.id === 'o') {
      // オーバーフローは、問題5で、ページの端から走ってくるまで、いない
      m.el.style.display = 'none';
      m.hidden = true;
      m.hold = true;
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
    if (this.castleAt && !this.together) {
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
    if (this.inLaneWall(x, y) || this.inValley(x, y)) return true;
    const isl = this.castleBox();
    if (!isl.river) return false;
    if (m.r.id === 'm') {
      const i = isl.inner;
      return x < i.x + 4 || y < i.y + 4 || x + S > i.x + i.w - 4 || y + S > i.y + i.h - 4;
    }
    const pad = 6;
    return x + S > isl.x - pad && x < isl.x + isl.w + pad && y + S > isl.y - pad && y < isl.y + isl.h + pad;
  }

  /** 生け垣の小道に、ぶつかるか（閉じているあいだは小道ぜんぶ、開いたら上と下の生け垣だけ） */
  private inLaneWall(x: number, y: number) {
    const l = this.laneBox();
    const hit = (rx: number, ry: number, rw: number, rh: number) => x + S > rx && x < rx + rw && y + S > ry && y < ry + rh;
    if (!l.open) return hit(l.x, l.y, l.w, l.h);
    return hit(l.x, l.y, l.w, HEDGE) || hit(l.x, l.y + l.h - HEDGE, l.w, HEDGE);
  }

  /** ページの CSS の animation で、決まった道の上を動いている子か（お堀のまわりを走るワーカー・夜の見回りのヘッド） */
  private onRails(m: Mover) {
    return (m.r.id === 'w' && !this.workerFree) || (m.r.id === 'h' && this.patrolling);
  }

  /** ヘッドの見回りの道: 庭の中を、四角く、ぐるっと1周（家・看板・小道は、よける） */
  private makePatrolPath() {
    if (!this.patrolling) {
      this.patrolStyle.textContent = '';
      return;
    }
    const g = this.gardenBox();
    const l = g.x + 26;
    const r = g.x + g.w - S - 200;
    const t = g.y + 196;
    const b = g.y + g.h - S - 14;
    const pts = [[l, t], [r, t], [r, b], [l, b], [l, t]];
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const frames = pts.map(([x, y], i) => `${((len[i] / total) * 100).toFixed(2)}% { transform: translate(${x}px, ${y}px); }`);
    this.patrolStyle.textContent = `@keyframes patrol { ${frames.join(' ')} }`;
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

  /** クロスの看板の位置（世界の中の座標） */
  private signBox() {
    const g = this.gardenBox();
    const el = this.sign;
    return { x: g.x + el.offsetLeft, y: g.y + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }

  /** 生け垣の小道の位置（看板の右から、世界の右の端まで）。open は、通れるか */
  private laneBox() {
    const s = this.signBox();
    const x = s.x + s.w - 8;
    return { x, y: s.y - 2, w: this.world.clientWidth - 6 - x, h: S + 12 + HEDGE * 2, open: laneOpen(this.model) };
  }

  /** 看板の左（クロスが、いつも立っている所） */
  private crossSpot(): [number, number] {
    const s = this.signBox();
    return [s.x - S - 12, s.y + 14];
  }

  /** 看板の前（問題10で、ヘッドが立つ所。クロスの左） */
  private headSpot(): [number, number] {
    const s = this.signBox();
    return [s.x - S * 2 - 34, s.y + 44];
  }

  /** ページのいちばん下（フッターの、まんなかの下。谷の左）。リンクが、字のかわりに立つ所（問題15） */
  private letterSpot(): [number, number] {
    const foot = this.page.querySelector<HTMLElement>('footer')!;
    return [this.page.offsetLeft + foot.offsetLeft + foot.offsetWidth / 2 - S / 2, this.page.offsetTop + foot.offsetTop + 50];
  }

  /** 小道のいちばん端（オーバーフローが立つ所） */
  private edgeSpot(): [number, number] {
    const l = this.laneBox();
    return [l.x + l.w - S - 14, l.y + HEDGE + 6];
  }

  /** 端にいるオーバーフローは、柵がないあいだ、ゆらゆら揺れる */
  private teeter() {
    const o = this.movers.get('o')!;
    o.el.classList.toggle('teeter', this.overflowAtEdge && !fenceUp(this.model));
  }

  /** 小道を、看板に合わせて置く（ページの幅が変わると、看板も動く） */
  private placeLane() {
    const l = this.laneBox();
    const st = this.lane.style;
    st.left = `${l.x}px`;
    st.top = `${l.y}px`;
    st.width = `${l.w}px`;
    st.height = `${l.h}px`;
    this.lane.classList.toggle('closed', !l.open);
    // 帯は、小道と同じ所（小道に、すっぽり隠れる大きさ）
    const n = this.ssNotice.style;
    // かたまりごと消したら（問題13）、もう ない
    n.display = this.model.opened.has('notice') && !this.model.gone('notice') ? '' : 'none';
    n.left = `${l.x + 4}px`;
    n.top = `${l.y + 4}px`;
    n.width = `${l.w - 10}px`;
    n.height = `${l.h - 8}px`;
  }

  /** 谷の位置（世界の中の座標）。x・y は、谷の左上の角。上の辺は世界の右の端まで、たての辺は世界の下の端まで続く */
  private valleyBox() {
    const el = this.cliff;
    const x = this.page.offsetLeft + el.offsetLeft + Math.round(el.offsetWidth * 0.58);
    return { x, y: this.page.offsetTop + el.offsetTop, right: this.world.clientWidth, bottom: this.world.clientHeight };
  }

  /** 谷のそば（谷の上の辺より下。こちら側も、向こう側も）にいるか */
  private byValley(m: Mover) {
    return !!this.valleyAt && m.y > this.valleyAt.y - 40 && !this.onRails(m);
  }

  /** 谷が動いたら、谷のそばにいる子も、同じだけ動く（谷のこちら側・向こう側が、入れかわらないように） */
  private followValley() {
    // ほかのタブを見ているあいだ（ページが隠れているあいだ）は、位置が測れないので、何もしない
    if (!this.world.clientWidth) return;
    const v = this.valleyBox();
    if (this.valleyAt) {
      const dx = v.x - this.valleyAt.x;
      const dy = v.y - this.valleyAt.y;
      if (dx || dy) {
        for (const m of this.movers.values()) {
          if (!this.byValley(m)) continue;
          m.x += dx;
          m.y += dy;
          m.tx += dx;
          m.ty += dy;
        }
      }
    }
    this.valleyAt = { x: v.x, y: v.y };
  }

  /** 谷のふち（リンクが立つ所）。ここで右へ倒れると、そのまま橋になる */
  private brinkSpot(): [number, number] {
    const v = this.valleyBox();
    // 立っているときは、谷に重ならない所（重なっていると、歩きだしたとき、谷を通り抜けてしまう）。倒れると、少し前へ出て、向こう岸に届く
    const lying = linkAngle(this.model) !== 0;
    return [v.x - (lying ? 38 : S + 6), v.y + CHASM_TOP + 62];
  }

  /** リンクが、谷にかかる橋になっているか */
  private bridged() {
    return this.linkAtValley && bridgeUp(this.model);
  }

  /** 谷に落ちるか（橋になったリンクの上だけは、渡れる） */
  private inValley(x: number, y: number) {
    const v = this.valleyBox();
    const hit = (rx: number, ry: number, rw: number, rh: number) => x + S > rx && x < rx + rw && y + S > ry && y < ry + rh;
    if (hit(v.x, v.y, v.right - v.x, CHASM_TOP)) return true;
    if (!hit(v.x, v.y, CHASM, v.bottom - v.y)) return false;
    return !(this.bridged() && Math.abs(y - this.bridgeY()) < 10);
  }

  /**
   * 谷の中に入りこんでしまった子を、外へ戻す（こちら側へ）。演出で歩いている子・決まった所にいる子は、そのまま。
   * 谷に重なった所から歩きだすと、そのまま谷を通り抜けてしまうので
   */
  private outOfValley(m: Mover) {
    if (m.goal || m.hold || this.onRails(m)) return;
    const v = this.valleyBox();
    const inDown = m.x + S > v.x && m.x < v.x + CHASM && m.y + S > v.y;
    const inAcross = m.x + S > v.x && m.y + S > v.y && m.y < v.y + CHASM_TOP;
    if (!inDown && !inAcross) return;
    // 橋の上を渡っているところは、そのまま
    if (inDown && this.bridged() && Math.abs(m.y - this.bridgeY()) < 10) return;
    if (inDown) m.x = m.x + S / 2 < v.x + CHASM / 2 ? v.x - S - 2 : v.x + CHASM + 2;
    else m.y = v.y - S - 2;
    [m.tx, m.ty] = [m.x, m.y];
  }

  /** 橋を渡るときの高さ（横になったリンクの、まんなか） */
  private bridgeY() {
    return this.movers.get('l')!.y + S / 2;
  }

  /** 谷を、ページの .cliff に合わせて置く（ページの幅が変わると、動く） */
  private placeValley() {
    const v = this.valleyBox();
    const [fog, across, down, wip, road, post, nap, bed, gate] = [...this.valley.children] as HTMLElement[];
    const put = (el: HTMLElement, x: number, y: number, w?: number, h?: number) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (w !== undefined) el.style.width = `${w}px`;
      if (h !== undefined) el.style.height = `${h}px`;
    };
    put(across, v.x, v.y, v.right - v.x, CHASM_TOP);
    put(down, v.x, v.y, CHASM, v.bottom - v.y);
    put(fog, v.x + CHASM, v.y + CHASM_TOP, v.right - v.x - CHASM, v.bottom - v.y - CHASM_TOP);
    put(wip, v.x + CHASM + 150, v.y + CHASM_TOP + 34);
    const [fx, fy] = this.forkSpot();
    put(post, fx + S / 2 - 4, fy + 36);
    put(road, fx + S + 14, fy + 58, v.right - (fx + S + 14));
    const [nx, ny] = this.napSpot();
    put(nap, nx + S / 2 - 52, ny + S / 2 - 52);
    const [tx, ty] = this.bedSpot();
    put(bed, tx - 19, ty - 4);
    // 引っ越しのリンク（戸口）は、主人公が はってから、引っ越しが済むまで
    put(gate, ...this.doorSpot());
    gate.style.display = this.model.flags.has('door') && !this.model.flags.has('moved') ? '' : 'none';
  }

  /** 引っ越しのリンク（戸口）の場所。谷の向こうの空き地の、下のほう（寝床の下） */
  private doorSpot(): [number, number] {
    const v = this.valleyBox();
    return [v.x + CHASM + 190, v.y + CHASM_TOP + 350];
  }

  /** 字になった子の、すぐ左（引っ越しのあと、もう一人が来て、そばにいる所） */
  private besideSpot(): [number, number] {
    const [x, y] = this.letterSpot();
    return [x - S - 14, y + 2];
  }

  /** テンプの寝床（谷の向こうの、下のほう）。テンプが寝ている所 */
  private bedSpot(): [number, number] {
    const v = this.valleyBox();
    return [v.x + CHASM + 120, v.y + CHASM_TOP + 262];
  }

  /** アップタイムの昼寝場所（右の道の先の、日だまり） */
  private napSpot(): [number, number] {
    const [fx, fy] = this.forkSpot();
    return [fx + S + 66, fy + 66];
  }

  /** v の見た目: 首をかしげているか、顔が > になっているか */
  private vLook() {
    const el = this.movers.get('v')!.el;
    const a = turnAngle(this.model, '.v');
    el.classList.toggle('tilting', this.vTilting && a === 0);
    el.classList.toggle('arrow', a === 270 || this.model.flags.has('vTurned'));
    el.classList.toggle('turned', this.model.flags.has('vTurned'));
  }

  /** 分かれ道の柱の前（v が立って、矢印の札のかわりになる所） */
  private forkSpot(): [number, number] {
    const v = this.valleyBox();
    return [v.x + CHASM + 100, v.y + CHASM_TOP + 114];
  }

  /** 寝ぼけたアップタイムが、ふらふら行きつく所（谷のたての辺の、すぐ右） */
  private astraySpot(): [number, number] {
    const v = this.valleyBox();
    return [v.x + CHASM + 6, v.y + CHASM_TOP + 250];
  }

  /** 演出で、決まった所まで歩く（着いたら、かなう） */
  private walkTo(m: Mover, x: number, y: number) {
    return new Promise<void>((done) => {
      [m.tx, m.ty] = [x, y];
      m.goal = done;
    });
  }

  /** 二人が近くにいるか（かけあいをするか）。隠れている子・話している子は、だめ */
  near(a: string, b: string, dist: number) {
    const ma = this.movers.get(a);
    const mb = this.movers.get(b);
    if (!ma || !mb || ma.hidden || mb.hidden || this.talking.has(a) || this.talking.has(b)) return false;
    const pa = this.pos(ma);
    const pb = this.pos(mb);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y) < dist;
  }

  /** その子が、いまページに出ているか */
  shown(id: string) {
    const m = this.movers.get(id);
    return !!m && !m.hidden;
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
    this.placeLane();
    this.followValley();
    this.placeValley();
    if (this.linkAtValley) {
      const l = this.movers.get('l')!;
      if (!l.goal) [l.x, l.y, l.tx, l.ty] = [...this.brinkSpot(), ...this.brinkSpot()];
    }
    // クロスは、いつも看板の左（ページの幅が変わって、看板が動いても）。看板の前のヘッドも同じ
    const cross = this.movers.get('x')!;
    if (!this.crossFree && !cross.goal && this.world.clientWidth) [cross.x, cross.y, cross.tx, cross.ty] = [...this.crossSpot(), ...this.crossSpot()];
    if (this.headAtSign) {
      const h = this.movers.get('h')!;
      if (!h.goal) [h.x, h.y, h.tx, h.ty] = [...this.headSpot(), ...this.headSpot()];
    }
    // 字のかわりに立っているリンクは、ページの下が動いても、そこにいる
    if (this.model.flags.has('lLetter')) {
      const l = this.movers.get('l')!;
      if (!l.goal) [l.x, l.y, l.tx, l.ty] = [...this.letterSpot(), ...this.letterSpot()];
    }
    // 字のかわりに残った子（問題17）は、ページの終わりに、じっと立っている。引っ越しのあと、もう一人が、そのとなりにいる
    const stay = stayer(this.model);
    if (stay) {
      const m = this.movers.get(stay)!;
      m.hold = true;
      m.hidden = true; // ひとりごと・かけあいは、もう しない
      if (!m.goal) [m.x, m.y, m.tx, m.ty] = [...this.letterSpot(), ...this.letterSpot()];
      // v が残ったときは、ヘッドが、そのとなりで、ずっと眠っている
      if (stay === 'v' && this.model.flags.has('beside')) {
        const h = this.movers.get('h')!;
        h.hold = true;
        h.hidden = true;
        if (!h.goal) [h.x, h.y, h.tx, h.ty] = [...this.besideSpot(), ...this.besideSpot()];
      }
    }
    // テンプは、寝床を出るまで、寝床にいる（谷が動いても）
    if (!this.tFree) {
      const t = this.movers.get('t')!;
      [t.x, t.y, t.tx, t.ty] = [...this.bedSpot(), ...this.bedSpot()];
    }
    if (this.overflowAtEdge) {
      const o = this.movers.get('o')!;
      if (!o.goal) [o.x, o.y, o.tx, o.ty] = [...this.edgeSpot(), ...this.edgeSpot()];
    }
    this.placeBubbles();
    for (const m of this.movers.values()) {
      if (this.onRails(m)) {
        this.stepWorker(m);
        continue;
      }
      this.outOfValley(m);
      const talking = this.talking.has(m.r.id);
      if (talking) {
        this.setWalking(m, false);
        this.draw(m);
        continue;
      }
      // カーソルを追いかける子は、カーソルがページの中にある間、毎こまカーソルを目指す（遠いほど速く）。そばまで来たら止まる
      const game = this.chasers.has(m.r.id) && !!this.mouse;
      const chasing = !!((m.r.follows || game) && this.mouse && !m.hold && !this.isNight());
      if (game) {
        // オーバーフローは、カーソルの、さらに先を目指す（いつも行きすぎる）
        const over = m.r.id === 'o' ? 0.7 : 0;
        const gx = this.mouse!.x - S / 2;
        const gy = this.mouse!.y - S / 2;
        m.tx = clamp(gx + (gx - m.x) * over, 0, W);
        m.ty = clamp(gy + (gy - m.y) * over, 0, H);
      } else if (chasing) {
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
        // おいかけっこでは、v は少しゆっくり、オーバーフローは速いけれど、いつも行きすぎる（カーソルの先を目指す）
        const speed = m.rush ?? (game ? (m.r.id === 'o' ? 260 : 185) : chasing ? Math.min(320, m.r.speed + dist * 1.6) : (m.speed ?? m.r.speed));
        const v = Math.min(dist, speed * dt);
        const nx = m.x + (dx / dist) * v;
        const ny = m.y + (dy / dist) * v;
        // 演出で決まった所へ歩いているとき（goal があるとき）は、ぶつからない（途中で止まって、着いたことにならないように）
        if (!m.goal && this.blocked(m, nx, ny) && !this.blocked(m, m.x, m.y)) {
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
        // 夜は、みんな その場で休む（新しい所へは歩きださない）
        if (m.wait <= 0 && !m.hold && !this.isNight()) this.nextTarget(m, W, H);
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
    // エコーは、会えたあとは、マージのそばを、ゆっくりついて歩く
    if (id === 'e' && this.together) {
      const mm = this.movers.get('m')!;
      m.tx = clamp(mm.x - 60 + (Math.random() - 0.5) * 40, 0, W);
      m.ty = clamp(mm.y + (Math.random() - 0.5) * 50, 0, H);
      m.wait = 0.8 + Math.random() * 1.5;
      return;
    }
    // マージは、お堀があるあいだは、お城の中を、うろうろする
    if (id === 'm' && this.castleBox().river) {
      const i = this.castleBox().inner;
      m.tx = i.x + 6 + Math.random() * (i.w - S - 12);
      m.ty = i.y + 6 + Math.random() * (i.h - S - 12);
      m.wait = 1.5 + Math.random() * 3.5;
      return;
    }
    // カーソルを追いかける子は、カーソルがページの中にある間は、step で追いかける
    if (m.r.follows && this.mouse) return;
    // ヘッドは、カーソルに少しついてきて、途中でやめる（日記 2009/08/11）
    if (id === 'h' && this.mouse && Math.random() < 0.3) {
      m.tx = clamp(m.x + (this.mouse.x - S / 2 - m.x) * 0.3, 0, W);
      m.ty = clamp(m.y + (this.mouse.y - S / 2 - m.y) * 0.3, 0, H);
      m.wait = 2.5 + Math.random() * 2;
      return;
    }
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

  /** その子の、いまの位置（お堀のまわりを走っているワーカーは、CSS のアニメーションの位置） */
  private pos(m: Mover) {
    return this.onRails(m) ? this.workerPos(m) : { x: m.x, y: m.y };
  }

  /** ワーカーが、お堀のまわりを走るのをやめて、ほかの子と同じように歩くようになる（いまいる所から） */
  private freeWorker() {
    if (this.workerFree) return;
    const m = this.movers.get('w')!;
    const p = this.workerPos(m);
    // ページの CSS の animation（走る道）より、こちらが勝つ
    m.body.style.animation = 'none';
    [m.x, m.y] = [p.x, p.y];
    [m.tx, m.ty] = [p.x, p.y];
    m.speed = 90; // 配達係なので、ほかの子より少し速い
    this.workerFree = true;
    this.draw(m);
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
      const moving = Math.hypot(dx, dy) > 0.3 && !this.talking.has(m.r.id);
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
    // 首を傾けて寝ている v は、顔をこちらに向ける（寝顔が見えるように）
    // 回っているリンクも、顔をこちらに向ける（横になると、顔が上を向く）
    const front =
      talking ||
      m.r.id === stayer(this.model) ||
      (m.r.id === 'l' && this.model.flags.has('lLetter')) ||
      (m.r.id === 't' && !this.tFree) || (m.r.id === 'v' && m.asleep) || (m.r.id === 'l' && linkAngle(this.model) !== 0) || (m.r.id === 'v' && (this.vTilting || turnAngle(this.model, '.v') !== 0));
    m.cube.style.transform = front ? 'rotateX(-14deg) rotateY(0deg)' : `rotateX(${TILT}deg) rotateY(${m.angle}deg)`;
  }

  /** ページの CSS を当て直す（プレイヤーが書き換えたとき） */
  applyCss() {
    this.modelStyle.textContent = this.model.css();
    // お堀（お城の border）が変わると、ワーカーの道も変わる
    this.makeRunPath();
    // 屋根がずれているか、傾いていると、雨もり
    this.rain.style.display = roofFixed(this.model) ? 'none' : '';
    // 看板の属性（contenteditable）と、打ち換えた字
    // 荷造りが済んだら、看板も、もう打ち換えられない
    const editable = this.model.attr('.sign', 'contenteditable') === 'true' && !this.model.flags.has('packed');
    if (editable) this.sign.setAttribute('contenteditable', 'true');
    else this.sign.removeAttribute('contenteditable');
    const text = this.model.texts.get('.sign') ?? '立入禁止';
    if (document.activeElement !== this.root.host || this.root.activeElement !== this.sign) this.sign.textContent = text;
    this.teeter();
    // 住人どうし・住人と物の重なりの順番は、ページの CSS の z-index で決まる（住人の箱ごと、その順番にする）
    for (const m of this.movers.values()) {
      const z = getComputedStyle(m.body).zIndex;
      m.el.style.zIndex = z === 'auto' ? '' : z;
    }
    this.vLook();
    this.page.classList.toggle('door-up', this.model.flags.has('door') && !this.model.flags.has('moved'));
    // 字のかわりに残った子は、もう ゆれない
    for (const id of ['h', 'v']) this.movers.get(id)!.el.classList.toggle('letter', id === stayer(this.model));
    // フッターの「最終更新」（結末で、今日になる）
    this.page.querySelector('.updated')!.textContent = this.model.texts.get('#updated') ?? '2012/02/';
    // テンプ: コメントの印（<!-- と -->）を、消した数で決まる。0 = いない、1 = うっすら影、2 = いる
    const t = this.movers.get('t')!;
    const cut = ['tOpen', 'tClose'].filter((f) => this.model.flags.has(f)).length;
    t.el.style.display = cut ? '' : 'none';
    t.hidden = cut < 2;
    t.el.classList.toggle('ghost', cut === 1);
    t.faceText.textContent = this.tAwake ? t.r.face : '-_-';
    // v のカード: 名前の欄（contenteditable・打った名前）と、紹介文。名前が決まったら、もう打てない
    const named = this.model.flags.has('vNamed');
    this.vCard.style.display = this.vCardShown || this.model.opened.has('vcard') ? '' : 'none';
    this.vCard.classList.toggle('named', named);
    if (this.model.attr('.v-name', 'contenteditable') === 'true' && !named) this.vName.setAttribute('contenteditable', 'true');
    else this.vName.removeAttribute('contenteditable');
    if (this.root.activeElement !== this.vName) this.vName.textContent = this.model.texts.get('.v-name') ?? '';
    this.vText.textContent = this.model.flags.has('vCardText') ? '最後に来た子。よく笑う。みんなの、いちばん下の きょうだい。' : '';
    // 橋になったリンクは、渡る子の下
    if (this.bridged()) this.movers.get('l')!.el.style.zIndex = '1';
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
    const p = this.pos(m);
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
    // 札を出していた子が話し終えたら、札をしまう
    const held = this.heldBoard;
    if (held && !this.talking.has(held.id)) {
      this.heldBoard = null;
      held.el.classList.add('out');
      setTimeout(() => {
        held.el.remove();
        if (this.bubbles.get(held.id) === held.el) this.bubbles.delete(held.id);
      }, 400);
    }
    for (const [id, m] of this.movers) {
      m.el.classList.toggle('talking', this.talking.has(id));
      // ひとりのときは笑っていない子も、話すときは、にこにこする（エコーは、マージと会えたあとは、いつも）
      if (m.r.aloneFace) m.faceText.textContent = this.talking.has(id) || (id === 'e' && this.together) ? m.r.face : m.r.aloneFace;
    }
    if (this.talking.has('w')) this.movers.get('w')!.angle = 0;
  }

  /** 「!」を出す子（問題17は、ヘッドと v の二人） */
  setMark(ids: string[]) {
    for (const [rid, m] of this.movers) {
      m.body.querySelector('.mark')?.remove();
      if (ids.includes(rid)) m.body.append(div('mark'));
    }
  }

  /** 吹き出しで、ひとりごと */
  bubble(id: string, text: string, ms = 3200, evenHidden = false) {
    const m = this.movers.get(id);
    // 話している子・物の裏に隠れている子は、吹き出しを出さない（演出で、わざと出すときは別）
    if (!m || (m.hidden && !evenHidden) || this.talking.has(id)) return;
    this.bubbles.get(id)?.remove();
    const b = this.makeBubble(id, text);
    this.bubbleLayer.append(b);
    this.bubbles.set(id, b);
    this.placeBubbles();
    setTimeout(() => b.classList.add('out'), ms);
    setTimeout(() => {
      b.remove();
      if (this.bubbles.get(id) === b) this.bubbles.delete(id);
    }, ms + 500);
  }

  /** 吹き出し（クロスは札、オーバーフローは、はみ出す吹き出し） */
  private makeBubble(id: string, text: string) {
    // {v}（v の名前）などを、いまの値にする
    if (id === 'x') return Object.assign(div('bubble board'), { textContent: boardText(fill(text)) });
    return Object.assign(div(id === 'o' ? 'bubble spill' : 'bubble'), { textContent: fill(text) });
  }

  /** 会話の窓でクロスが答えるあいだ、頭の上に札を出しておく（話し手が変わったら、しまう） */
  holdBoard(id: string, text: string) {
    this.bubbles.get(id)?.remove();
    const b = this.makeBubble(id, text);
    this.bubbleLayer.append(b);
    this.bubbles.set(id, b);
    this.heldBoard = { id, el: b };
    this.placeBubbles();
  }

  /** 吹き出しを、しゃべる子の頭の上に合わせる */
  private placeBubbles() {
    for (const [id, b] of this.bubbles) {
      const m = this.movers.get(id)!;
      const p = this.pos(m);
      // リンクは背が高いので、吹き出しも高い所に（横になっているときは、体のまんなかの上）
      const lying = id === 'l' && linkAngle(this.model) !== 0;
      b.style.left = `${p.x + S / 2 + (lying ? 40 : 0)}px`;
      b.style.top = `${p.y - 14 - (id === 'l' && !lying ? TALL : 0) + (lying ? S / 2 : 0)}px`;
    }
  }

  /** v のカードの、名前の欄（カーソルの合図を出すため） */
  vNameEl(): HTMLElement {
    return this.vName;
  }

  /** サービス終了まで、あと何日か（小道の下の帯の字） */
  setDays(days: number) {
    for (const el of this.root.querySelectorAll('.days-left')) el.textContent = String(days);
  }

  /** v のカードが見える所まで、ページを送る */
  showVCard() {
    const top = this.page.offsetTop + this.vCard.offsetTop - this.scroller.clientHeight * 0.3;
    this.scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /** 看板（カーソルの合図を出すため） */
  signEl(): HTMLElement {
    return this.sign;
  }

  /** 住人の要素（カーソルの合図を出すため） */
  residentEl(id: ResId): HTMLElement {
    return this.movers.get(id)!.el;
  }

  /** 少しのあいだ、首を傾けて、うとうとする（v） */
  sleepy(id: string, ms: number) {
    const m = this.movers.get(id);
    if (!m || m.asleep) return;
    m.el.classList.add('sleepy');
    setTimeout(() => {
      if (!m.asleep) m.el.classList.remove('sleepy');
    }, ms);
  }

  /**
   * おいかけっこ（幕間A）。ids の子が、カーソルを追いかける。だれかがカーソルにさわったら、その子の id を返す。
   * ms のあいだ逃げきったら 'escaped'（カーソルがページの外にあるあいだは、時間を数えない）
   */
  async chase(ids: string[], ms: number): Promise<string> {
    this.scrollTo('home');
    for (const id of ids) {
      const m = this.movers.get(id)!;
      m.hold = false;
      m.goal = undefined;
      this.chasers.add(id);
    }
    this.bubble('v', 'まてまてー！', 2400);
    let left = ms;
    let who = 'escaped';
    while (left > 0) {
      await sleep(50);
      if (!this.mouse) continue;
      left -= 50;
      const hit = ids.find((id) => {
        const m = this.movers.get(id)!;
        return Math.hypot(m.x + S / 2 - this.mouse!.x, m.y + S / 2 - this.mouse!.y) < 20;
      });
      if (hit) {
        who = hit;
        break;
      }
    }
    this.chasers.clear();
    for (const id of ids) {
      const m = this.movers.get(id)!;
      [m.tx, m.ty] = [m.x, m.y];
      m.wait = 2;
    }
    return who;
  }

  /** 夜になったとき: 演出で歩いている子のほかは、その場で止まる */
  private settle() {
    for (const m of this.movers.values()) {
      if (m.goal) continue;
      [m.tx, m.ty] = [m.x, m.y];
    }
  }

  /** いま夜か */
  isNight() {
    return this.nightEl.classList.contains('on');
  }

  isAsleep(id: string) {
    return !!this.movers.get(id)?.asleep;
  }

  /** 演出。instant は開発用（途中から始めるとき、歩いたりせず、終わった形にする） */
  async fx(name: string, instant = false): Promise<void> {
    // 谷の位置を、いまの形に合わせておく（ページが伸びた直後に、谷のそばへ住人を置くと、あとで二重にずれるため）
    this.followValley();
    if (name === 'linkRoof') {
      // リンクが屋根の下へ行って、持ち上げようとする → 屋根が斜めに（家が見える所まで送ってから）
      if (instant) return; // 途中から始めるときは、屋根はあとで直した形にするので、何もしない
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
    if (name === 'reunite') {
      // お堀がなくなった。マージが、お城から出て、エコーのところまで歩いてくる
      const mm = this.movers.get('m')!;
      const ee = this.movers.get('e')!;
      if (instant) {
        [mm.x, mm.y] = [ee.x + S + 16, ee.y];
        [mm.tx, mm.ty] = [mm.x, mm.y];
        return;
      }
      const c = this.castleBox();
      const max = this.scroller.scrollHeight - this.scroller.clientHeight;
      this.scroller.scrollTo({ top: clamp(c.y + c.h / 2 - this.scroller.clientHeight * 0.4, 0, max), behavior: 'smooth' });
      await sleep(900);
      mm.hold = true;
      mm.rush = 70;
      await new Promise<void>((done) => {
        mm.tx = ee.x + S + 16;
        mm.ty = ee.y;
        mm.goal = done;
      });
      mm.rush = undefined;
      mm.angle = -90; // エコーのほうを向く
      await sleep(700);
    }
    if (name === 'together') {
      // 二人いっしょに、どこへでも歩く（エコーは、マージのそばを、ゆっくりついていく）
      const mm = this.movers.get('m')!;
      const ee = this.movers.get('e')!;
      this.together = true;
      mm.hold = false;
      mm.wait = 1.5;
      ee.hold = false;
      ee.rush = 40; // エコーは、ふだんの速さが 0（立ちどまっている子）なので、ここで歩く速さを決める
      ee.wait = 2;
      ee.faceText.textContent = ee.r.face;
    }
    if (name === 'uptimeHides') {
      // アップタイムが、いつのまにか、クロスの看板の裏で寝ている
      const u = this.movers.get('u')!;
      const s = this.signBox();
      // 立方体の上の面が、看板の上からはみ出さないよう、少し下に
      [u.x, u.y] = [s.x + (s.w - S) / 2, s.y + 12];
      [u.tx, u.ty] = [u.x, u.y];
      u.hold = true;
      u.hidden = true;
      this.wake(u, false);
    }
    if (name === 'snore') {
      // 看板の裏から、アップタイムの寝息（吹き出しだけ、看板の上に見える）
      if (instant) return;
      this.scrollTo('home');
      await sleep(500);
      this.bubble('u', 'ぐう……', 4200, true);
      await sleep(1400);
    }
    if (name === 'overflowArrives') {
      // オーバーフローが、ページの右の端から走ってくる
      const o = this.movers.get('o')!;
      const s = this.signBox();
      o.el.style.display = '';
      o.hidden = false;
      const to: [number, number] = [s.x - 160, s.y + 96];
      if (instant) {
        [o.x, o.y] = to;
        [o.tx, o.ty] = to;
        o.hold = false;
        return;
      }
      this.scrollTo('home');
      [o.x, o.y] = [this.world.clientWidth - S, s.y + 96];
      o.hold = true;
      o.rush = 240;
      await new Promise<void>((done) => {
        [o.tx, o.ty] = to;
        o.goal = done;
      });
      o.rush = undefined;
      o.hold = false;
      o.wait = 2;
    }
    if (name === 'overflowRuns') {
      // オーバーフローが、小道の奥（ページの外）まで走っていく
      const o = this.movers.get('o')!;
      const l = this.laneBox();
      const to = this.edgeSpot();
      o.hold = true;
      if (instant) {
        [o.x, o.y] = to;
        [o.tx, o.ty] = to;
        return;
      }
      // まず小道の入り口まで行って、それから奥へ
      o.rush = 200;
      await new Promise<void>((done) => {
        [o.tx, o.ty] = [l.x - S + 4, l.y + HEDGE + 6];
        o.goal = done;
      });
      [o.tx, o.ty] = to;
      o.goal = () => (o.rush = undefined);
      // 道の真ん中を過ぎたら、次のせりふへ（オーバーフローは、そのまま奥まで走る）
      while (o.x < l.x + l.w / 2 && o.goal) await sleep(100);
    }
    if (name === 'overflowTeeters') {
      // 小道のいちばん端で、落ちそうになって、ゆらゆら揺れる（柵ができるまで）
      const o = this.movers.get('o')!;
      if (!instant) while (o.goal) await sleep(100);
      this.overflowAtEdge = true;
      this.teeter();
    }
    if (name === 'fenceUp') {
      // 道の端に柵が出て、オーバーフローの揺れが止まる（柵が見える所まで送る）
      if (instant) return;
      this.scrollTo('home');
      await sleep(1200);
    }
    if (name === 'overflowBack') {
      // オーバーフローが、小道を戻ってくる
      const o = this.movers.get('o')!;
      const l = this.laneBox();
      this.overflowAtEdge = false;
      this.teeter();
      const to: [number, number] = [l.x - S - 40, l.y + HEDGE + 70];
      if (instant) {
        [o.x, o.y] = to;
        [o.tx, o.ty] = to;
        o.hold = false;
        return;
      }
      o.rush = 120;
      await new Promise<void>((done) => {
        [o.tx, o.ty] = [l.x - S + 4, l.y + HEDGE + 6];
        o.goal = done;
      });
      [o.tx, o.ty] = to;
      o.goal = () => {
        o.rush = undefined;
        o.hold = false;
        o.wait = 2;
      };
    }
    if (name === 'party') {
      // 1日目の夜。みんなで、ヘッドの家の前に輪になって集まる（マージとエコーも、ここから二人で歩けるようになる）
      await this.fx('together', instant);
      // ワーカーも、走るのをやめて、みんなの所へ来る（ここからは、ほかの子と同じように歩く）
      this.freeWorker();
      const g = this.gardenBox();
      const cx = g.x + g.w / 2 - S / 2;
      const cy = g.y + 236;
      this.nightEl.style.setProperty('--lx', `${cx + S / 2}px`);
      this.nightEl.style.setProperty('--ly', `${cy + S / 2}px`);
      this.nightEl.classList.add('on');
      this.settle();
      const ring = ['h', 'v', 'w', 'l', 'u', 'm', 'e'];
      ring.forEach((id, i) => {
        const m = this.movers.get(id)!;
        const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
        const [x, y] = [cx + Math.cos(a) * 92, cy + Math.sin(a) * 58];
        m.hold = true;
        m.hidden = false;
        if (instant) [m.x, m.y] = [x, y];
        [m.tx, m.ty] = [x, y];
        m.rush = 110;
        // 演出で決まった所へ歩くので、ぶつからない。着いたら、輪のまんなかを向く
        const face = (Math.atan2(cx - x, cy - y) * 180) / Math.PI;
        m.goal = () => {
          m.rush = undefined;
          m.angle = nearAngle(m.angle, face);
        };
        if (instant) m.angle = face;
      });
      if (!instant) {
        this.scrollTo('home');
        await sleep(2600);
      }
    }
    if (name === 'cheer') {
      if (instant) return;
      for (const m of this.movers.values()) m.el.classList.add('cheer');
      await sleep(1000);
      for (const m of this.movers.values()) m.el.classList.remove('cheer');
    }
    if (name === 'nextDay' || name === 'nextDay3') {
      // 次の日の朝（暗転のあいだに呼ぶ）。夜が明けて、みんな また歩きだす。2日目の朝は、アップタイムが、いつのまにか看板の裏で寝ている
      this.nightEl.classList.remove('on');
      for (const id of ['h', 'v', 'w', 'l', 'm', 'e']) {
        const m = this.movers.get(id)!;
        m.hold = false;
        m.goal = undefined;
        m.rush = id === 'e' ? 40 : undefined; // エコーは、ふだんの速さが 0 なので
        m.wait = 1.5 + Math.random() * 2;
        m.asleep = false;
        m.el.classList.remove('sleepy');
        if (id === 'v') m.faceText.textContent = m.r.face;
      }
      if (name === 'nextDay') await this.fx('uptimeHides', true);
      else {
        // 3日目の朝。アップタイムは、軒下で寝たまま
        const u = this.movers.get('u')!;
        u.hold = false;
        u.goal = undefined;
        u.wait = 3;
      }
    }
    if (name === 'linkToValley') {
      // リンクが、ページのいちばん下の、谷のふちへ行く（着くのは待たない。プレイヤーが、追いかけて見つける）
      const l = this.movers.get('l')!;
      const to = this.brinkSpot();
      const arrive = () => {
        l.rush = undefined;
        l.angle = nearAngle(l.angle, 90); // 谷のほうを向く
        this.linkAtValley = true;
      };
      l.hold = true;
      if (instant) {
        [l.x, l.y] = to;
        [l.tx, l.ty] = to;
        arrive();
        return;
      }
      l.rush = 300;
      [l.tx, l.ty] = to;
      l.goal = arrive;
      await sleep(900);
    }
    if (name === 'valleyGather') {
      // v・ワーカー・オーバーフローも、谷のこちら側まで追いかけてきて、そこで待つ
      const [bx, by] = this.brinkSpot();
      const spots: [string, number, number][] = [
        ['v', bx - 96, by + 44],
        ['w', bx - 168, by - 6],
        ['o', bx - 74, by - 48],
      ];
      for (const [id, x, y] of spots) {
        const m = this.movers.get(id)!;
        m.hold = true;
        if (instant) [m.x, m.y] = [x, y];
        [m.tx, m.ty] = [x, y];
        m.rush = 320;
        m.goal = () => {
          m.rush = undefined;
          m.angle = nearAngle(m.angle, 90);
        };
      }
      if (!instant) await sleep(600);
    }
    if (name === 'bridge') {
      // リンクが倒れて、谷にかかる橋になる（谷が見える所まで送る）
      if (instant) return;
      this.scrollTo('valley');
      await sleep(1200);
    }
    if (name === 'crossBridge') {
      // ワーカー・v・オーバーフローが、リンクの上を渡って、谷の向こうへ行く
      const v = this.valleyBox();
      const y = this.bridgeY();
      await Promise.all(
        ['w', 'v', 'o'].map(async (id, i) => {
          const m = this.movers.get(id)!;
          const far: [number, number] = [v.x + CHASM + 30 + i * 58, v.y + CHASM_TOP + 34 + (i % 2) * 64];
          if (instant) {
            [m.x, m.y] = far;
            [m.tx, m.ty] = far;
          } else {
            await sleep(i * 500);
            m.hold = true;
            m.rush = 150;
            await this.walkTo(m, v.x - S - 6, y);
            await this.walkTo(m, v.x + CHASM + 8, y);
            await this.walkTo(m, ...far);
          }
          m.rush = undefined;
          m.hold = false;
          m.wait = 2 + i;
        }),
      );
    }
    if (name === 'uptimeWalks') {
      // 寝ぼけたアップタイムが、橋を渡ってきて、谷のふちへ ふらふら歩いていく。心配したヘッドも、谷のこちら側まで来る
      const u = this.movers.get('u')!;
      const h = this.movers.get('h')!;
      const v = this.valleyBox();
      const [bx, by] = this.brinkSpot();
      const hSpot: [number, number] = [bx - 84, by + 12];
      const astray = () => {
        u.rush = undefined;
        u.el.classList.add('teeter');
      };
      u.hold = true;
      u.hidden = false;
      h.hold = true;
      this.wake(u, false);
      if (instant) {
        [u.x, u.y] = this.astraySpot();
        [u.tx, u.ty] = [u.x, u.y];
        [h.x, h.y] = hSpot;
        [h.tx, h.ty] = hSpot;
        h.angle = 90;
        astray();
        return;
      }
      this.scrollTo('valley');
      // 庭からは遠いので、画面の上の外から歩いてくる
      [u.x, u.y] = [bx - 30, v.y - 520];
      [h.x, h.y] = [bx - 150, v.y - 620];
      h.rush = 240;
      void this.walkTo(h, ...hSpot).then(() => {
        h.rush = undefined;
        h.angle = nearAngle(h.angle, 90);
      });
      u.rush = 230;
      await this.walkTo(u, v.x - S - 6, this.bridgeY());
      u.rush = 55;
      await this.walkTo(u, v.x + CHASM + 8, this.bridgeY());
      // そのまま、谷のふちへ（着くのは待たない）
      u.rush = 26;
      void this.walkTo(u, ...this.astraySpot()).then(astray);
    }
    if (name === 'vTilts') {
      // v が、柱の前へ行って、首をかしげる（矢印の札のかわりに、ここに立つ）
      const m = this.movers.get('v')!;
      const to = this.forkSpot();
      m.hold = true;
      if (instant) {
        [m.x, m.y] = to;
        [m.tx, m.ty] = to;
        this.vTilting = true;
        this.vLook();
        return;
      }
      this.scrollTo('valley');
      m.rush = 140;
      await this.walkTo(m, ...to);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, 0);
      await sleep(500);
      this.vTilting = true;
      this.vLook();
      await sleep(1300);
    }
    if (name === 'arrow') {
      // v の顔が > になった。アップタイムが、矢印のとおりに、右の道の先の昼寝場所へ歩いていく
      const u = this.movers.get('u')!;
      const to = this.napSpot();
      u.el.classList.remove('teeter');
      if (instant) {
        [u.x, u.y] = to;
        [u.tx, u.ty] = to;
        return;
      }
      this.scrollTo('valley');
      await sleep(900);
      u.rush = 60;
      await this.walkTo(u, ...to);
      u.rush = undefined;
    }
    if (name === 'vBack') {
      // v が、元に戻る（書き足した transform の行も消える）。また、自由に歩く
      const m = this.movers.get('v')!;
      this.vTilting = false;
      this.model.remove('.v', 'transform');
      this.vLook();
      m.hold = false;
      m.wait = 2;
      if (!instant) await sleep(700);
    }
    if (name === 'toBed') {
      // エコー・v・ワーカーが、橋を渡って、谷の向こうの寝床のそばへ行く。ヘッドは、谷のこちら側まで（着くのは待たない）
      const v = this.valleyBox();
      const [bx, by] = this.bedSpot();
      const [kx, ky] = this.brinkSpot();
      const y = this.bridgeY();
      const far: [string, number, number, number][] = [
        ['e', bx - 76, by + 6, 90],
        ['v', bx + 80, by + 14, -90],
        ['w', bx - 10, by - 62, 0],
      ];
      for (const [id, x, y2, face] of far) {
        const m = this.movers.get(id)!;
        m.hold = true;
        m.goal = undefined;
        const arrive = () => {
          m.rush = undefined;
          m.angle = nearAngle(m.angle, face);
        };
        if (instant) {
          [m.x, m.y] = [x, y2];
          [m.tx, m.ty] = [x, y2];
          m.angle = face;
          continue;
        }
        m.rush = 330;
        void this.walkTo(m, v.x - S - 6, y)
          .then(() => this.walkTo(m, v.x + CHASM + 8, y))
          .then(() => this.walkTo(m, x, y2))
          .then(arrive);
      }
      const h = this.movers.get('h')!;
      const hs: [number, number] = [kx - 84, ky + 12];
      h.hold = true;
      h.goal = undefined;
      if (instant) {
        [h.x, h.y] = hs;
        [h.tx, h.ty] = hs;
        h.angle = 90;
        return;
      }
      h.rush = 300;
      void this.walkTo(h, ...hs).then(() => {
        h.rush = undefined;
        h.angle = nearAngle(h.angle, 90);
      });
      await sleep(900);
    }
    if (name === 'tWakes') {
      // コメントが外れて、テンプが寝床にあらわれ、目をさます
      if (!instant) {
        this.scrollTo('valley');
        await sleep(1500);
      }
      this.tAwake = true;
      this.applyCss();
      if (!instant) await sleep(700);
    }
    if (name === 'headTurns') {
      // ヘッドが、なにも言わずに、背を向ける
      const h = this.movers.get('h')!;
      h.angle = nearAngle(h.angle, 180);
      if (!instant) await sleep(1200);
    }
    if (name === 'tUp') {
      // テンプが寝床を出て、みんな また自由に歩く
      this.tFree = true;
      for (const id of ['t', 'e', 'v', 'w', 'h']) {
        const m = this.movers.get(id)!;
        m.hold = false;
        m.goal = undefined;
        m.rush = id === 'e' ? 40 : undefined; // エコーは、ふだんの速さが 0 なので
        m.wait = 1.5 + Math.random() * 2;
      }
    }
    if (name === 'vToCards') {
      // v が、「住人たち」の紹介カードの所へ行って、じっと見ている
      const m = this.movers.get('v')!;
      const sec = this.page.querySelector<HTMLElement>('#residents')!;
      const to: [number, number] = [this.page.offsetLeft + sec.offsetLeft + sec.offsetWidth / 2 - 150, this.page.offsetTop + sec.offsetTop - 14];
      m.hold = true;
      m.goal = undefined;
      if (instant) {
        [m.x, m.y] = to;
        [m.tx, m.ty] = to;
        return;
      }
      this.scrollTo('residents');
      m.rush = 150;
      await this.walkTo(m, ...to);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, 0);
      await sleep(400);
    }
    if (name === 'vCard') {
      // クロスが、からっぽのカードを、いちばん後ろに足す
      this.vCardShown = true;
      this.applyCss();
      if (instant) return;
      this.showVCard();
      await sleep(1300);
    }
    if (name === 'vCardText') {
      // クロスが、カードに紹介文を書きたす。v は、また自由に歩く
      const m = this.movers.get('v')!;
      this.model.flags.add('vCardText');
      this.applyCss();
      m.hold = false;
      m.wait = 2;
      if (instant) return;
      this.showVCard();
      await sleep(1300);
    }
    if (name === 'headToSign') {
      // ヘッドが、クロスの看板の前まで歩いていく（夜明け前。みんなは寝ている）
      const h = this.movers.get('h')!;
      const to = this.headSpot();
      h.hold = true;
      if (instant) {
        [h.x, h.y] = to;
        [h.tx, h.ty] = to;
        h.angle = 90;
        this.headAtSign = true;
        return;
      }
      this.scrollTo('home');
      h.rush = 70;
      await this.walkTo(h, ...to);
      h.rush = undefined;
      h.angle = nearAngle(h.angle, 90); // 看板のほうを向く
      this.headAtSign = true;
      await sleep(500);
    }
    if (name === 'showNotice') {
      // 帯が出てきた。小道が見える所まで送る
      if (instant) return;
      this.scrollTo('home');
      await sleep(1400);
    }
    if (name === 'linkLetter') {
      // リンクが、橋をやめて立ち、ページのいちばん下（フッターの右）で、字のかわりに じっと立つ
      const l = this.movers.get('l')!;
      const to = this.letterSpot();
      this.linkAtValley = false;
      l.hold = true;
      l.goal = undefined;
      if (instant) {
        [l.x, l.y] = to;
        [l.tx, l.ty] = to;
        return;
      }
      this.scrollTo('valley');
      await sleep(1200); // 立ち上がるのを、見せる
      l.rush = 150;
      await this.walkTo(l, ...to);
      l.rush = undefined;
      await sleep(500);
    }
    if (name === 'linkBack') {
      // リンクが、字の役をやめて、戻ってくる（橋のままなら、橋のまま）
      const l = this.movers.get('l')!;
      if (!this.bridged()) {
        this.linkAtValley = false;
        l.hold = false;
        l.goal = undefined;
        l.wait = 1.5;
      }
      if (!instant) await sleep(600);
    }
    if (name === 'night5' || name === 'night6') {
      // 5日目の夜（暗転のあいだに呼ぶ）。みんなは寝て、ヘッドだけが、庭のまわりを歩きつづける。
      // 起きているのは、v（眠れない）・テンプ（ずっと寝ていたので、眠くない）・マージ（ヘッドが気になる）
      const g = this.gardenBox();
      const eaves: [number, number] = [g.x + g.w / 2 + 52, g.y + 132];
      this.nightEl.style.setProperty('--lx', `${eaves[0]}px`);
      this.nightEl.style.setProperty('--ly', `${eaves[1]}px`);
      this.nightEl.classList.add('on');
      this.settle();
      const spots: [string, number, number, number][] = [
        ['u', eaves[0], eaves[1], 0],
        ['v', eaves[0] + S + 10, eaves[1] + 6, 0],
        // テンプは、少し はなれた所（v のとなりは、あとで ヘッドが座る）
        ['t', eaves[0] + S * 3 + 46, eaves[1] + 44, -40],
        ['m', eaves[0] - S - 34, eaves[1] + 44, 40],
        ['e', eaves[0] - S * 2 - 46, eaves[1] + 56, 60],
        ['w', g.x + 70, g.y + 60, 0],
        ['o', g.x + 150, g.y + 100, 0],
      ];
      for (const [id, x, y, face] of spots) {
        const m = this.movers.get(id)!;
        m.hold = true;
        m.goal = undefined;
        m.rush = undefined;
        [m.x, m.y] = [x, y];
        [m.tx, m.ty] = [x, y];
        m.angle = face;
      }
      this.wake(this.movers.get('u')!, false);
      const h = this.movers.get('h')!;
      h.hold = true;
      h.goal = undefined;
      if (name === 'night6') {
        // 引っ越しの前の夜。ヘッドは、もう見回らずに、v のとなりで寝ている
        [h.x, h.y] = [eaves[0] + (S + 10) * 2 + 2, eaves[1] - 2];
        [h.tx, h.ty] = [h.x, h.y];
        h.angle = 0;
      } else {
        // ヘッドは、ページの CSS の animation（patrol）で歩く。位置は、animation が決める
        [h.x, h.y, h.tx, h.ty] = [0, 0, 0, 0];
        h.el.style.transform = '';
        h.body.style.animation = '';
        this.patrolling = true;
        this.makePatrolPath();
      }
      // 朝になるまで、庭を見せておく
      if (!instant) this.scroller.scrollTo({ top: 0 });
    }
    if (name === 'headStops') {
      // ヘッドが、その場で止まる（animation-play-state: paused）。庭が見える所まで送る
      if (instant) return;
      this.scrollTo('home');
      await sleep(1000);
    }
    if (name === 'headRests') {
      // ヘッドが、見回りをやめて、v のとなりに座って、眠る
      const h = this.movers.get('h')!;
      const v = this.movers.get('v')!;
      const to: [number, number] = [v.x + S + 12, v.y - 8];
      if (this.patrolling) {
        const p = this.workerPos(h);
        // ページの CSS の animation（見回り）より、こちらが勝つ
        h.body.style.animation = 'none';
        this.patrolling = false;
        this.makePatrolPath();
        [h.x, h.y] = [p.x, p.y];
        [h.tx, h.ty] = [p.x, p.y];
      }
      h.hold = true;
      if (instant) {
        [h.x, h.y] = to;
        [h.tx, h.ty] = to;
        h.angle = 0;
        this.draw(h);
        return;
      }
      this.draw(h);
      this.scrollTo('home');
      h.rush = 90;
      await this.walkTo(h, ...to);
      h.rush = undefined;
      h.angle = nearAngle(h.angle, 0);
      await sleep(900);
      this.bubble('h', 'すう……', 3000);
      await sleep(900);
    }
    if (name === 'vSleeps6') {
      // v が、首を傾けて眠る（夜6）
      const v = this.movers.get('v')!;
      v.asleep = true;
      v.el.classList.add('sleepy');
      v.faceText.textContent = '-v-';
      if (!instant) await sleep(1200);
    }
    if (name === 'allToValley') {
      // 引っ越しの朝。みんなで、谷のこちら側に集まる。リンクは、谷のふちに立つ（着くのは待たない）
      const [bx, by] = this.brinkSpot();
      this.crossFree = true;
      const spots: [string, number, number][] = [
        ['h', bx - 84, by + 12],
        ['v', bx - 150, by + 56],
        ['t', bx - 214, by + 8],
        ['w', bx - 112, by + 108],
        ['o', bx - 196, by + 118],
        ['m', bx - 276, by + 70],
        ['e', bx - 338, by + 84],
        ['u', bx - 258, by + 148],
        ['x', bx - 346, by + 14],
      ];
      for (const [id, x, y] of spots) {
        const m = this.movers.get(id)!;
        m.hold = true;
        m.hidden = false;
        m.goal = undefined;
        if (instant) [m.x, m.y] = [x, y];
        m.rush = 340;
        [m.tx, m.ty] = [x, y];
        m.goal = () => {
          m.rush = undefined;
          m.angle = nearAngle(m.angle, 90); // 谷のほうを向く
        };
        if (instant) m.angle = 90;
      }
      const l = this.movers.get('l')!;
      const to = this.brinkSpot();
      l.hold = true;
      const arrive = () => {
        l.rush = undefined;
        l.angle = nearAngle(l.angle, 90);
        this.linkAtValley = true;
      };
      if (instant) {
        [l.x, l.y] = to;
        [l.tx, l.ty] = to;
        l.goal = undefined;
        arrive();
        return;
      }
      l.rush = 360;
      [l.tx, l.ty] = to;
      l.goal = arrive;
      await sleep(900);
    }
    if (name === 'doorUp') {
      // 谷の向こうの空き地に、引っ越しのリンク（戸口）が立つ（谷が見える所まで送る）
      if (instant) return;
      this.scrollTo('valley');
      await sleep(1800);
    }
    if (name === 'toLetterH' || name === 'toLetterV') {
      // 問題17: 字を消された子が、ページの終わり（字の所）まで歩いて、こちらを向く
      const m = this.movers.get(name === 'toLetterH' ? 'h' : 'v')!;
      const to = this.letterSpot();
      this.stayFrom = { id: m.r.id, x: m.x, y: m.y };
      m.hold = true;
      m.goal = undefined;
      if (instant) {
        [m.x, m.y, m.tx, m.ty] = [...to, ...to];
        return;
      }
      this.scrollTo('valley');
      m.rush = m.r.id === 'v' ? 200 : 80;
      await this.walkTo(m, ...to);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, 0);
      await sleep(600);
    }
    if (name === 'stayNo') {
      // 問題17:「待って」。字の所へ行った子が、元いた所へ戻る
      const from = this.stayFrom;
      this.stayFrom = null;
      if (!from) return;
      const m = this.movers.get(from.id)!;
      if (instant) {
        [m.x, m.y, m.tx, m.ty] = [from.x, from.y, from.x, from.y];
        return;
      }
      m.rush = m.r.id === 'v' ? 200 : 80;
      await this.walkTo(m, from.x, from.y);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, 90);
    }
    if (name === 'vTurns' || name === 'hStands') {
      // 問題17: v が横を向いて > になる ／ ヘッドが、まっすぐ立つ（見た目は、applyCss と drawCube が決める）
      if (!instant) await sleep(1500);
    }
    if (name === 'crossAll') {
      // 問題17: 残る子と、最後に渡る子（ヘッドか v）のほかは、みんな、橋を渡って、戸口の前に集まる
      if (!instant) this.scrollTo('valley');
      const v = this.valleyBox();
      const y = this.bridgeY();
      const [dx, dy] = this.doorSpot();
      const spots: [string, number, number][] = [
        ['o', dx - 58, dy + 4],
        ['w', dx - 116, dy + 4],
        ['t', dx - 66, dy + 62],
        ['m', dx - 124, dy + 62],
        ['e', dx - 178, dy + 62],
        ['x', dx - 170, dy + 4],
        ['u', dx - 150, dy + 118],
      ];
      await Promise.all(
        spots.map(async ([id, x, y2], i) => {
          const m = this.movers.get(id)!;
          m.hold = true;
          m.goal = undefined;
          if (instant) {
            [m.x, m.y, m.tx, m.ty] = [x, y2, x, y2];
            return;
          }
          await sleep(i * 650);
          m.rush = 170;
          await this.walkTo(m, v.x - S - 6, y);
          await this.walkTo(m, v.x + CHASM + 8, y);
          await this.walkTo(m, x, y2);
          m.rush = undefined;
          m.angle = nearAngle(m.angle, 90); // 戸口のほうを向く
        }),
      );
    }
    if (name === 'lastCross') {
      // 問題17: 残らないほう（ヘッドか v）が、最後に橋を渡って、一度だけ ふり返る
      const m = this.movers.get(stayer(this.model) === 'h' ? 'v' : 'h')!;
      const v = this.valleyBox();
      const y = this.bridgeY();
      const [dx, dy] = this.doorSpot();
      const to: [number, number] = [dx - 92, dy + 118];
      m.hold = true;
      m.goal = undefined;
      if (instant) {
        [m.x, m.y, m.tx, m.ty] = [...to, ...to];
        return;
      }
      this.scrollTo('valley');
      m.rush = 110;
      await this.walkTo(m, v.x - S - 6, y);
      await this.walkTo(m, v.x + CHASM + 8, y);
      await sleep(500);
      m.angle = nearAngle(m.angle, -90); // 残った子のほうを、ふり返る
      await sleep(1800);
      await this.walkTo(m, ...to);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, 90);
    }
    if (name === 'linkOver') {
      // 問題17: みんなが渡ったあと、リンクが、向こう岸で起き上がる（橋は、なくなる）。それから、戸口の前へ
      const l = this.movers.get('l')!;
      const v = this.valleyBox();
      const [dx, dy] = this.doorSpot();
      const to: [number, number] = [dx - 34, dy + 118];
      const y = l.y;
      this.linkAtValley = false;
      l.hold = true;
      l.goal = undefined;
      this.model.set('.l', 'transform', 'none');
      if (instant) {
        [l.x, l.y, l.tx, l.ty] = [...to, ...to];
        return;
      }
      this.scrollTo('valley');
      [l.x, l.y, l.tx, l.ty] = [v.x + CHASM + 8, y, v.x + CHASM + 8, y];
      await sleep(1300);
      l.rush = 150;
      await this.walkTo(l, ...to);
      l.rush = undefined;
      l.angle = nearAngle(l.angle, 90);
    }
    if (name === 'throughDoor') {
      // 問題17: みんなが、ひとりずつ、戸口をくぐる（くぐった子は、見えなくなる。引っ越し先で、また出てくる）
      if (instant) return;
      this.scrollTo('valley');
      const [dx, dy] = this.doorSpot();
      const stay = stayer(this.model);
      const ids = ['o', 'w', 't', 'x', 'm', 'e', 'u', 'l', stay === 'h' ? 'v' : 'h'];
      await Promise.all(
        ids.map(async (id, i) => {
          const m = this.movers.get(id)!;
          await sleep(i * 480);
          m.rush = 150;
          await this.walkTo(m, dx + 10, dy + 30);
          m.rush = undefined;
          m.el.style.transition = 'opacity 0.4s ease';
          m.el.style.opacity = '0';
        }),
      );
      await sleep(900);
    }
    if (name === 'moved') {
      // 引っ越しが済んだ（暗転のあいだに呼ぶ）。ことりサーバーの、新しいページ。みんなは、庭に出てくる。
      // 字のかわりに残った子は、ページのいちばん下に、じっと立っている（step が、そこに置く）
      this.model.flags.add('moved');
      this.linkAtValley = false;
      this.headAtSign = false;
      this.crossFree = false; // クロスは、また、看板の左に立つ
      this.nightEl.classList.remove('on');
      const g = this.gardenBox();
      const cx = g.x + g.w / 2;
      // ヘッドと v は、二人とも庭へ（残った子は、このあと step が、ページのいちばん下に置く）
      const spots: [string, number, number][] = [
        ['h', cx - S / 2, g.y + 190],
        ['v', cx - 140, g.y + 150],
        ['l', cx + 110, g.y + 210],
        ['w', g.x + 80, g.y + 250],
        ['o', g.x + 200, g.y + 320],
        ['t', cx - 190, g.y + 232],
        ['m', cx - 60, g.y + 318],
        ['e', cx - 124, g.y + 334],
        ['u', cx + 52, g.y + 132],
      ];
      for (const [id, x, y] of spots) {
        const m = this.movers.get(id)!;
        [m.x, m.y, m.tx, m.ty] = [x, y, x, y];
        m.hold = false;
        m.goal = undefined;
        m.rush = id === 'e' ? 40 : undefined; // エコーは、ふだんの速さが 0 なので
        m.wait = 1.5 + Math.random() * 3;
        m.angle = 0;
      }
      for (const m of this.movers.values()) {
        m.el.style.transition = '';
        m.el.style.opacity = '';
      }
      this.wake(this.movers.get('u')!, false);
      this.applyCss();
      if (!instant) this.scroller.scrollTo({ top: 0 });
    }
    if (name === 'showLetter') {
      // 引っ越し先: ページのいちばん下で、字になって立っている子を見せる
      if (instant) return;
      const [, ly] = this.letterSpot();
      const max = this.scroller.scrollHeight - this.scroller.clientHeight;
      this.scroller.scrollTo({ top: clamp(ly - this.scroller.clientHeight * 0.4, 0, max), behavior: 'smooth' });
      await sleep(1800);
    }
    if (name === 'beside') {
      // 引っ越し先: 残らなかったほう（ヘッドか v）が、字になった子の、となりに来る（そのあとは、step が、そこに置く）
      const m = this.movers.get(stayer(this.model) === 'h' ? 'v' : 'h')!;
      const to = this.besideSpot();
      m.hold = true;
      m.goal = undefined;
      if (instant) {
        if (m.r.id === 'h') this.model.flags.add('beside');
        else m.hold = false;
        return;
      }
      // 庭からは遠いので、画面の上の外から来る
      [m.x, m.y] = [to[0] - 120, to[1] - 520];
      m.rush = m.r.id === 'v' ? 300 : 170;
      await this.walkTo(m, ...to);
      m.rush = undefined;
      m.angle = nearAngle(m.angle, m.r.id === 'v' ? 90 : 0);
      // ヘッドは、ここで、ずっと眠る。v は、この場面が終わったら、また遊びに行く（theEnd）
      if (m.r.id === 'h') this.model.flags.add('beside');
      await sleep(500);
    }
    if (name === 'theEnd') {
      // おわり（暗転のあいだに呼ぶ）。ヘッドのとなりに来ていた v は、また、自由に歩く
      const v = this.movers.get('v')!;
      if (stayer(this.model) === 'h') {
        v.hold = false;
        v.goal = undefined;
        v.wait = 2;
      }
    }
    if (name === 'lastUpdate') {
      // 止まっていた「最終更新」が、今日の日付になる
      const d = new Date();
      const two = (n: number) => String(n).padStart(2, '0');
      this.model.texts.set('#updated', d.getFullYear() + '/' + two(d.getMonth() + 1) + '/' + two(d.getDate()));
      this.applyCss();
      if (instant) return;
      const foot = this.page.querySelector<HTMLElement>('footer')!;
      const max = this.scroller.scrollHeight - this.scroller.clientHeight;
      this.scroller.scrollTo({ top: clamp(this.page.offsetTop + foot.offsetTop - this.scroller.clientHeight * 0.35, 0, max), behavior: 'smooth' });
      await sleep(1800);
    }
    if (name === 'nextDay6' || name === 'nextDay7') {
      // 6日目の朝（暗転のあいだに呼ぶ）。夜が明けて、みんな また歩きだす
      await this.fx('nextDay3', instant);
      for (const id of ['t', 'o']) {
        const m = this.movers.get(id)!;
        m.hold = false;
        m.goal = undefined;
        m.wait = 1.5 + Math.random() * 2;
      }
    }
    if (name === 'dawn4') {
      // 4日目の朝（暗転のあいだに呼ぶ）。夜が明けて、みんな また歩きだす
      this.headAtSign = false;
      await this.fx('nextDay3', instant);
    }
    if (name === 'thatNight') {
      // その夜（暗転のあいだに呼ぶ）。v はアップタイムのとなりで眠り、ヘッドが見回っている
      await this.fx('night', true);
      await this.fx('vSleeps', true);
      // 谷の向こうにいたワーカーとオーバーフローも、庭へ帰って寝ている
      const g = this.gardenBox();
      for (const [id, x, y] of [['w', g.x + 110, g.y + 250], ['o', g.x + 190, g.y + 310]] as [string, number, number][]) {
        const m = this.movers.get(id)!;
        [m.x, m.y] = [x, y];
        [m.tx, m.ty] = [x, y];
        m.goal = undefined;
      }
    }
    if (name === 'night') {
      // 日が暮れる。アップタイムは軒下で寝て、v は、そのとなりで眠れずにいる（夜2）。ヘッドは、庭のはしを見回っている
      const g = this.gardenBox();
      const eaves: [number, number] = [g.x + g.w / 2 + 52, g.y + 132];
      const spots: [string, number, number][] = [
        ['u', eaves[0], eaves[1]],
        ['v', eaves[0] + S + 10, eaves[1] + 6],
        ['h', g.x + 70, g.y + 290],
      ];
      this.nightEl.style.setProperty('--lx', `${eaves[0]}px`);
      this.nightEl.style.setProperty('--ly', `${eaves[1]}px`);
      this.nightEl.classList.add('on');
      this.settle();
      for (const [id, x, y] of spots) {
        const m = this.movers.get(id)!;
        m.hold = true;
        m.hidden = false;
        if (instant) [m.x, m.y] = [x, y];
        [m.tx, m.ty] = [x, y];
        m.rush = 110;
        // 演出で決まった所へ歩くので、ぶつからない
        m.goal = () => {
          m.rush = undefined;
        };
      }
      const u = this.movers.get('u')!;
      this.wake(u, false);
      if (!instant) {
        this.scrollTo('home');
        await sleep(2400);
      }
    }
    if (name === 'vSleeps') {
      // v が、アップタイムのとなりで、首を傾けて眠る。見回りのヘッドが、二人のそばへ来て、二人のほうを向く
      const v = this.movers.get('v')!;
      v.asleep = true;
      v.el.classList.add('sleepy');
      v.faceText.textContent = '-v-'; // 目をつむる
      const h = this.movers.get('h')!;
      const u = this.movers.get('u')!;
      const to: [number, number] = [u.x - S - 40, u.y + 24];
      if (instant) {
        [h.x, h.y] = to;
        [h.tx, h.ty] = to;
        h.angle = 90;
        return;
      }
      await sleep(1200);
      h.rush = 60;
      await new Promise<void>((done) => {
        [h.tx, h.ty] = to;
        h.goal = done;
      });
      h.rush = undefined;
      h.angle = nearAngle(h.angle, 90);
      await sleep(600);
    }
    if (name === 'uptimeFound') {
      // アップタイムが看板の前に出てきて、目をさまし、看板の裏から出てくる
      const u = this.movers.get('u')!;
      const s = this.signBox();
      u.hidden = false;
      this.wake(u, true);
      const to: [number, number] = [s.x - 60, s.y + 74];
      if (instant) {
        [u.x, u.y] = to;
        [u.tx, u.ty] = to;
        u.hold = false;
        return;
      }
      await sleep(600);
      u.rush = 60;
      await new Promise<void>((done) => {
        [u.tx, u.ty] = to;
        u.goal = done;
      });
      u.rush = undefined;
      u.hold = false;
      u.wait = 3;
    }
    if (name === 'roofFixed') {
      const l = this.movers.get('l')!;
      l.hold = false;
      l.wait = 1;
      this.uptimeAtEaves = false;
    }
  }
}

/**
 * ページの上で打つ所（contenteditable）は、Enter で決まる（そこから、カーソルが外れる）。
 * 日本語入力のままだと、Enter のキーが「Enter」として届かないことがあるので、「改行を入れようとした」合図（beforeinput）でも決める。
 * 変換を決める Enter は、数えない
 */
function endOnEnter(el: HTMLElement) {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      el.blur();
    }
  });
  el.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
      e.preventDefault();
      el.blur();
    }
  });
}

function div(cls: string) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** クロスの札に書く字（せりふの〔 〕を外す） */
const boardText = (text: string) => text.replace(/^〔|〕$/g, '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 回る向きが、いちばん近くなるような角度（359° → 1° で、ぐるっと回らないように） */
function nearAngle(prev: number, target: number) {
  let d = ((target - prev) % 360) + 360;
  d = ((d + 180) % 360) - 180;
  return prev + d;
}
