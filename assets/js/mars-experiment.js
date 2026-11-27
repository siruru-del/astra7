/* Inline Mars observation. The original ASTRA-7 Astro model is copied without changes. */
(function(global){
'use strict';
const Astro = (() => {
  'use strict';

  const EARTH = 365.256;
  const MARS = 686.98;
  const RM = 1.524;
  const TARGETS = Object.freeze([-55, -35, -15, 0, 15, 35, 55]);
  const TAU = 2 * Math.PI;
  const DEG = 180 / Math.PI;
  const EPS = 1e-10;

  const source_urls = Object.freeze([
    'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    'https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question46.html',
    'https://science.nasa.gov/resource/whats-up-october-2022/',
    'https://science.nasa.gov/solar-system/orbits-and-keplers-laws/'
  ]);

  function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(label + ' must be a finite number');
    }
    return value;
  }

  function period(value) {
    finite(value, 'earthPeriod');
    if (value <= 0) throw new RangeError('earthPeriod must be positive');
    return value;
  }

  function wrap(degrees) {
    const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
    return Object.is(wrapped, -0) ? 0 : wrapped;
  }

  /** Heliocentric coordinates in Earth-orbit radii. Positive y points up. */
  function positions(day, earthPeriod = EARTH) {
    finite(day, 'day');
    period(earthPeriod);
    const earthAngle = TAU * day / earthPeriod;
    const marsAngle = TAU * day / MARS;
    return {
      earth: { x: Math.cos(earthAngle), y: Math.sin(earthAngle) },
      mars: { x: RM * Math.cos(marsAngle), y: RM * Math.sin(marsAngle) }
    };
  }

  /** Relative ecliptic longitude: the initial opposition direction is 0°. */
  function longitude(day, earthPeriod = EARTH) {
    const { earth, mars } = positions(day, earthPeriod);
    return wrap(Math.atan2(mars.y - earth.y, mars.x - earth.x) * DEG);
  }

  /** Analytic angular velocity of the Earth-to-Mars vector, in degrees/day. */
  function rate(day, earthPeriod = EARTH) {
    finite(day, 'day');
    period(earthPeriod);
    const we = TAU / earthPeriod;
    const wm = TAU / MARS;
    const cosDifference = Math.cos((we - wm) * day);
    const numerator = RM * RM * wm + we - RM * (wm + we) * cosDifference;
    const denominator = RM * RM + 1 - 2 * RM * cosDifference;
    return numerator / denominator * DEG;
  }

  /* R > 1 keeps R - exp(i Δ) in the right half-plane. This expression is
     continuous for any sampling step, including crossings of ±180°. */
  function continuousLongitude(day, earthPeriod) {
    const marsAngle = TAU * day / MARS;
    const relativeAngle = (TAU / earthPeriod - TAU / MARS) * day;
    return (marsAngle + Math.atan2(-Math.sin(relativeAngle), RM - Math.cos(relativeAngle))) * DEG;
  }

  /** First longitude is signed; subsequent points are unwrapped continuously.
      Both requested endpoints are included, even when step does not divide span. */
  function series(start, end, earthPeriod = EARTH, step = 1) {
    finite(start, 'start');
    finite(end, 'end');
    finite(step, 'step');
    period(earthPeriod);
    if (end < start) throw new RangeError('end must be at least start');
    if (step <= 0) throw new RangeError('step must be positive');
    const count = Math.floor((end - start) / step);
    if (count > 100000) throw new RangeError('series is limited to 100001 regular samples');
    const offset = longitude(start, earthPeriod) - continuousLongitude(start, earthPeriod);
    const rows = [];
    for (let i = 0; i <= count; i++) {
      const day = start + i * step;
      rows.push({ day, lambda: continuousLongitude(day, earthPeriod) + offset, rate: rate(day, earthPeriod) });
    }
    if (end - rows[rows.length - 1].day > EPS) {
      rows.push({ day: end, lambda: continuousLongitude(end, earthPeriod) + offset, rate: rate(end, earthPeriod) });
    }
    return rows;
  }

  /** Stationary points around the initial opposition, or [] if no reversal.
      At the tangent threshold rate(0) = 0 without a sign change: return []. */
  function stationary(earthPeriod = EARTH) {
    period(earthPeriod);
    const we = TAU / earthPeriod;
    const wm = TAU / MARS;
    const difference = Math.abs(we - wm);
    if (difference < EPS) return [];
    const cosine = (RM * RM * wm + we) / (RM * (wm + we));
    if (cosine >= 1 - EPS || cosine <= -1 + EPS) return [];
    const day = Math.acos(cosine) / difference;
    return [-day, day];
  }

  /** Time between equivalent relative configurations. Infinity means no lap. */
  function synodic(earthPeriod = EARTH) {
    period(earthPeriod);
    const frequency = Math.abs(1 / earthPeriod - 1 / MARS);
    return frequency === 0 ? Infinity : 1 / frequency;
  }

  /** Normalize captured records and supply clearly marked model-only rows.
      Scan contract: {checkpoint, day, lambda?, source?, assisted?}.
      Manual/assisted both refer to this simulation, never real telescope data. */
  function analysisRows(scans = []) {
    if (!Array.isArray(scans)) throw new TypeError('scans must be an array');
    const captured = new Map();
    for (const scan of scans) {
      if (!scan || !TARGETS.includes(scan.checkpoint) || !Number.isFinite(scan.day)) continue;
      if (captured.has(scan.checkpoint)) continue;
      captured.set(scan.checkpoint, scan);
    }
    return TARGETS.map(checkpoint => {
      const scan = captured.get(checkpoint);
      if (!scan) return { checkpoint, day: checkpoint, lambda: longitude(checkpoint), source: 'model' };
      const source = scan.source === 'model' ? 'model'
        : scan.source === 'assisted' || scan.assisted === true ? 'assisted' : 'manual';
      return {
        checkpoint,
        day: scan.day,
        lambda: Number.isFinite(scan.lambda) ? wrap(scan.lambda) : longitude(scan.day),
        source
      };
    });
  }

  /** The chord classifies mean change between samples, not every instant.
      Non-increasing dates are invalid evidence; fail explicitly, not silently. */
  function intervals(rows) {
    if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
    return rows.slice(0, -1).map((row, index) => {
      const next = rows[index + 1];
      const start = finite(row.day, 'row.day');
      const end = finite(next.day, 'row.day');
      const days = end - start;
      if (days <= 0) throw new RangeError('observation rows must have increasing dates');
      const delta = wrap(finite(next.lambda, 'row.lambda') - finite(row.lambda, 'row.lambda'));
      return { index, start, end, delta, days, rate: delta / days, retro: delta < -EPS };
    });
  }

  return Object.freeze({
    EARTH, MARS, RM, TARGETS, longitude, rate, positions, series,
    stationary, synodic, analysisRows, intervals, source_urls
  });
})();

