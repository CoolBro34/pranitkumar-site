const CLOUD = {
  BLEED_X: 36, BLEED_Y: 28,
  FLOAT_DUR: [4.5, 7.2], FLOAT_DELAY: [0, 2.8],
};
function rnd(a,b){return a+Math.random()*(b-a);}
function makeCloudBg(el) {
  const old = el.querySelector('.pk-cloud-bg');
  if (old) old.remove();
  const w = el.offsetWidth, h = el.offsetHeight;
  const bgW = w + CLOUD.BLEED_X*2, bgH = h + CLOUD.BLEED_Y*2;
  const bg = document.createElement('div');
  bg.className = 'pk-cloud-bg';
  bg.style.cssText = `position:absolute;left:${-CLOUD.BLEED_X}px;top:${-CLOUD.BLEED_Y}px;width:${bgW}px;height:${bgH}px;pointer-events:none;filter:blur(10px);z-index:0;overflow:visible;`;
  [{cx:.50,cy:.52,rx:.42,ry:.34},{cx:.20,cy:.28,rx:.24,ry:.26},
   {cx:.78,cy:.24,rx:.22,ry:.24},{cx:.50,cy:.18,rx:.20,ry:.22},
   {cx:.25,cy:.68,rx:.20,ry:.20},{cx:.74,cy:.70,rx:.18,ry:.18}
  ].forEach(b => {
    const jx=rnd(-.06,.06),jy=rnd(-.05,.05),jr=rnd(-.05,.07);
    const cx=(b.cx+jx)*bgW, cy=(b.cy+jy)*bgH;
    const rx=(b.rx+jr)*bgW, ry=(b.ry+jr*.8)*bgH;
    const blob = document.createElement('div');
    blob.style.cssText=`position:absolute;background:var(--card-bg,rgba(255,255,255,0.85));border-radius:50%;left:${cx-rx}px;top:${cy-ry}px;width:${rx*2}px;height:${ry*2}px;`;
    bg.appendChild(blob);
  });
  el.style.position = 'relative';
  el.insertBefore(bg, el.firstChild);
  Array.from(el.childNodes).forEach(n => {
    if (n === bg || n._wrapped) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;z-index:1;';
    n._wrapped = true;
    el.insertBefore(wrap, n);
    wrap.appendChild(n);
  });
  const dur = rnd(...CLOUD.FLOAT_DUR).toFixed(2);
  const delay = rnd(...CLOUD.FLOAT_DELAY).toFixed(2);
  el.style.animation = `cloudFloat ${dur}s ease-in-out ${delay}s infinite`;
}
function init() {
  document.querySelectorAll('.card, .skills-grid p, .grid-item').forEach(makeCloudBg);
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
