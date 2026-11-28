/* V6.3.2 — the observation desk's narrative layer.
 * Presentation only: no answer checks, mission progression, saves, timers or game input.
 * The existing mission diagram, controls and inline Mars experiment remain owned by studio.js.
 */
(function (global) {
  'use strict';

  const NPCS = {
    manager: {
      name: '사진관 관리인 · 윤', short: '윤', ids: ['e1', 'p1'],
      memory: ['장부의 첫 줄을 쓰던 밤은 아직 흐릿해요.', '돌아온 날짜에서 익숙한 필름 봉투가 떠올라요.', '사진을 나란히 놓고 설명을 고쳐 쓰던 밤이 기억나요.'],
      retry: '조건과 설명을 다시 나란히 놓아 볼까요? 아직 빈 장부에 적을 수 있는 근거를 찾아봐요.',
      revisit: '보관해 둔 사진을 다시 펼쳤어요. 처음에 본 것과 같은 근거가 남아 있는지 살펴봐요.'
    },
    technician: {
      name: '암실 기술자 · 하린', short: '하린', ids: ['e2', 'e4'],
      memory: ['손에 익은 현상 도구가 무엇을 남겼는지 아직 흐릿해요.', '필름의 차이를 살피던 손길이 조금씩 익숙해져요.', '닮은 사진을 조건별로 나누어 말리던 순서가 기억나요.'],
      retry: '필름은 그대로 두어도 괜찮아요. 바꾼 조건과 남은 빛이 설명에 맞는지 다시 살펴봐요.',
      revisit: '복원한 필름을 다시 꺼냈어요. 같은 장면을 조건 하나씩 바꾸며 읽어 봐요.'
    },
    guide: {
      name: '천문부 안내자 · 서준', short: '서준', ids: ['e3', 'p3'],
      memory: ['난간에서 어떤 하늘을 기다렸는지는 아직 흐릿해.', '사진 속에서 함께 기다렸던 밤이 조금씩 떠올라.', '서로 다른 밤의 하늘을 같은 자리에서 기록했었지.'],
      retry: '아직 결론을 서두르지 말자. 지금 배치에서 실제로 보이는 모습을 다시 설명해 봐.',
      revisit: '되찾은 별지도를 다시 펼쳤어. 같은 자리에서 이번에는 무엇이 눈에 들어오는지 보자.'
    },
    archivist: {
      name: '기록 사서 · 민', short: '민', ids: ['p2', 'p4', 'p5'],
      memory: ['제 글씨는 남아 있지만 기록을 나누던 기준은 흐릿해요.', '흩어진 쪽에서 기록들을 비교하던 이유가 떠올라요.', '관측 근거와 고쳐 쓴 설명을 함께 보관했던 일이 기억나요.'],
      retry: '설명과 그림을 한 번 더 맞춰 봐요. 아직 확인하지 못한 칸은 비워 두어도 괜찮습니다.',
      revisit: '장부에 보관된 기록을 다시 펼쳤어요. 그때 남긴 근거를 지금의 설명과 비교해 봅시다.'
    }
  };

  const STORIES = {
    e1: {
      room: 'lobby', npc: 'manager', title: '찢어진 첫 음화 봉투', where: '접수대 · 첫 번째 음화', glyph: 'photos',
      pieces: ['접수', '사진 A', '사진 B', '조건'], memoryTitle: '접수 장부의 첫 줄',
      lines: {
        found: '두 음화에는 모두 ‘삭’이라고 적혀 있어요. 먼저 떠오르는 설명을 봉투 옆에 남겨 볼까요?',
        observe: '위에서 본 배치와 옆에서 본 배치를 함께 살펴봐요. 조건이 다른 두 사진을 나란히 놓아 주세요.',
        connect: '두 사진의 차이를 뒷받침하는 근거가 무엇인지 골라 봐요. 그 근거로 처음 설명도 고쳐 볼까요?'
      },
      remember: '첫 손님에게 두 음화를 나란히 보여 주던 밤이 기억나요. 같은 삭인데 왜 달랐는지 함께 살펴봤었죠.',
      returnedObject: '바래 있던 접수 장부에 읽을 수 없던 잉크가 다시 돌아옵니다.',
      principle: '삭이어도 달이 교점 부근을 지나지 않으면 일식이 일어나지 않는다.'
    },
    e2: {
      room: 'darkroom', npc: 'technician', title: '가장자리가 떨어진 그림자 필름', where: '암실 트레이 · 관측 위치', glyph: 'shadow',
      pieces: ['필름', '그림자', '관측자', '장소'], memoryTitle: '서로 다른 자리에서 받은 사진',
      lines: {
        found: '같은 일식을 찍은 필름인데 가려진 모습이 달라요. 어느 자리에서 보았는지 적힌 부분이 찢어졌네요.',
        observe: '관측자를 옮기며 가려지는 부분을 비교해 주세요. 자리가 달라지면 사진도 달라지나요?',
        connect: '사진과 함께 남길 그림자 영역의 이름을 골라 봐요. 관측한 위치가 그 설명과 맞는지도 확인해 주세요.'
      },
      remember: '이제 기억나요. 같은 날 받은 필름을 관측 장소별로 나누어 현상했었어요.',
      returnedObject: '트레이의 빈자리에 그림자의 경계가 기록된 필름이 돌아옵니다.',
      principle: '달의 본영 안에서는 개기일식이, 반영 안에서는 부분일식이 보인다.'
    },
    e3: {
      room: 'roof', npc: 'guide', title: '반으로 접힌 붉은 달 사진', where: '옥상 망원경 · 월식 기록', glyph: 'moon',
      pieces: ['옥상', '보름달', '궤도', '그림자'], memoryTitle: '함께 기다렸던 붉은 달',
      lines: {
        found: '이 붉은 달 사진은 난간에 기대어 찍었나 봐. 달을 기다렸던 조건부터 다시 찾아보자.',
        observe: '달의 위상과 궤도 위치를 바꿔 봐. 보름달이라는 사실만으로 그림자 안에 들어갈 수 있을까?',
        connect: '지금 달에 닿은 그림자가 어디에서 왔는지 설명해 보자. 배치와 설명이 함께 맞아야 사진을 이어 붙일 수 있어.'
      },
      remember: '여기서 함께 월식을 기다렸던 밤이 떠올라. 붉어진 달을 보고 난간에 모여 이야기를 나눴었지.',
      returnedObject: '망원경 옆에 붉은 달의 사진이 다시 돌아옵니다.',
      principle: '망일 때 달이 교점 부근에서 지구 그림자 안으로 들어가면 월식이 일어난다.'
    },
    e4: {
      room: 'darkroom', npc: 'technician', title: '빛의 테두리만 남은 인화지', where: '암실 확대기 · 겉보기 크기', glyph: 'ring',
      pieces: ['인화지', '태양', '달', '테두리'], memoryTitle: '나란히 말리던 두 인화지',
      lines: {
        found: '확대기 아래에 빛의 테두리만 남았어요. 두 인화지를 왜 따로 두었는지 찾아볼까요?',
        observe: '달과 태양의 겉보기 크기를 비교해 봐요. 중심이 겹쳐도 바깥쪽 빛이 남는지 살펴주세요.',
        connect: '남은 빛의 고리를 크기 차이로 설명해 봐요. 인화지 아래 빈 설명칸은 아직 기다리고 있어요.'
      },
      remember: '테두리가 남은 필름은 따로 말렸었어요. 두 일식의 사진을 나란히 걸던 현상 순서가 기억나요.',
      returnedObject: '확대기 아래 인화지에 두 일식의 모습이 다시 나타납니다.',
      principle: '중심이 정렬되어도 달의 겉보기 크기가 태양보다 작으면 금환일식이 나타난다.'
    },
    p1: {
      room: 'lobby', npc: 'manager', title: '날짜가 끊어진 연속 필름', where: '접수대 · 행성의 연속 사진', glyph: 'film',
      pieces: ['날짜', '화성', '목성', '토성'], memoryTitle: '연속 사진에 돌아온 날짜',
      lines: {
        found: '필름의 촬영 날짜가 중간에서 끊어졌어요. 화성·목성·토성을 같은 기준으로 살펴볼까요?',
        observe: '한 장의 자리보다 다음 사진으로 어떻게 바뀌었는지 보세요. 세 행성을 모두 바꾸어 살펴봐요.',
        connect: '별자리를 기준으로 어느 방향으로 움직였는지 읽어 봐요. 지금 고른 날짜 구간을 위치 변화와 맞춰 주세요.'
      },
      remember: '이제 촬영 날짜가 읽혀요. 사진을 한 장씩 모아 행성이 뒤로 걷는 듯했던 구간을 표시했었죠.',
      returnedObject: '끊겨 있던 행성 필름의 장면들이 촬영 날짜순으로 다시 이어집니다.',
      principle: '배경별을 기준으로 황경이 감소하는 구간을 겉보기 역행으로 읽는다.'
    },
    p2: {
      room: 'archive', npc: 'archivist', title: '시선이 끊어진 공전 스케치', where: '자료실 공전 모형 · 화성의 역행', glyph: 'orbit',
      pieces: ['장부', '지구', '화성', '시선'], memoryTitle: '두 그림을 함께 보관한 이유',
      lines: {
        found: '행성의 자리는 남아 있는데 지구에서 그은 시선이 찢겨 나갔어요. 두 그림을 함께 읽어 봅시다.',
        observe: '시간을 움직여 공전 모형과 지구에서 본 화성의 자리를 비교해요. 원하는 순간을 사진으로 남겨도 좋아요.',
        connect: '실제 공전 방향이 바뀌었나요? 지구에서 보이는 움직임과 모형의 차이를 설명에 담아 봐요.'
      },
      remember: '장부에 두 그림을 함께 넣었던 이유가 떠올랐어요. 지구에서 본 움직임과 실제 공전을 구분하려던 거예요.',
      returnedObject: '공전 모형의 고리와 천체 표시가 다시 맞물립니다.',
      principle: '지구가 화성을 추월하는 동안 시선 방향이 변해, 화성이 배경별에 대해 역행하는 것처럼 보일 수 있다.'
    },
    p3: {
      room: 'roof', npc: 'guide', title: '태양 곁이 찢어진 별지도', where: '옥상 관측대 · 두 내행성', glyph: 'inner',
      pieces: ['별지도', '태양', '수성', '금성'], memoryTitle: '별을 기다리던 자리의 눈금',
      lines: {
        found: '태양 표시 옆의 두 자리가 찢어졌어. 수성과 금성을 어디에서 찾았는지 다시 읽어 보자.',
        observe: '두 행성을 번갈아 움직여 태양에서 얼마나 떨어져 보이는지 비교해 봐. 한순간의 각도와 최대 이각은 구분해야 해.',
        connect: '가장 멀리 떨어져 보일 때의 이각을 비교해 보자. 어느 행성의 범위가 더 넓었는지 골라 줘.'
      },
      remember: '서로 다른 저녁에 이 난간에서 행성을 찾았던 자리가 기억나. 별지도의 눈금도 다시 읽을 수 있어.',
      returnedObject: '관측대의 빈자리에 별지도가 돌아오고, 희미했던 눈금이 다시 읽힙니다.',
      principle: '수성과 금성은 내행성으로 태양에서 크게 떨어져 보이지 않으며, 금성의 최대 이각이 더 크다.'
    },
    p4: {
      room: 'archive', npc: 'archivist', title: '이름표가 떨어진 네 배치도', where: '자료실 태양계 모형 · 위치 관계', glyph: 'alignment',
      pieces: ['태양', '지구', '행성', '배치'], memoryTitle: '네 장에 돌아온 이름표',
      lines: {
        found: '네 배치도의 이름표가 떨어졌어요. 태양·지구·행성이 놓인 순서부터 읽어 봅시다.',
        observe: '이번 그림에서 가운데 놓인 천체를 먼저 살펴봐요. 다른 배치로 바꾸어 차이를 비교해도 좋습니다.',
        connect: '이름을 고른 뒤 기록을 채택해 주세요. 네 장을 모두 확인하면 흩어진 한 페이지를 복원할 수 있어요.'
      },
      remember: '내합·외합·합·충의 이름표가 모두 돌아왔군요. 모형 옆에서 배치도를 설명하던 순서도 기억나요.',
      returnedObject: '태양계 모형 옆의 빈 기록지에 천체 배치와 설명이 다시 나타납니다.',
      principle: '내합·외합·합·충은 태양·지구·행성의 상대적 위치에 따라 구별한다.'
    },
    p5: {
      room: 'archive', npc: 'archivist', title: '분류 표지가 떨어진 관측 도감', where: '자료실 책상 · 다섯 행성', glyph: 'catalog',
      pieces: ['도감', '궤도', '분류', '설명'], memoryTitle: '함께 고쳐 쓰던 관측 도감',
      lines: {
        found: '다섯 행성의 사진은 있는데 분류 표지가 없어요. 어떤 기준으로 모아 두었는지 함께 찾아봐요.',
        observe: '지구의 궤도를 기준으로 사진을 나누면 어떤 행성들이 같은 쪽에 놓이나요?',
        connect: '행성을 나눈 기준과 겉보기 운동의 설명을 이어 봐요. 그림에서 확인한 사실을 근거로 골라 주세요.'
      },
      remember: '모두의 설명을 한 줄씩 고쳐 적던 도감이었어요. 관측 근거를 나누던 사람들이 기억납니다.',
      returnedObject: '관측 도감의 페이지에 행성 그림과 설명이 다시 나타납니다.',
      principle: '수성·금성은 내행성이고 화성·목성·토성은 외행성이다. 역행은 관측 위치 변화에 따른 겉보기 운동이다.'
    }
  };
  const FLOW = Object.freeze(['기록 발견', '관측 비교', '설명 연결', '기억 복원']);
  const PHASES = Object.freeze(['found', 'observe', 'connect', 'restored']);
  const MEMORY_STATES = Object.freeze(['forgotten', 'recalled', 'restored']);
  const DEFAULT_STAGES = {
    e1: ['예상하기', '사진 두 장 복원', '근거 찾기', '설명 완성'],
    e2: ['관측 지점 정하기', '그림자 판단'], e3: ['달의 배치 맞추기', '그림자의 주인'],
    e4: ['달의 크기 조절', '빛의 고리 해석'], p1: ['여러 행성 비교', '역행 구간 찾기'],
    p2: ['시간을 돌려 보기', '역행의 이유'], p3: ['두 내행성 관측', '최대 이각 선택'],
    p4: ['천체의 배치 보기', '배치 이름 붙이기'], p5: ['행성 분류', '움직임 설명']
  };
  let session = null;

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze); Object.freeze(value);
    }
    return value;
  }
  deepFreeze(NPCS); deepFreeze(STORIES); deepFreeze(DEFAULT_STAGES);
  function setText(element, text) { if (element && element.textContent !== text) element.textContent = text; }
  function knownDone(done) { return Object.fromEntries(Object.keys(STORIES).map(id => [id, !!done?.[id]])); }
  function npcMemory(id, done) {
    const npc = NPCS[id], count = npc.ids.filter(key => done[key]).length;
    const level = count === 0 ? 0 : count === npc.ids.length ? 2 : 1;
    return { id, name: npc.name, short: npc.short, memoryState: MEMORY_STATES[level], completed: count, total: npc.ids.length, text: npc.memory[level] };
  }
  function getStory(id) {
    const story = STORIES[id]; if (!story) return null;
    const npc = NPCS[story.npc];
    return {
      id, room: story.room, npcId: story.npc, npcName: npc.name, npcShort: npc.short,
      title: story.title, where: story.where, intro: story.lines.found,
      remember: story.remember, outro: story.remember, principle: story.principle,
      returnedObject: story.returnedObject, memoryTitle: story.memoryTitle,
      lines: { ...story.lines }, pieces: [...story.pieces]
    };
  }
  function glyph(kind) {
    // A small illustration of the found document. The actual scientific model stays in missionDiagram.
    const drawings = {
      photos: '<path d="M20 21H77V91H20zM101 21H158V91H101z"/><circle cx="49" cy="52" r="17"/><path d="M34 72H64M115 72H144"/><circle cx="130" cy="52" r="17"/><circle cx="135" cy="48" r="16" fill="currentColor" opacity=".28"/>',
      shadow: '<path d="M23 22H157V90H23zM90 22V90"/><circle cx="56" cy="54" r="20"/><path d="M56 34a20 20 0 0 0 0 40z" fill="currentColor" opacity=".3"/><circle cx="123" cy="54" r="20"/><path d="M122 34a20 20 0 0 1 0 40" stroke-width="8"/><path d="M39 82H72M105 82H139"/>',
      moon: '<circle cx="91" cy="53" r="30" fill="currentColor" opacity=".17"/><circle cx="91" cy="53" r="30"/><circle cx="81" cy="44" r="7" opacity=".4"/><circle cx="104" cy="63" r="5" opacity=".4"/><path d="M29 33h8m-4-4v8M143 24h8m-4-4v8M134 84h8m-4-4v8M51 94H130"/>',
      ring: '<circle cx="90" cy="52" r="30"/><circle cx="90" cy="52" r="22" fill="currentColor" opacity=".3"/><path d="M90 11V4M90 100V93M49 52H42M138 52H131M59 21l-5-5M126 88l-5-5M59 83l-5 5M126 16l-5 5"/>',
      film: '<path d="M13 27H167V85H13zM20 35H51V77H20zM57 35H88V77H57zM94 35H125V77H94zM131 35H160V77H131z"/><path d="M24 21H31M49 21H56M74 21H81M99 21H106M124 21H131M149 21H156M24 91H31M49 91H56M74 91H81M99 91H106M124 91H131M149 91H156"/><circle cx="34" cy="57" r="3" fill="currentColor"/><circle cx="75" cy="47" r="3" fill="currentColor"/><circle cx="107" cy="58" r="3" fill="currentColor"/><circle cx="141" cy="62" r="3" fill="currentColor"/>',
      orbit: '<ellipse cx="90" cy="56" rx="65" ry="39"/><ellipse cx="90" cy="56" rx="39" ry="24"/><circle cx="90" cy="56" r="7" fill="currentColor" opacity=".4"/><circle cx="124" cy="44" r="5" fill="currentColor"/><circle cx="48" cy="86" r="6" fill="currentColor"/><path d="M124 44L48 86" stroke-dasharray="4 5"/>',
      inner: '<path d="M24 82Q90 4 156 82M37 88H144"/><circle cx="90" cy="76" r="12" fill="currentColor" opacity=".3"/><path d="M65 76H59M90 51V45M114 76H120M72 58l-4-4M108 58l4-4"/><circle cx="46" cy="59" r="4" fill="currentColor"/><circle cx="139" cy="51" r="6" fill="currentColor"/>',
      alignment: '<path d="M20 20H78V50H20zM102 20H160V50H102zM20 65H78V95H20zM102 65H160V95H102z"/><path d="M26 35H72M108 35H154M26 80H72M108 80H154" opacity=".5"/><g fill="currentColor"><circle cx="32" cy="35" r="4"/><circle cx="49" cy="35" r="3"/><circle cx="65" cy="35" r="3"/><circle cx="114" cy="35" r="3"/><circle cx="131" cy="35" r="4"/><circle cx="148" cy="35" r="3"/><circle cx="32" cy="80" r="4"/><circle cx="49" cy="80" r="3"/><circle cx="65" cy="80" r="3"/><circle cx="114" cy="80" r="3"/><circle cx="131" cy="80" r="4"/><circle cx="148" cy="80" r="3"/></g>',
      catalog: '<path d="M21 19H83L90 26L97 19H159V91H97L90 97L83 91H21zM90 26V97M33 70H72M33 80H72M108 70H147M108 80H147"/><circle cx="39" cy="47" r="5"/><circle cx="64" cy="47" r="7"/><circle cx="111" cy="47" r="5"/><circle cx="129" cy="47" r="7"/><circle cx="148" cy="47" r="5"/>'
    };
    return '<svg class="memory-paper-glyph" viewBox="0 0 180 112" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true" focusable="false">' + (drawings[kind] || drawings.photos) + '</svg>';
  }
  function progressNote(id, state) {
    const value = state && typeof state === 'object' ? state : {};
    if (id === 'e1') {
      const count = ['miss', 'hit'].filter(key => value.records?.[key]).length;
      return '직접 남긴 비교 사진 ' + count + ' / 2';
    }
    if (id === 'p1') return '살펴본 행성 ' + ['화성', '목성', '토성'].filter(name => value.seen?.includes?.(name)).length + ' / 3';
    if (id === 'p3') return '살펴본 내행성 ' + ['수성', '금성'].filter(name => value.seen?.includes?.(name)).length + ' / 2';
    if (id === 'p4') {
      const count = new Set((Array.isArray(value.answered) ? value.answered : []).filter(index => Number.isInteger(index) && index >= 0 && index < 4)).size;
      return '기록으로 채택한 배치 ' + count + ' / 4';
    }
    return '';
  }
  function syncVisibility() {
    if (!session) return;
    session.nodes.modal.dataset.memoryPaused = String(document.hidden);
  }
  function mount(id, options = {}) {
    unmount();
    const story = STORIES[id]; if (!story) return false;
    const modal = document.getElementById('missionModal');
    const companion = document.getElementById('missionMemoryCompanion');
    const flow = document.getElementById('missionMemoryFlow');
    const completion = document.getElementById('missionMemoryCompletion');
    if (!modal || !companion || !flow || !completion) return false;
    const npc = NPCS[story.npc];
    companion.classList.add('memory-companion');
    companion.innerHTML = '<div class="memory-npc"><div class="memory-npc-portrait"><img alt="" aria-hidden="true"></div>' +
      '<div class="memory-npc-caption"><small class="memory-location"></small><strong class="memory-npc-name"></strong>' +
      '<p id="missionMemoryLine" class="memory-npc-line" role="status" aria-live="polite" aria-atomic="true"></p></div></div>' +
      '<section class="memory-fragment"><small class="memory-fragment-label">이번에 찾은 기록</small><h3 class="memory-fragment-title"></h3>' +
      '<div class="memory-paper">' + glyph(story.glyph) +
      story.pieces.map((_, index) => '<span class="memory-paper-piece" data-piece="' + index + '"></span>').join('') +
      '<div class="memory-npc-sprite" aria-hidden="true"><img alt=""></div></div>' +
      '<p class="memory-fragment-stamp"></p><p class="memory-progress-note" aria-live="polite"></p></section>' +
      '<section class="memory-ledger"><div><strong class="memory-ledger-title"></strong><span class="memory-ledger-count"></span></div><p class="memory-ledger-text"></p></section>';
    flow.innerHTML = '<p class="memory-flow-label">기록이 돌아오는 순서</p><ol class="memory-flow" aria-label="기록 복원의 이야기 흐름">' +
      FLOW.map((label, index) => '<li data-memory-step="' + index + '"><span class="memory-flow-number" aria-hidden="true">' + (index + 1) + '</span><span class="memory-flow-name">' + label + '</span></li>').join('') + '</ol>';
    completion.innerHTML = '<article class="memory-restoration-card" aria-label="돌아온 관측 기록"><small class="memory-restoration-kicker"></small>' +
      '<h3 class="memory-restoration-title"></h3><p class="memory-restoration-line"></p><p class="memory-restoration-object"></p>' +
      '<div class="memory-restoration-principle"><strong></strong><p></p></div></article>';
    completion.hidden = true;
    const nodes = {
      modal, companion, flow, completion,
      portrait: companion.querySelector('.memory-npc-portrait img'), sprite: companion.querySelector('.memory-npc-sprite'),
      spriteImage: companion.querySelector('.memory-npc-sprite img'), line: companion.querySelector('.memory-npc-line'),
      fragment: companion.querySelector('.memory-fragment'), stamp: companion.querySelector('.memory-fragment-stamp'),
      pieces: [...companion.querySelectorAll('.memory-paper-piece')], progress: companion.querySelector('.memory-progress-note'),
      ledger: companion.querySelector('.memory-ledger'), ledgerCount: companion.querySelector('.memory-ledger-count'),
      ledgerText: companion.querySelector('.memory-ledger-text'), flowSteps: [...flow.querySelectorAll('[data-memory-step]')],
      cardKicker: completion.querySelector('.memory-restoration-kicker'), cardTitle: completion.querySelector('.memory-restoration-title'),
      cardLine: completion.querySelector('.memory-restoration-line'), cardObject: completion.querySelector('.memory-restoration-object'),
      principleLabel: completion.querySelector('.memory-restoration-principle strong'), principle: completion.querySelector('.memory-restoration-principle p')
    };
    nodes.portrait.src = 'assets/portraits/' + story.npc + '.png';
    nodes.spriteImage.src = 'assets/characters/' + story.npc + '_interaction.png';
    setText(companion.querySelector('.memory-location'), story.where);
    setText(companion.querySelector('.memory-npc-name'), npc.name);
    setText(companion.querySelector('.memory-fragment-title'), story.title);
    setText(companion.querySelector('.memory-ledger-title'), npc.short + '의 기억');
    nodes.pieces.forEach((piece, index) => setText(piece, story.pieces[index]));
    session = {
      id, story, nodes, stage: 0, stageCount: id === 'e1' ? 4 : 2, stageNames: [...DEFAULT_STAGES[id]],
      phaseIndex: 0, done: knownDone(options.done), revisit: options.revisit === true || !!options.done?.[id],
      completedThisVisit: false, first: null, error: false, progressNote: '', fragmentState: 'torn', pieces: [], npc: null
    };
    modal.classList.add('memory-mission'); modal.classList.remove('memory-complete');
    modal.dataset.memoryNpc = story.npc; companion.dataset.npc = story.npc;
    companion.dataset.revisit = String(session.revisit);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility(); update(options);
    return true;
  }
  function update(options = {}) {
    if (!session) return false;
    if (options.done && typeof options.done === 'object') session.done = knownDone(options.done);
    if (Number.isInteger(options.stageCount) && options.stageCount > 0) session.stageCount = options.stageCount;
    if (Number.isInteger(options.stage)) session.stage = Math.max(0, Math.min(session.stageCount - 1, options.stage));
    if (Array.isArray(options.stageNames)) session.stageNames = options.stageNames.filter(name => typeof name === 'string');
    if (Object.prototype.hasOwnProperty.call(options, 'error')) session.error = options.error === true;
    if (Object.prototype.hasOwnProperty.call(options, 'state')) session.progressNote = progressNote(session.id, options.state);
    render();
    return true;
  }
  function render() {
    if (!session) return;
    const current = session, nodes = current.nodes, story = current.story, npc = NPCS[story.npc];
    current.phaseIndex = current.completedThisVisit ? 3 : current.id === 'e1' ? Math.min(2, current.stage) : current.stage === 0 ? 1 : 2;
    const phase = PHASES[current.phaseIndex];
    current.npc = npcMemory(story.npc, current.done);
    nodes.modal.dataset.memoryPhase = phase; nodes.companion.dataset.memoryPhase = phase;
    nodes.modal.classList.toggle('memory-retry', current.error && !current.completedThisVisit);
    nodes.companion.classList.toggle('memory-retry', current.error && !current.completedThisVisit);
    let line = story.lines[phase] || story.remember;
    if (current.completedThisVisit) line = current.first ? story.remember : npc.revisit;
    else if (current.error) line = npc.retry;
    else if (current.revisit && current.stage === 0) line = npc.revisit;
    setText(nodes.line, line);
    nodes.sprite.dataset.pose = String(current.completedThisVisit ? 3 : current.error ? 0 : current.phaseIndex === 0 ? 1 : current.phaseIndex === 1 ? 2 : 0);
    current.fragmentState = current.completedThisVisit || current.revisit ? 'restored' : ['torn', 'sorting', 'linked'][current.phaseIndex];
    nodes.fragment.dataset.state = current.fragmentState;
    current.pieces = nodes.pieces.map((piece, index) => {
      const state = current.fragmentState === 'restored' ? 'restored' : index <= current.phaseIndex ? 'laid' : 'waiting';
      piece.dataset.pieceState = state;
      return { index, label: story.pieces[index], state };
    });
    setText(nodes.stamp, current.completedThisVisit ? current.first ? '관측 기록 복원 완료' : '보관한 설명 다시 확인' : current.revisit ?
      '이미 보관한 기록 · 다시 살피는 중' : ['아직 이어지지 않은 기록', '관측하며 조각을 살피는 중', '설명 확인 전 · 복원 대기'][current.phaseIndex]);
    setText(nodes.progress, current.progressNote); nodes.progress.hidden = !current.progressNote;
    nodes.ledger.dataset.memoryState = current.npc.memoryState;
    setText(nodes.ledgerCount, '되찾은 기록 ' + current.npc.completed + ' / ' + current.npc.total);
    setText(nodes.ledgerText, current.npc.text);
    nodes.flowSteps.forEach((step, index) => {
      const state = current.completedThisVisit || index < current.phaseIndex ? 'done' : index === current.phaseIndex ? 'current' : 'pending';
      step.dataset.stepState = state;
      step.classList.toggle('is-done', state === 'done'); step.classList.toggle('is-current', index === current.phaseIndex); step.classList.toggle('is-pending', state === 'pending');
      if (index === current.phaseIndex) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
  }
  function complete(options = {}) {
    if (!session || session.completedThisVisit) return false;
    session.completedThisVisit = true; session.first = options.first !== false; session.error = false;
    if (options.done && typeof options.done === 'object') session.done = knownDone(options.done);
    if (session.id === 'p4') session.progressNote = '기록으로 채택한 배치 4 / 4';
    const nodes = session.nodes, story = session.story;
    render();
    setText(nodes.cardKicker, session.first ? '기억이 돌아온 자리' : '기록을 다시 확인했습니다');
    setText(nodes.cardTitle, session.first ? story.memoryTitle : story.title);
    setText(nodes.cardLine, NPCS[story.npc].short + ' · “' + (session.first ? story.remember : NPCS[story.npc].revisit) + '”');
    setText(nodes.cardObject, session.first ? story.returnedObject : '복원한 기록은 이 방의 장부에 그대로 보관됩니다.');
    setText(nodes.principleLabel, session.first ? '되찾은 관측 원리' : '다시 확인한 관측 원리');
    setText(nodes.principle, story.principle);
    nodes.modal.classList.add('memory-complete'); nodes.completion.hidden = false;
    return true;
  }
  function unmount() {
    if (!session) return;
    const nodes = session.nodes;
    nodes.modal.classList.remove('memory-mission', 'memory-complete', 'memory-retry');
    delete nodes.modal.dataset.memoryPhase; delete nodes.modal.dataset.memoryNpc; delete nodes.modal.dataset.memoryPaused;
    delete nodes.companion.dataset.memoryPhase; delete nodes.companion.dataset.npc; delete nodes.companion.dataset.revisit;
    nodes.companion.classList.remove('memory-retry');
    nodes.companion.replaceChildren(); nodes.flow.replaceChildren(); nodes.completion.replaceChildren(); nodes.completion.hidden = true;
    document.removeEventListener('visibilitychange', syncVisibility);
    session = null;
  }
  function getState() {
    if (!session) return { mounted: false, id: null, phase: null, completedThisVisit: false, completion: { visible: false, first: null } };
    return {
      mounted: true, id: session.id, phase: PHASES[session.phaseIndex], phaseIndex: session.phaseIndex,
      stage: session.stage, stageCount: session.stageCount, stageLabel: session.stageNames[session.stage] || '',
      revisit: session.revisit, completedThisVisit: session.completedThisVisit, error: session.error,
      npc: { ...session.npc }, line: session.nodes.line.textContent, progressNote: session.progressNote,
      fragment: { state: session.fragmentState, title: session.story.title, pieces: session.pieces.map(piece => ({ ...piece })) },
      completion: { visible: !session.nodes.completion.hidden, first: session.first, title: session.nodes.cardTitle.textContent },
      flow: FLOW.map((label, index) => ({ index, label, state: session.nodes.flowSteps[index].dataset.stepState })),
      reducedMotion: !!global.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      paused: document.hidden || session.nodes.modal.hidden
    };
  }
  global.STUDIO_MISSION_MEMORY = Object.freeze({ mount, update, complete, unmount, getStory, getState });
})(window);