const MIN_DAY=-145, MAX_DAY=145, PERIODS=[Astro.EARTH,Astro.MARS,900];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const signed=(n,d=1)=>(n>0?'+':'')+n.toFixed(d);
const dayText=n=>'D'+(Math.abs(n)<.05?'0':signed(n,1));
let mounted=null;

function markup(){
 return `<section class="marsExperiment" data-mars-root aria-label="화성 역행 관측 실험">
 <header class="marsLabHead"><div><h3>같은 화성, 두 가지 시선</h3><p>시간을 움직여 공전 배치와 배경별 기준 위치를 함께 살펴보세요.</p></div><span class="marsPhase" data-mars-phase>순행</span></header>
 <div class="marsViews"><section class="marsView"><h4>위에서 본 공전 · 태양 중심</h4><div data-mars-orbit></div></section><section class="marsView"><h4>지구에서 본 위치 · 배경별 기준</h4><div data-mars-sky></div></section></div>
 <div class="marsLabMetrics"><span>상대 황경 <strong data-mars-longitude>—</strong></span><span>하루 동안의 변화 <strong data-mars-rate>—</strong></span></div>
 <div class="marsTimeline"><div class="marsTimelineTop"><label for="marsDaySlider">충을 기준으로 <output data-mars-day-label>D0</output></label><div class="marsActions"><button type="button" data-mars-play aria-pressed="false">▶ 재생</button><button type="button" data-mars-zero>충 · 0일</button><button type="button" data-mars-record>관측 기록</button></div></div><input id="marsDaySlider" data-mars-slider type="range" min="-145" max="145" step="1" value="95" aria-label="충을 기준으로 한 날짜"><div class="marsTimelineEnds"><span>145일 전</span><span>충 · 0일</span><span>145일 후</span></div><div class="marsPresets" aria-label="날짜별 비교">${Astro.TARGETS.map(d=>`<button type="button" data-mars-preset="${d}">${d===0?'충 · 0':d+'일'}</button>`).join('')}</div></div>
 <div class="marsPeriod"><label for="marsPeriodSelect">지구의 공전주기 비교</label><select id="marsPeriodSelect" data-mars-period><option value="${Astro.EARTH}">실제 지구 · 약 365일</option><option value="${Astro.MARS}">화성과 같은 주기 · 약 687일</option><option value="900">더 느린 가상 지구 · 900일</option></select><p class="marsPeriodNote" data-mars-period-note></p></div>
 <section class="marsGraph"><h4>날짜에 따른 상대 황경 · 내려가는 구간이 역행</h4><div data-mars-graph></div></section>
 <section class="marsCaptures"><h4>이번 실험에서 남긴 관측 <small data-mars-count>0 / 7</small></h4><div class="marsCaptureRows" data-mars-records><p>날짜를 고른 뒤 ‘관측 기록’을 눌러 비교할 장면을 남기세요.</p></div><p class="marsPeriodNote" data-mars-status role="status"></p></section>
 <p class="marsModelNote">기존 ASTRA-7의 원궤도·등속 공전 계산을 사용합니다. D0은 충, 황경 0°는 그때의 지구→화성 방향입니다. 실제 관측 날짜나 천문력은 아니며 행성 크기는 보기 쉽게 표시했습니다.</p>
 </section>`;
}

