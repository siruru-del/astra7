/* 별빛 사진관 V6.3 — 살아나는 관측 기록과 공간의 작은 움직임.
 * 본편 탐색용. 학습 판정, 저장 데이터, 경기장, 음원에는 접근하지 않습니다.
 * 모든 그림은 960×540 논리 좌표, 바닥보다 앞선 배경 레이어에 그립니다.
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const RECORDS = Object.freeze({
    e1: { room: 'lobby', kind: 'ledger', x: 391, y: 199, w: 47, h: 20, title: '돌아온 장부의 잉크' },
    e2: { room: 'darkroom', kind: 'negative', x: 570, y: 186, w: 37, h: 17, title: '트레이에서 현상된 그림자 사진' },
    e3: { room: 'roof', kind: 'moon', x: 401, y: 238, w: 29, h: 24, title: '망원경 옆에 돌아온 월식 사진' },
    e4: { room: 'darkroom', kind: 'eclipse', x: 412, y: 188, w: 39, h: 18, title: '확대기 아래의 일식 인화지' },
    p1: { room: 'lobby', kind: 'film', x: 207, y: 233, w: 34, h: 24, skew: .42, tilt: -.10, title: '날짜별로 이어진 행성 필름' },
    p2: { room: 'archive', kind: 'orbit', x: 362, y: 276, w: 27, h: 23, title: '다시 맞물린 공전 모형의 고리' },
    p3: { room: 'roof', kind: 'chart', x: 843, y: 260, w: 64, h: 26, skew: .38, tilt: -.018, title: '관측대에 돌아온 별지도' },
    p4: { room: 'archive', kind: 'layout', x: 583, y: 239, w: 40, h: 21, skew: .24, tilt: -.035, title: '되살아난 천체 배치 기록' },
    p5: { room: 'archive', kind: 'atlas', x: 480, y: 239, w: 62, h: 29, title: '도감에 다시 나타난 설명과 그림' }
  });
  const IDS = Object.freeze(Object.keys(RECORDS));
  const SECRET_CORES = Object.freeze([[172,255,29],[829,255,28]]);
  const ROOM_IDS = Object.freeze({
    lobby: ['e1', 'p1'], darkroom: ['e2', 'e4'], roof: ['e3', 'p3'], archive: ['p2', 'p4', 'p5']
  });
  const AMBIENT_NAMES = Object.freeze({
    lobby: ['curtain', 'lamps', 'dust', 'hanging-stars'],
    darkroom: ['drying-prints', 'developer-ripples', 'safe-lights'],
    roof: ['cloud-drift', 'star-twinkle', 'rare-meteor', 'chart-trace'],
    archive: ['orrery-orbits', 'turning-page', 'lamps', 'dust'],
    secret: ['core-orbits', 'monolith-current', 'suspended-star'],
    corridor: ['distant-stars']
  });
  const runtime = {
    room: 'lobby', now: null, time: 0, paused: true, reducedMotion: false,
    playable: false, done: Object.create(null), stage: 'forgotten', ratio: 0,
    queue: [], active: null, lastCompleted: null, originPhase: 'dormant', originProgress: 0
  };
  const tiles = Object.create(null);
  const mutedTiles = Object.create(null);
  const particles = [];
  let seed = 58129;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i = 0; i < 32; i++) particles.push({ x: random(), y: random(), phase: random() * TAU, rate: .18 + random() * .32 });

  function canvas(width, height) {
    const el = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
    el.width = width; el.height = height; return el;
  }
  function line(c, x1, y1, x2, y2, color, width = 1) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function circle(c, x, y, r, fill, stroke) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function paper(c, x, y, w, h, dark = false) {
    c.fillStyle = '#342e2b'; c.fillRect(x + 1, y + 1, w, h);
    c.fillStyle = dark ? '#3b3b42' : '#c6ad78'; c.fillRect(x, y, w, h);
    c.fillStyle = dark ? '#252c3c' : '#e0c99b'; c.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  function inkLines(c, x, y, widths, color = '#655244') {
    c.fillStyle = color; for (let i = 0; i < widths.length; i++) c.fillRect(x, y + i * 3, widths[i], 1);
  }
  function star(c, x, y, r, color = '#ddc78e') {
    c.fillStyle = color; c.fillRect(Math.round(x - r), Math.round(y), r * 2 + 1, 1); c.fillRect(Math.round(x), Math.round(y - r), 1, r * 2 + 1);
  }

  // Small physical records are rendered once, not rebuilt on every frame.
  // These are in-world papers/ink/gear faces, rather than quest/UI icons.
  function recordTile(kind, muted) {
    const out = canvas(80, 44), c = out.getContext('2d');
    c.imageSmoothingEnabled = false;
    const gold = muted ? '#8d8779' : '#d9bd72', ink = muted ? '#8e8b83' : '#5b4b40';
    if (kind === 'ledger' || kind === 'atlas') {
      c.fillStyle = '#624435'; c.beginPath(); c.moveTo(2, 8); c.lineTo(37, 3); c.lineTo(41, 4); c.lineTo(76, 8); c.lineTo(79, 37); c.lineTo(42, 34); c.lineTo(37, 36); c.lineTo(0, 39); c.closePath(); c.fill();
      c.fillStyle = muted ? '#a69d88' : '#d8c296'; c.beginPath(); c.moveTo(4, 7); c.lineTo(37, 4); c.lineTo(38, 33); c.lineTo(3, 36); c.closePath(); c.fill();
      c.fillStyle = muted ? '#aaa18d' : '#e2cea2'; c.beginPath(); c.moveTo(41, 5); c.lineTo(74, 8); c.lineTo(76, 34); c.lineTo(42, 32); c.closePath(); c.fill();
      line(c, 39, 6, 40, 34, '#806948');
      if (!muted) {
        if (kind === 'ledger') {
          inkLines(c, 9, 12, [24, 19, 23, 20, 25, 16], ink);
          line(c, 46, 13, 69, 13, '#90734e'); inkLines(c, 46, 17, [20, 23, 14], ink);
          circle(c, 62, 28, 4, '#b86b47'); star(c, 62, 28, 2, '#e3bd78');
        } else {
          c.strokeStyle = '#87694b'; c.lineWidth = 1; c.beginPath(); c.ellipse(21, 20, 11, 8, .1, 0, TAU); c.stroke();
          circle(c, 21, 20, 3, '#cfa24e'); circle(c, 29, 16, 2, '#798c93'); circle(c, 12, 23, 2, '#a46450');
          inkLines(c, 8, 31, [24, 17], ink); inkLines(c, 47, 11, [20, 17], ink);
          for (let j = 0; j < 4; j++) { circle(c, 49 + j * 7, 24, 2 + (j % 2), ['#b99a61', '#bd784c', '#8e9d9f', '#a65c4d'][j]); }
          inkLines(c, 47, 31, [22], ink);
        }
      }
    } else if (kind === 'film') {
      paper(c, 2, 10, 76, 27, true);
      c.fillStyle = muted ? '#6e6b63' : '#b99b63';
      for (let j = 0; j < 9; j++) { c.fillRect(5 + j * 8, 11, 3, 2); c.fillRect(5 + j * 8, 34, 3, 2); }
      for (let j = 0; j < 4; j++) {
        c.fillStyle = muted ? '#424751' : '#263344'; c.fillRect(6 + j * 18, 15, 15, 16);
        if (!muted) { star(c, 10 + j * 18, 19, 1, '#8b9eb3'); circle(c, 13 + j * 18, 24 - [0, 3, 2, 5][j], 2, '#d98c64'); c.fillStyle = '#c2ae86'; c.fillRect(8 + j * 18, 29, 10, 1); }
      }
    } else if (kind === 'negative' || kind === 'eclipse') {
      paper(c, 6, 8, 68, 29, true); c.fillStyle = muted ? '#363945' : '#2a3449'; c.fillRect(10, 11, 60, 22);
      if (!muted) {
        if (kind === 'negative') {
          circle(c, 27, 22, 9, '#ba9b6b'); circle(c, 31, 22, 7, '#303444');
          c.fillStyle = '#6f6780'; c.beginPath(); c.moveTo(43, 16); c.lineTo(64, 11); c.lineTo(64, 31); c.lineTo(43, 28); c.closePath(); c.fill();
          c.fillStyle = '#383847'; c.beginPath(); c.moveTo(43, 18); c.lineTo(64, 19); c.lineTo(64, 24); c.lineTo(43, 26); c.closePath(); c.fill();
        } else {
          circle(c, 27, 22, 9, '#d4b875'); circle(c, 27, 22, 7, '#263047');
          circle(c, 54, 22, 9, '#d7bf82'); circle(c, 55, 22, 9, '#263047');
          star(c, 15, 15, 1, '#adb8c4');
        }
      }
    } else if (kind === 'moon') {
      paper(c, 12, 2, 54, 39); c.fillStyle = muted ? '#505360' : '#25334a'; c.fillRect(16, 5, 46, 29);
      if (!muted) { circle(c, 39, 19, 11, '#c08461'); circle(c, 35, 15, 2, '#aa6956'); circle(c, 43, 22, 3, '#ac6d59'); circle(c, 35, 24, 1.5, '#daaa7f'); star(c, 22, 11, 1, '#bac5cc'); star(c, 55, 26, 1, '#bac5cc'); inkLines(c, 22, 36, [32], '#947b54'); }
    } else if (kind === 'orbit') {
      circle(c, 40, 22, 20, '#513e2b', '#9f8049'); circle(c, 40, 22, 17, muted ? '#6c6555' : '#c1a364', '#dcc68e');
      for (let j = 0; j < 12; j++) { const a = j * TAU / 12; line(c, 40 + Math.cos(a) * 15, 22 + Math.sin(a) * 15, 40 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, '#78603e'); }
      if (!muted) { c.strokeStyle = '#5b4b36'; c.beginPath(); c.ellipse(40, 22, 13, 8, -.25, 0, TAU); c.stroke(); circle(c, 40, 22, 3, '#e6d08b'); circle(c, 50, 16, 2, '#697f83'); circle(c, 29, 26, 2, '#ab6849'); }
    } else if (kind === 'chart') {
      paper(c, 2, 8, 76, 30, true); c.fillStyle = muted ? '#434a56' : '#293c59'; c.fillRect(5, 10, 70, 25);
      if (!muted) {
        c.strokeStyle = '#b2a674'; c.lineWidth = .7; c.beginPath(); c.ellipse(40, 22, 27, 10, 0, 0, TAU); c.stroke();
        const pts = [[18,21],[29,15],[43,19],[50,29],[65,22]];
        for (let j = 0; j < pts.length - 1; j++) line(c, ...pts[j], ...pts[j+1], '#8ca9b4');
        pts.forEach(p => star(c, p[0], p[1], 1, '#eee0ab'));
        line(c, 8, 31, 72, 31, '#8f916f', .6);
      }
    } else if (kind === 'layout') {
      paper(c, 3, 7, 73, 31); c.fillStyle = muted ? '#b2a68b' : '#dcc797'; c.fillRect(7, 10, 65, 25);
      if (!muted) {
        line(c, 14, 21, 66, 21, '#8f7655'); circle(c, 40, 21, 7, '#bb934d');
        circle(c, 19, 21, 3, '#71898e'); circle(c, 61, 21, 3, '#ad6e51');
        c.strokeStyle = '#9a835d'; c.beginPath(); c.ellipse(40, 21, 16, 10, 0, 0, TAU); c.stroke();
        inkLines(c, 13, 32, [17], '#89724d'); inkLines(c, 51, 32, [15], '#89724d');
      }
    }
    return out;
  }
  IDS.forEach(id => { tiles[id] = recordTile(RECORDS[id].kind, false); mutedTiles[id] = recordTile(RECORDS[id].kind, true); });

  const glow = canvas(96, 96);
  {
    const c = glow.getContext('2d'), g = c.createRadialGradient(48,48,1,48,48,46);
    g.addColorStop(0,'rgba(255,222,154,.65)'); g.addColorStop(.3,'rgba(251,201,122,.17)'); g.addColorStop(1,'rgba(248,186,103,0)');
    c.fillStyle=g;c.fillRect(0,0,96,96);
  }
  const cloud = canvas(1100, 120);
  {
    const c=cloud.getContext('2d');
    for(let i=0;i<11;i++){const x=i*110,y=46+(i%3)*10,g=c.createRadialGradient(x,y,5,x,y,100);g.addColorStop(0,'rgba(153,166,196,.28)');g.addColorStop(1,'rgba(153,166,196,0)');c.fillStyle=g;c.fillRect(x-100,y-100,200,200);}
  }

  function hidden() { return typeof document !== 'undefined' && document.hidden; }
  function notifyRecovery(id) {
    if (!RECORDS[id] || runtime.active?.id === id || runtime.queue.includes(id)) return;
    runtime.queue.push(id);
  }
  function reset() {
    runtime.now = null; runtime.time = 0; runtime.queue.length = 0;
    runtime.active = null; runtime.lastCompleted = null; runtime.originPhase = 'dormant'; runtime.originProgress = 0;
  }
  function update(options = {}) {
    const now = Number.isFinite(options.now) ? options.now : performance.now();
    const elapsed = runtime.now === null ? 0 : clamp(now - runtime.now, 0, 80); runtime.now = now;
    runtime.room = options.room || runtime.room; runtime.done = options.done || runtime.done;
    runtime.stage = options.stage || runtime.stage; runtime.ratio = clamp(Number.isFinite(options.ratio) ? options.ratio : IDS.filter(id => runtime.done[id]).length / 9);
    runtime.reducedMotion = !!options.reducedMotion; runtime.paused = !!options.paused || hidden(); runtime.playable = !!options.playable;
    runtime.originPhase = options.originPhase || 'dormant'; runtime.originProgress = clamp(options.originProgress || 0);
    const delta = runtime.paused ? 0 : elapsed;
    if (!runtime.reducedMotion) runtime.time += delta;
    if (!runtime.active && runtime.playable && !runtime.paused) {
      const next = runtime.queue.findIndex(id => RECORDS[id].room === runtime.room);
      if (next >= 0) runtime.active = { id: runtime.queue.splice(next,1)[0], elapsed: 0, duration: 2400 };
    }
    if (runtime.active && !runtime.paused) {
      runtime.active.elapsed = runtime.reducedMotion ? runtime.active.duration : Math.min(runtime.active.duration, runtime.active.elapsed + delta);
      if (runtime.active.elapsed >= runtime.active.duration) {
        runtime.lastCompleted = { id: runtime.active.id, at: runtime.time, static: runtime.reducedMotion };
        runtime.active = null;
      }
    }
  }
  function mapImage(assets) {
    if (!assets) return null;
    const base = 'map_' + runtime.room;
    if (runtime.room === 'lobby' && runtime.stage === 'restored') return assets.map_lobby_unlocked || assets.map_lobby;
    return assets[base + (runtime.stage === 'forgotten' || runtime.stage === 'recalled' ? '_' + runtime.stage : '')] || assets[base];
  }
  function sampleSway(c, im, x, y, w, h, amplitude, phase) {
    if (!im?.naturalWidth || runtime.reducedMotion) return;
    const sx = im.naturalWidth / 960, sy = im.naturalHeight / 540;
    c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
    for(let yy=0;yy<h;yy+=8){const dh=Math.min(8,h-yy),shift=Math.sin(phase+yy/h*.9)*amplitude*(yy/h);c.drawImage(im,x*sx,(y+yy)*sy,w*sx,dh*sy,x+shift,y+yy,w,dh);}
    c.restore();
  }
  function lamp(c, x, y, radius, phase) {
    c.save(); c.globalAlpha=.08+(.5+.5*Math.sin(runtime.time/720+phase))*.035;
    c.drawImage(glow,x-radius,y-radius,radius*2,radius*2); c.restore();
  }
  function dust(c, x, y, w, h, count, tone) {
    c.fillStyle=tone;
    for(let i=0;i<count;i++){const p=particles[i],t=runtime.time/1000;const xx=x+p.x*w+Math.sin(t*.18+p.phase)*7,yy=y+((p.y*h-t*(1.5+p.rate))%h+h)%h;c.globalAlpha=.12+(.5+.5*Math.sin(t*.31+p.phase))*.13;c.fillRect(Math.round(xx),Math.round(yy),1,1);}
    c.globalAlpha=1;
  }
  function starField(c, room) {
    const t=runtime.time/1000;
    if(room==='corridor'){
      for(let i=0;i<14;i++){const p=particles[i],left=i%2===0,x=left?35+p.x*275:650+p.x*270,y=35+p.y*300;c.globalAlpha=.08+(.5+.5*Math.sin(t*.08+p.phase))*.15;star(c,x+Math.sin(t*.025+p.phase)*1.4,y,1,'#c8cceb');}
    }else{
      for(let i=0;i<26;i++){const p=particles[i],x=270+p.x*655,y=18+p.y*119;c.globalAlpha=(.14+runtime.ratio*.2)+(.5+.5*Math.sin(t*p.rate*.7+p.phase))*.24;star(c,x,y,i%8===0?1:0,'#d3e2ef');}
    }
    c.globalAlpha=1;
  }
  function drawAmbient(c, assets) {
    const t=runtime.time/1000,room=runtime.room,im=mapImage(assets);
    c.save(); c.imageSmoothingEnabled=false;
    if(room==='lobby'){
      sampleSway(c,im,337,18,51,164,.95, t*.55);sampleSway(c,im,576,18,52,166,.8,t*.55+.8);
      lamp(c,480,176,55,0);lamp(c,50,360,30,2);
      dust(c,340,60,290,290,8,'#e8d7b4');
      for(let i=0;i<5;i++){c.globalAlpha=.09+(.5+.5*Math.sin(t*.8+i))*.13;star(c,383+i*46,35+(i%2)*9,2,'#edcf8e');}c.globalAlpha=1;
    }else if(room==='darkroom'){
      sampleSway(c,im,516,55,52,67,1.1,t*.6);sampleSway(c,im,576,59,51,63,.8,t*.6+.8);
      lamp(c,458,72,42,1);lamp(c,795,77,38,2);
      c.save();c.beginPath();c.rect(552,181,39,9);c.clip();c.strokeStyle=runtime.done.e2?'#e2a18d':'#a0777b';c.lineWidth=.6;
      for(let i=0;i<3;i++){const r=3+((t*3+i*4)%13);c.globalAlpha=.26*(1-r/18);c.beginPath();c.ellipse(570,186,r,r*.23,0,0,TAU);c.stroke();}c.restore();
    }else if(room==='roof'){
      c.save();c.beginPath();c.moveTo(250,0);c.lineTo(960,0);c.lineTo(960,134);c.lineTo(350,155);c.lineTo(250,125);c.closePath();c.clip();c.globalAlpha=.16-runtime.ratio*.06;c.drawImage(cloud,200+Math.sin(t*.035)*80,22,880,96);c.restore();
      starField(c,room);
      const phase=(t+7)%31;
      if(!runtime.reducedMotion&&phase<1.2&&runtime.ratio>.1){const q=phase/1.2,headX=770-q*145,headY=35+q*48;c.save();c.globalAlpha=Math.sin(q*Math.PI)*.40;line(c,headX,headY,headX+28,headY-9,'#c7d7e5',.7);c.restore();}
      if(runtime.done.p3){c.globalAlpha=.22;const px=832+Math.sin(t*.18)*14,py=260+Math.cos(t*.18)*3;star(c,px,py,1,'#f6dfad');c.globalAlpha=1;}
      lamp(c,329,168,35,.3);
    }else if(room==='archive'){
      lamp(c,229,39,45,1);lamp(c,727,39,45,2);dust(c,240,70,480,220,6,'#ddcdab');
      const running=!!runtime.done.p2,a=running?t*.23:.7;
      c.save();c.globalAlpha=running?.55:.16;c.strokeStyle='#c6af75';c.lineWidth=.65;c.beginPath();c.ellipse(480,113,62,15,-.06,0,TAU);c.stroke();
      circle(c,480+Math.cos(a)*62,113+Math.sin(a)*15,2.4,'#94b6c5');circle(c,480+Math.cos(a+3)*43,113+Math.sin(a+3)*10,1.8,'#cead6d');c.restore();
      if(runtime.done.p5){const fold=1+Math.sin(t*.7)*.8;c.globalAlpha=.52;line(c,505,244,512,241-fold,'#f0dbac',.7);c.globalAlpha=1;}
    }else if(room==='secret'){
      c.save();c.strokeStyle='#c4c8ef';c.lineWidth=.6;
      for(const q of SECRET_CORES){const a=t*.15+(q[0]>500?1.2:0);c.globalAlpha=.27;c.beginPath();c.arc(q[0],q[1],q[2],a,a+Math.PI*.7);c.stroke();c.globalAlpha=.7;circle(c,q[0]+Math.cos(a)*q[2],q[1]+Math.sin(a)*q[2],1.3,'#e3e5fc');}
      const y=108+((t*6)%49);c.globalAlpha=.15;line(c,420,y,546,y,'#bcb7eb',.8);c.restore();
      c.globalAlpha=.18;star(c,482,65,2,'#dedcf9');c.globalAlpha=1;
    }else if(room==='corridor')starField(c,room);
    c.restore();
  }
  function recordProgress(id) {
    if (!runtime.done[id]) return 0;
    if (runtime.queue.includes(id)) return 0;
    if (runtime.active?.id === id) return runtime.active.elapsed / runtime.active.duration;
    return 1;
  }
  function drawRecord(c, id) {
    const r=RECORDS[id],p=recordProgress(id),tile=tiles[id],x=-r.w/2,y=-r.h/2;
    c.save();c.translate(r.x,r.y);c.transform(1,r.tilt||0,r.skew||0,1,0,0);
    if(p<=0){
      // The original equipment remains usable, but its new record is blank.
      if(!runtime.done[id]||runtime.queue.includes(id)){c.save();c.globalAlpha=.30;c.drawImage(mutedTiles[id],x,y,r.w,r.h);c.restore();}
      c.restore();return;
    }
    if(p>=.82||runtime.reducedMotion){c.drawImage(tile,x,y,r.w,r.h);}
    else{
      // Nine solid paper/film fragments return to the physical device surface.
      // Every tile reaches the same final geometry; no floating reward icon remains.
      const cw=tile.width/3,ch=tile.height/3;
      for(let j=0;j<9;j++){
        const col=j%3,row=Math.floor(j/3),local=clamp((p*1.6-j*.035)/.98),q=smooth(local),a=j*2.399963+id.charCodeAt(0),distance=(1-q)*(26+j%3*8);
        const dx=x+col*r.w/3+Math.cos(a)*distance,dy=y+row*r.h/3+Math.sin(a)*distance-12*(1-q);
        c.save();c.globalAlpha=.12+q*.88;c.translate(dx+r.w/6,dy+r.h/6);c.rotate((1-q)*(j%2?-.22:.22));c.drawImage(tile,col*cw,row*ch,cw,ch,-r.w/6,-r.h/6,r.w/3+.25,r.h/3+.25);c.restore();
      }
    }
    if(runtime.active?.id===id&&!runtime.reducedMotion){
      const q=clamp((p-.55)/.45),radius=(1-q)*18+r.w*.4;
      c.save();c.globalAlpha=Math.sin(p*Math.PI)*.32;c.strokeStyle='#e3c996';c.lineWidth=.7;c.beginPath();c.ellipse(0,0,radius,r.h*.65+q*3,0,0,TAU);c.stroke();c.restore();
    }
    c.restore();
  }
  function drawRecovery(c) {
    const ids=ROOM_IDS[runtime.room];if(!ids)return;
    c.save();c.imageSmoothingEnabled=false;
    for(let i=0;i<ids.length;i++)drawRecord(c,ids[i]);
    c.restore();
  }
  function drawOrigin(c) {
    const phase=runtime.originPhase;if(runtime.room!=='secret'||phase==='dormant'||phase==='complete')return;
    const t=runtime.time/1000,p=runtime.originProgress;
    const active=phase==='fragments'||phase==='fracture'||phase==='simulation'||phase==='reconnect'||phase==='choice';if(!active)return;
    c.save();c.imageSmoothingEnabled=false;
    const broken=phase==='fracture',connected=phase==='reconnect'||phase==='choice';
    const intensity=phase==='choice'?.34:.55;
    c.globalAlpha=intensity;c.strokeStyle='#a9b2df';c.lineWidth=.8;
    if(connected||phase==='simulation'){
      c.beginPath();c.ellipse(480,144,91,59,0,0,TAU);c.stroke();
      for(let i=0;i<9;i++){const a=-Math.PI/2+i*TAU/9;line(c,480,144,480+Math.cos(a)*91,144+Math.sin(a)*59,'#a7b4dc',.6);}
    }
    for(let i=0;i<9;i++){
      const a=-Math.PI/2+i*TAU/9,drift=runtime.reducedMotion?0:Math.sin(t*.5+i)*3;
      const radius=connected?91:broken?105+drift:87+Math.sin(i*2.1)*17;
      const x=480+Math.cos(a)*radius,y=144+Math.sin(a)*(connected?59:58)+drift;
      c.save();c.translate(x,y);c.rotate(connected?0:Math.sin(i*1.7)*.2);c.globalAlpha=intensity*(.8+.2*Math.sin(t*.35+i));
      c.fillStyle='#17202f';c.fillRect(-7,-9,14,18);c.strokeStyle=broken?'#927dbe':'#d1c5ec';c.strokeRect(-7,-9,14,18);
      c.fillStyle=connected?'#e0d3a2':'#b4b9df';c.fillRect(-3,-5,6,1);c.fillRect(-4,0,8,1);c.fillRect(-3,4,6,1);c.restore();
    }
    if(phase==='reconnect'){
      c.globalAlpha=.3+p*.35;line(c,480,144,172,255,'#a8c6eb',1);line(c,480,144,829,255,'#c0a8ec',1);
    }
    c.restore();
  }
  function draw(c, layer = 'back', assets) {
    if(!c)return;
    if(layer==='back'){drawAmbient(c,assets);drawRecovery(c);drawOrigin(c);}
    // Physical fragments deliberately stay behind characters; no foreground HUD.
  }
  function getState() {
    const active=runtime.active,ids=ROOM_IDS[runtime.room]||[];
    return {
      room:runtime.room,time:runtime.time,paused:runtime.paused,reducedMotion:runtime.reducedMotion,playable:runtime.playable,
      stage:runtime.stage,ratio:runtime.ratio,ambientEffects:[...(AMBIENT_NAMES[runtime.room]||[])],
      restoredIds:IDS.filter(id=>runtime.done[id]),visibleRestoredIds:ids.filter(id=>runtime.done[id]&&recordProgress(id)>=.82),
      records:ids.map(id=>({...RECORDS[id],id,completed:!!runtime.done[id],progress:recordProgress(id)})),
      recovery:{id:active?.id||runtime.queue[0]||null,phase:active?'assembling':runtime.queue.length?'queued':'idle',active:!!active,elapsed:active?.elapsed||0,duration:active?.duration||2400,progress:active?active.elapsed/active.duration:0,queuedIds:[...runtime.queue],lastCompleted:runtime.lastCompleted?{...runtime.lastCompleted}:null},
      origin:{phase:runtime.originPhase,progress:runtime.originProgress}
    };
  }
  global.STUDIO_EFFECTS=Object.freeze({update,notifyRecovery,reset,draw,getState});
})(window);
