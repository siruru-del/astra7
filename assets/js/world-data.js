/* 별빛 사진관 V6 · 공간 설정
 * 모든 좌표는 960 × 540 논리 화면 / 캐릭터 발 위치 기준입니다.
 * anchor = 캐릭터가 접근하는 바닥 위치, art = 배경 속 실제 장비 위치.
 * 이 파일은 본편 탐색 전용입니다. ASTRA-7 경기장에는 적용되지 않습니다.
 */
window.STUDIO_WORLD = Object.freeze({
  version: 6,
  playerRadius: 10,
  sprite: { cellWidth: 96, cellHeight: 128, footY: 119, drawWidth: 72, drawHeight: 96 },
  rooms: {
    lobby: {
      code: '01 / PHOTO STUDIO', title: '별빛 사진관', note: '빛이 머무는 접수대',
      spawn: [480, 430], bounds: { left: 20, top: 226, right: 940, bottom: 514 },
      obstacles: [[76,226,166,32],[111,245,86,35],[334,226,411,35],[824,226,80,28],[20,375,70,141],[865,430,72,86]],
      npc: { id: 'manager', anchor: [670,326], facing: 'down' },
      stations: {
        e1: { anchor: [393,302], art: [389,190], label: '촬영 접수 장부' },
        p1: { anchor: [219,311], art: [215,229], label: '연속 촬영 필름' },
        seal: { anchor: [549,302], art: [545,230], label: '중앙 현상기' }
      },
      details: [
        { id:'window', anchor:[738,330], art:[731,189], label:'오래된 필름 상자', who:'사진관 관리인 · 윤', lines:['상자 안에는 같은 하늘을 서로 다른 날에 찍은 음화가 차곡차곡 놓여 있다.','한 장만 보면 멈춘 점이에요. 여러 장을 나란히 놓으면 움직임이 보여요. 사진을 비교하는 이유가 거기에 있죠.'] }
      ],
      portals: [
        { id:'west', dest:'darkroom', label:'붉은 암실', kind:'door', x:43, y:240, trigger:{x:20,y:226,w:45,h:29}, approach:{x:43,y:300}, entry:{x:886,y:310}, direction:'up', face:'up' },
        { id:'east', dest:'archive', label:'관측 자료실', kind:'door', x:930, y:240, trigger:{x:909,y:226,w:31,h:29}, approach:{x:927,y:303}, entry:{x:94,y:336}, direction:'up', face:'up' },
        { id:'stairs', dest:'roof', label:'천문대 옥상', kind:'stairs', x:280, y:235, trigger:{x:252,y:226,w:57,h:26}, approach:{x:280,y:305}, entry:{x:111,y:350}, direction:'up', face:'up' },
        { id:'hidden', dest:'secret', label:'숨은 기록실', kind:'secret', locked:true, x:785, y:236, trigger:{x:755,y:226,w:58,h:26}, approach:{x:785,y:306}, entry:{x:716,y:290}, direction:'up', face:'up' }
      ],
      lights: [[476,175,'255,209,134',125],[116,91,'255,201,122',85]],
      seal: { x:486.8, y:229.9, gap:14.9, radius:5.1 }
    },
    darkroom: {
      code: '02 / DARKROOM', title: '붉은 암실', note: '어둠 속에서 드러나는 빛의 기록',
      spawn:[886,320], bounds:{left:40,top:251,right:940,bottom:514},
      obstacles:[[40,251,66,77],[115,251,701,16],[35,414,57,101],[876,423,65,95]],
      npc:{id:'technician',anchor:[708,331],facing:'left'},
      stations:{
        e2:{anchor:[579,306],art:[569,174],label:'그림자 투사 트레이'},
        e4:{anchor:[412,306],art:[413,157],label:'필름 확대기'}
      },
      details:[{id:'drying',anchor:[240,308],art:[255,178],label:'암실 작업 수첩',who:'암실 기술자 · 하린',lines:['현상 순서가 적힌 수첩 끝에 짧은 메모가 있다. “한 번에 조건 하나만.”','필름 두 장을 비교하려면 무엇을 바꿨는지 알아야 해요. 위치와 크기를 한꺼번에 바꾸면 어떤 차이가 원인이었는지 놓치기 쉽거든요.']}],
      portals:[{id:'east',dest:'lobby',label:'별빛 사진관',kind:'door',x:886,y:258,trigger:{x:851,y:251,w:72,h:27},approach:{x:886,y:318},entry:{x:43,y:308},direction:'up',face:'up'}],
      lights:[[458,72,'242,80,75',150],[795,77,'242,80,75',140]]
    },
    roof:{
      code:'03 / OBSERVATORY',title:'천문대 옥상',note:'같은 별자리, 달라지는 시선',
      spawn:[111,352],bounds:{left:45,top:279,right:920,bottom:514},
      obstacles:[[155,279,70,22],[745,279,166,43],[55,367,79,147],[889,410,40,107]],
      npc:{id:'guide',anchor:[615,352],facing:'left'},
      stations:{
        e3:{anchor:[531,325],art:[530,201],label:'월식 관측 망원경'},
        p3:{anchor:[815,366],art:[844,248],label:'이각 관측대'}
      },
      details:[{id:'bench',anchor:[184,442],art:[113,422],label:'별을 기다리는 자리',who:'천문부 안내자 · 서준',lines:['벤치에는 서로 다른 날짜가 적힌 별자리 스케치가 놓여 있다. 별자리 사이의 작은 점만 위치가 달라졌다.','하늘을 읽을 때는 기준이 필요해. 별자리를 배경으로 두고 행성의 위치를 날짜순으로 비교해 보자.']}],
      portals:[{id:'stairhouse',dest:'lobby',label:'사진관으로 내려가기',kind:'door',x:111,y:287,trigger:{x:82,y:279,w:60,h:23},approach:{x:111,y:340},entry:{x:280,y:313},direction:'up',face:'up'}],
      lights:[[144,215,'255,206,133',80],[485,134,'132,172,224',150]]
    },
    archive:{
      code:'04 / CELESTIAL ARCHIVE',title:'관측 자료실',note:'흩어진 관측을 하나의 설명으로',
      spawn:[104,339],bounds:{left:20,top:279,right:931,bottom:514},
      obstacles:[[290,279,390,53],[181,279,94,44],[731,279,167,40],[20,348,48,90],[867,351,65,71]],
      npc:{id:'archivist',anchor:[750,392],facing:'left'},
      stations:{
        p2:{anchor:[349,367],art:[362,262],label:'공전 궤도 모형'},
        p4:{anchor:[626,367],art:[620,204],label:'태양계 배치 모형'},
        p5:{anchor:[486,374],art:[485,225],label:'마지막 관측 도감'}
      },
      details:[{id:'shelf',anchor:[837,360],art:[855,244],label:'날짜순으로 꽂힌 관측일지',who:'기록 사서 · 민',lines:['책등에는 정답 대신 관측 날짜와 장소가 적혀 있다. 같은 현상을 본 사람들의 서로 다른 기록이다.','분류는 외워서 붙이는 이름이 아니에요. 공통점과 차이를 설명할 기준을 찾는 일이죠. 이 책상 위의 모형과 도감을 함께 읽어 보세요.']}],
      portals:[{id:'west',dest:'lobby',label:'별빛 사진관',kind:'door',x:94,y:287,trigger:{x:66,y:279,w:65,h:25},approach:{x:94,y:341},entry:{x:927,y:310},direction:'up',face:'up'}],
      lights:[[480,93,'255,202,115',140],[325,166,'255,206,134',80]]
    },
    secret:{
      code:'05 / UNLISTED ARCHIVE',title:'숨은 기록실',note:'기록 너머의 작은 도전',
      spawn:[716,290],bounds:{left:53,top:208,right:907,bottom:514},
      obstacles:[[53,208,613,43],[763,208,144,43],[53,230,207,80],[340,218,275,32],[768,230,135,80],[67,287,166,57],[765,287,138,57],[53,416,87,101],[811,410,99,108]],
      stations:{
        scoreboard:{anchor:[478,296],art:[479,142],label:'사진관 도전 기록'},
        rush:{anchor:[177,371],art:[165,252],label:'TARGET RUSH'},
        chaos:{anchor:[818,372],art:[831,252],label:'CHAOS PROTOCOL'}
      },
      details:[],
      portals:[{id:'return',dest:'lobby',label:'별빛 사진관',kind:'door',x:716,y:218,trigger:{x:686,y:208,w:60,h:25},approach:{x:716,y:284},entry:{x:785,y:315},direction:'up',face:'up'}],
      lights:[[165,248,'157,121,229',100],[827,248,'171,131,230',100]]
    }
  }
});