function mount(host,session,onDayChange){
 unmount();
 const root=host?.querySelector('[data-mars-root]');
 if(!root)return null;
 const s=session||{};
 s.day=clamp(Number.isFinite(s.day)?s.day:95,MIN_DAY,MAX_DAY);
 s.period=PERIODS.includes(s.period)?s.period:Astro.EARTH;
 if(!Array.isArray(s.records))s.records=[];
 const q=sel=>root.querySelector(sel);
 const els={phase:q('[data-mars-phase]'),orbit:q('[data-mars-orbit]'),sky:q('[data-mars-sky]'),longitude:q('[data-mars-longitude]'),rate:q('[data-mars-rate]'),label:q('[data-mars-day-label]'),slider:q('[data-mars-slider]'),play:q('[data-mars-play]'),period:q('[data-mars-period]'),periodNote:q('[data-mars-period-note]'),graph:q('[data-mars-graph]'),records:q('[data-mars-records]'),count:q('[data-mars-count]'),status:q('[data-mars-status]')};
 let playing=false,raf=0,last=0,lastDraw=0,destroyed=false;
 let graphModel=null;
 const reduced=global.matchMedia?.('(prefers-reduced-motion: reduce)');
 const motionName=rate=>Math.abs(rate)<.005?'정지 부근':rate<0?'역행':'순행';
 const p=(x,y)=>`${x.toFixed(2)},${y.toFixed(2)}`;
 const dot=(x,y,r,color,label)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#e3e3ca" stroke-width="1.2"/><text x="${x}" y="${y+r+18}" text-anchor="middle" font-size="12" fill="#e1dfc8">${label}</text>`;
 function prepareGraph(){
  const rows=Astro.series(MIN_DAY,MAX_DAY,s.period,2),values=rows.map(r=>r.lambda),min=Math.min(...values)-3,max=Math.max(...values)+3;
  const x=d=>45+(d-MIN_DAY)/(MAX_DAY-MIN_DAY)*620,y=v=>145-(v-min)/(max-min)*116;
  const stationary=Astro.stationary(s.period).filter(d=>d>MIN_DAY&&d<MAX_DAY);
  let shades='';
  for(let i=1;i<rows.length;i++){if(rows[i-1].rate<0)shades+=`<rect x="${x(rows[i-1].day)}" y="23" width="${x(rows[i].day)-x(rows[i-1].day)+.2}" height="124" fill="#d7b47f" opacity=".13"/>`;}
  graphModel={x,y,min,max,base:`<rect x="45" y="23" width="620" height="124" fill="#102631"/>${shades}${[-100,0,100].map(d=>`<path d="M${x(d)} 23V147" stroke="#778f84" stroke-opacity=".25"/><text x="${x(d)}" y="168" text-anchor="middle" font-size="11" fill="#bacbc2">${d===0?'D0':d+'일'}</text>`).join('')}${[min,(min+max)/2,max].map(v=>`<path d="M45 ${y(v)}H665" stroke="#8a9c8b" stroke-opacity=".23"/><text x="39" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#bacbc2">${v.toFixed(0)}°</text>`).join('')}<polyline points="${rows.map(r=>p(x(r.day),y(r.lambda))).join(' ')}" fill="none" stroke="#ecc789" stroke-width="2.5"/>${stationary.map(d=>`<path d="M${x(d)} 23V147" stroke="#e4dec4" stroke-dasharray="3 4" opacity=".55"/>`).join('')}`};
 }
 function draw(){
  if(destroyed)return;
  if(!graphModel)prepareGraph();
  const {earth,mars}=Astro.positions(s.day,s.period),lambda=Astro.longitude(s.day,s.period),rate=Astro.rate(s.day,s.period);
  const cx=170,cy=122,scale=63,ex=cx+earth.x*scale,ey=cy-earth.y*scale,mx=cx+mars.x*scale,my=cy-mars.y*scale;
  els.orbit.innerHTML=`<svg viewBox="0 0 340 250" role="img" aria-label="태양을 같은 방향으로 도는 지구와 화성의 위치"><circle cx="${cx}" cy="${cy}" r="${scale}" fill="none" stroke="#6595a3" stroke-width="1.3"/><circle cx="${cx}" cy="${cy}" r="${scale*Astro.RM}" fill="none" stroke="#bc876b" stroke-width="1.3"/><path d="M${ex} ${ey}L${mx} ${my}" stroke="#eee0b4" stroke-width="2" stroke-dasharray="5 4"/><path d="M${cx+scale} ${cy-13}l-3 -8 8 1M${cx+scale*Astro.RM} ${cy-13}l-3 -8 8 1" fill="none" stroke="#c2cbb6" stroke-width="1.5"/>${dot(cx,cy,14,'#ebbe6a','태양')}${dot(ex,ey,7,'#7eb8d2','지구')}${dot(mx,my,8,'#df9872','화성')}<text x="170" y="239" text-anchor="middle" font-size="11" fill="#b5c9c2">지구에서 화성으로 향하는 선 = 관측 시선</text></svg>`;
  const stars=[[26,42],[58,65],[111,37],[146,70],[188,44],[234,64],[277,31],[314,64],[41,102],[304,108]],sx=45+(lambda-graphModel.min)/(graphModel.max-graphModel.min)*250;
  els.sky.innerHTML=`<svg viewBox="0 0 340 250" role="img" aria-label="배경별에 대한 화성의 상대 황경 ${lambda.toFixed(2)}도, ${motionName(rate)}"><rect x="12" y="21" width="316" height="154" rx="5" fill="#0e212c"/>${stars.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.5" fill="#d9e4d6"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8" stroke="#d9e4d6" stroke-opacity=".5" stroke-width=".6"/>`).join('')}<path d="M35 129H305" stroke="#8a9c9d" stroke-dasharray="4 5" stroke-opacity=".6"/><text x="24" y="159" font-size="10" fill="#b1c7c8">서쪽 · 황경 감소</text><text x="316" y="159" text-anchor="end" font-size="10" fill="#b1c7c8">황경 증가 · 동쪽</text>${dot(clamp(sx,42,300),115,9,'#df9872','화성')}<path d="M${clamp(sx,42,300)} 85h${rate<0?-25:25}" stroke="#efcf91" stroke-width="2"/><path d="M${clamp(sx,42,300)+(rate<0?-25:25)} 85l${rate<0?7:-7} -4v8Z" fill="#efcf91"/><text x="170" y="204" text-anchor="middle" font-size="15" fill="#f4d49e">${motionName(rate)}</text><text x="170" y="228" text-anchor="middle" font-size="11" fill="#b5c9c2">공전 방향은 그대로, 보이는 위치가 달라져요.</text></svg>`;
  // The displayed longitude is continuous over this bounded opposition interval.
  const x=graphModel.x(s.day),y=graphModel.y(lambda);
  els.graph.innerHTML=`<svg viewBox="0 0 700 182" role="img" aria-label="상대 황경 변화 그래프. 연한 황금색 구간은 역행입니다.">${graphModel.base}<path d="M${x} 18V147" stroke="#b5ded9" stroke-dasharray="4 3"/><circle cx="${x}" cy="${y}" r="4.3" fill="#b5ded9" stroke="#102631" stroke-width="1.5"/>${s.records.filter(r=>r.period===s.period).map(r=>`<circle cx="${graphModel.x(r.day)}" cy="${graphModel.y(r.lambda)}" r="3.2" fill="#f3e7c8"/>`).join('')}</svg>`;
  els.phase.textContent=motionName(rate);els.phase.dataset.phase=Math.abs(rate)<.005?'still':rate<0?'retro':'direct';
  els.longitude.textContent=signed(lambda,2)+'°';els.rate.textContent=signed(rate,3)+'°/일';
  els.label.textContent=dayText(s.day);els.slider.value=String(s.day);els.slider.setAttribute('aria-valuetext',dayText(s.day));els.period.value=String(s.period);
  els.periodNote.textContent=s.period===Astro.EARTH?'실제 주기: 지구 약 365일, 화성 약 687일. 지구가 안쪽 궤도에서 더 빠르게 공전합니다.':s.period===Astro.MARS?'비교용 가상 조건입니다. 상대 배치는 유지되지만 배경별에 대한 방향은 변합니다. 같은 주기에서는 이 모형의 역행이 사라집니다.':'비교용 가상 조건입니다. 화성의 주기는 유지하고 지구의 공전만 늦춰 시선 방향의 변화를 비교합니다.';
 }
 function drawRecords(){
  els.count.textContent=s.records.length+' / 7';els.records.replaceChildren();
  if(!s.records.length){const el=document.createElement('p');el.textContent='날짜를 고른 뒤 ‘관측 기록’을 눌러 비교할 장면을 남기세요.';els.records.append(el);return;}
  for(const row of s.records){const el=document.createElement('span');el.textContent=dayText(row.day)+' · '+signed(row.lambda,2)+'° · '+motionName(row.rate)+(row.period===Astro.EARTH?'':' · 가상 조건');els.records.append(el);}
 }
 function setDay(value){s.day=clamp(value,MIN_DAY,MAX_DAY);if(onDayChange)onDayChange(s.day);draw();}
 function setPlaying(value){
  playing=Boolean(value)&&!document.hidden&&!destroyed;
  els.play.textContent=playing?'Ⅱ 일시정지':'▶ 재생';els.play.setAttribute('aria-pressed',String(playing));
  if(!playing){cancelAnimationFrame(raf);raf=0;last=0;return;}
  if(s.day>=MAX_DAY)setDay(MIN_DAY);
  last=0;lastDraw=0;raf=requestAnimationFrame(tick);
 }
 function tick(now){
  raf=0;if(!playing||destroyed)return;
  if(document.hidden||!root.isConnected||root.closest('[hidden]')){setPlaying(false);return;}
  const dt=last?Math.min(.15,(now-last)/1000):0;last=now;s.day=clamp(s.day+dt*12,MIN_DAY,MAX_DAY);
  if(now-lastDraw>=(reduced?.matches?100:33)||s.day>=MAX_DAY){lastDraw=now;if(onDayChange)onDayChange(s.day);draw();}
  if(s.day>=MAX_DAY){setPlaying(false);els.status.textContent='재생이 끝났습니다. 날짜를 되돌려 다른 구간을 비교하세요.';return;}
  raf=requestAnimationFrame(tick);
 }
 els.slider.addEventListener('input',()=>{setPlaying(false);setDay(Number(els.slider.value));});
 els.play.addEventListener('click',()=>setPlaying(!playing));
 q('[data-mars-zero]').addEventListener('click',()=>{setPlaying(false);setDay(0);});
 root.querySelectorAll('[data-mars-preset]').forEach(btn=>btn.addEventListener('click',()=>{setPlaying(false);setDay(Number(btn.dataset.marsPreset));}));
 els.period.addEventListener('change',()=>{setPlaying(false);s.period=Number(els.period.value);graphModel=null;draw();});
 q('[data-mars-record]').addEventListener('click',()=>{
  setPlaying(false);
  if(s.records.some(r=>r.period===s.period&&Math.abs(r.day-s.day)<.1)){els.status.textContent='이 날짜와 공전 조건은 이미 기록했습니다.';return;}
  if(s.records.length===7)s.records.shift();
  s.records.push({day:s.day,period:s.period,lambda:Astro.longitude(s.day,s.period),rate:Astro.rate(s.day,s.period)});
  drawRecords();draw();els.status.textContent=dayText(s.day)+'의 모형 관측값을 남겼습니다. 최근 일곱 기록을 이 실험 동안 비교할 수 있습니다.';
 });
 const onHidden=()=>{if(document.hidden)setPlaying(false);};
 document.addEventListener('visibilitychange',onHidden);
 const observer=new MutationObserver(()=>{if(root.closest('[hidden]'))setPlaying(false);});
 const modal=root.closest('#missionModal');if(modal)observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
 mounted={root,session:s,pause:()=>setPlaying(false),getState:()=>({day:s.day,period:s.period,playing,records:s.records.map(r=>({...r})),longitude:Astro.longitude(s.day,s.period),rate:Astro.rate(s.day,s.period)}),destroy:()=>{if(destroyed)return;setPlaying(false);destroyed=true;observer.disconnect();document.removeEventListener('visibilitychange',onHidden);}};
 drawRecords();draw();if(onDayChange)onDayChange(s.day);
 return mounted;
}
function unmount(){if(mounted){mounted.destroy();mounted=null;}}
global.StarlightMars=Object.freeze({Astro,markup,mount,unmount,pause:()=>mounted?.pause(),getState:()=>mounted?.getState()||null});
})(window);
