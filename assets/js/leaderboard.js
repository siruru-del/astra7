/* Optional online records. The original arena, its input and scoring are not modified. */
(() => {
  'use strict';
  const SDK_ROOT = 'https://www.gstatic.com/firebasejs/13.4.0/';
  const APP_NAME = 'ASTRA7-LEADERBOARD';
  const ARENA_STORAGE = 'starlight_secret_arena_v2';
  const NICKNAME_STORAGE = 'astra7_leader_nickname_v1';
  const SCORING_VERSION = 'rpg-arena-v10-original';
  const CURRENT_COLLECTION = 'astra7_photo_leaderboard_v1';
  const HISTORICAL_COLLECTION = 'astra7_leaderboard_v1';
  const CURRENT_BOARDS = Object.freeze([
    ['rush_30', 'TARGET RUSH · 30×'], ['chaos_35', 'CHAOS PROTOCOL · 35×']
  ]);
  const HISTORICAL_BOARDS = Object.freeze([
    ...[1, 2, 4, 6, 8, 10, 12, 14].map(speed => ['ranked_' + speed, '화성 랭크 · ' + speed + '×']),
    ['rush_30', 'TARGET RUSH · 30×'], ['chaos_35', 'CHAOS · 35×']
  ]);
  const CHECKPOINTS = Object.freeze([-300, -200, -100, 0, 100, 200, 300]);
  const TIERS = Object.freeze(['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'ROOKIE']);
  const frame = document.getElementById('legacyFrame');
  const portal = document.getElementById('legacyPortal');
  let roundSerial = 0, round = null, pendingRun = null, captureReason = 'no-run';
  let view = null, viewSerial = 0, requestSerial = 0, submissionSerial = 0;
  let status = 'closed', authStatus = 'idle', lastError = '', rows = [], submitting = false;
  let connection = null, connectionPromise = null, anonymousSignInPromise = null;

  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const same = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.000001;
  const keyFor = mode => mode === 'chaos' ? 'chaos_35' : 'rush_30';
  const modeLabel = mode => mode === 'chaos' ? 'CHAOS PROTOCOL' : 'TARGET RUSH';
  const nickname = value => String(value || '').trim().replace(/\s+/g, ' ');
  const validNickname = value => /^[가-힣a-zA-Z0-9_ .-]{2,18}$/u.test(value);

  function failure(code) { const error = new Error(code); error.code = code; return error; }
  function storedArena() {
    try { return JSON.parse(localStorage.getItem(ARENA_STORAGE) || 'null'); }
    catch (_) { return null; }
  }
  function clearRun(reason = 'no-run') {
    pendingRun = null;
    round = null;
    captureReason = reason;
    roundSerial++;
    submissionSerial++;
    updateForm();
  }
  function beginRound(reason, loaded = false) {
    pendingRun = null;
    captureReason = reason;
    submissionSerial++;
    round = {
      id: ++roundSerial, startedAt: Date.now(), expectedMode: null,
      loaded, source: loaded ? frame.contentWindow : null,
      document: loaded ? frame.contentDocument : null, reported: false
    };
    updateForm();
  }
  function rememberStartedMode(id) {
    if (!round || round.id !== id || !frame || portal.hidden || !frame.hasAttribute('srcdoc')) return;
    const saved = storedArena(), state = saved?.state;
    if (saved?.app === 'ASTRA7' && saved.version === 10 && state?.started === true &&
        state.phase === 'countdown' && ['rush', 'chaos'].includes(state.mode) &&
        state.updatedAt >= round.startedAt - 250) round.expectedMode = state.mode;
  }
  function validateResult(message) {
    const saved = storedArena(), state = saved?.state, result = state?.result;
    if (!saved || saved.app !== 'ASTRA7' || saved.version !== 10 || !state || !result) throw failure('missing-save');
    if (state.interrupted !== false || result.eligible !== true) throw failure('interrupted');
    if (state.phase !== 'review' || state.started !== true || state.stage !== 1) throw failure('unfinished');
    const mode = message.mode, speed = mode === 'chaos' ? 35 : 30;
    if (!['rush', 'chaos'].includes(mode) || !round.expectedMode || round.expectedMode !== mode ||
        state.mode !== mode || result.mode !== mode || state.speed !== speed || result.speed !== speed) throw failure('mode-mismatch');
    if (!integer(message.score, 0, 100) || !integer(message.hits, 0, 7) || !integer(message.accuracy, 0, 100) ||
        !number(message.seconds, 0.001, 3600) || !TIERS.includes(message.tier)) throw failure('invalid-result');
    for (const field of ['score', 'hits', 'accuracy', 'seconds', 'tier']) {
      if (message[field] !== result[field]) throw failure('result-mismatch');
    }
    if (!integer(result.combo, 0, message.hits) || result.combo !== state.bestCombo ||
        !same(state.elapsed, result.seconds) || !integer(state.shots, message.hits, 100000) ||
        Math.round(state.shots ? message.hits / state.shots * 100 : 0) !== result.accuracy) throw failure('invalid-metrics');
    const savedAt = Date.parse(saved.savedAt), now = Date.now();
    if (!number(state.updatedAt, round.startedAt - 250, now + 1000) ||
        !number(savedAt, round.startedAt - 250, now + 1000) || now - state.updatedAt > 10000 ||
        Math.abs(savedAt - state.updatedAt) > 2000) throw failure('stale-save');
    if (!Array.isArray(state.scans) || state.scans.length !== result.hits || !number(state.day, -350, 350)) throw failure('invalid-scans');
    const seen = new Set();
    let previousDay = -Infinity;
    for (const scan of state.scans) {
      if (!scan || scan.source !== 'manual' || !CHECKPOINTS.includes(scan.checkpoint) || seen.has(scan.checkpoint) ||
          scan.speed !== speed || !number(scan.day, -350, 350) || Math.abs(scan.day - scan.checkpoint) > 38 ||
          scan.day < previousDay || scan.day > state.day + 0.000001) throw failure('invalid-scans');
      seen.add(scan.checkpoint); previousDay = scan.day;
    }
    // The original game ends at day 350 OR immediately after the seventh successful photograph.
    const naturalFinish = same(state.day, 350);
    const earlyFinish = seen.size === 7 && same(state.day, previousDay);
    if (!naturalFinish && !earlyFinish) throw failure('unfinished');
    return Object.freeze({
      roundId: round.id, capturedAt: now, boardKey: keyFor(mode), mode, speed,
      score: result.score, hits: result.hits, accuracy: result.accuracy,
      combo: result.combo, seconds: result.seconds, tier: result.tier,
      scoringVersion: SCORING_VERSION
    });
  }
  function captureResult(event) {
    if (!frame || !portal || portal.hidden || !frame.hasAttribute('srcdoc') || !round?.loaded || round.reported ||
        event.source !== frame.contentWindow || event.source !== round.source || frame.contentDocument !== round.document) return;
    const message = event.data;
    if (!message || message.type !== 'STARLIGHT_BONUS_RESULT') return;
    round.reported = true;
    try { pendingRun = { record: validateResult(message), submitted: false }; captureReason = 'ready'; }
    catch (error) { pendingRun = null; captureReason = error.code || 'invalid-result'; }
    updateForm();
  }

  // These observers sit outside the original bridge and never change the embedded document or game.
  if (frame && portal) {
    new MutationObserver(records => {
      if (!records.some(record => record.attributeName === 'srcdoc')) return;
      if (frame.hasAttribute('srcdoc')) beginRound('new-run');
      else if (round) { round.source = null; round.document = null; round.loaded = false; }
    }).observe(frame, { attributes: true, attributeFilter: ['srcdoc'] });
    frame.addEventListener('load', () => {
      if (!frame.hasAttribute('srcdoc') || portal.hidden) return;
      if (!round || round.loaded) beginRound('new-run');
      round.loaded = true; round.source = frame.contentWindow; round.document = frame.contentDocument;
      const id = round.id;
      // The original onload handler starts and saves the countdown in the same event dispatch.
      setTimeout(() => rememberStartedMode(id), 0);
    });
    document.getElementById('arenaReplay')?.addEventListener('click', () => {
      if (portal.hidden || !frame.hasAttribute('srcdoc')) return;
      beginRound('new-run', true);
      const id = round.id;
      setTimeout(() => rememberStartedMode(id), 0);
    }, true);
    window.addEventListener('message', captureResult);
  }

  function timed(promise, milliseconds = 15000) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(failure('connection-timeout')), milliseconds); })
    ]).finally(() => clearTimeout(timer));
  }
  function configured() {
    const config = window.STUDIO_FIREBASE_CONFIG;
    return config && ['apiKey', 'authDomain', 'projectId', 'appId'].every(key => typeof config[key] === 'string' && config[key].trim());
  }
  async function authReady(auth, authModule) {
    if (typeof auth.authStateReady === 'function') return auth.authStateReady();
    await new Promise((resolve, reject) => {
      let unsubscribe;
      const done = error => { queueMicrotask(() => unsubscribe?.()); error ? reject(error) : resolve(); };
      unsubscribe = authModule.onAuthStateChanged(auth, () => done(), done);
    });
  }
  function anonymousSignIn(auth, authModule) {
    // A UI timeout does not cancel the SDK request. A retry must await that same request.
    if (!anonymousSignInPromise) {
      const attempt = Promise.resolve().then(() => authModule.signInAnonymously(auth)).finally(() => {
        if (anonymousSignInPromise === attempt) anonymousSignInPromise = null;
      });
      anonymousSignInPromise = attempt;
    }
    return anonymousSignInPromise;
  }
  async function connect() {
    if (!configured()) throw failure('missing-config');
    if (navigator.onLine === false) throw failure('offline');
    if (connection?.auth.currentUser) return connection;
    if (connectionPromise) return connectionPromise;
    authStatus = 'loading';
    connectionPromise = (async () => {
      const [appModule, authModule, dbModule] = await timed(Promise.all([
        import(SDK_ROOT + 'firebase-app.js'),
        import(SDK_ROOT + 'firebase-auth.js'),
        import(SDK_ROOT + 'firebase-firestore.js')
      ]));
      if (!view) throw failure('cancelled');
      const app = appModule.getApps().find(item => item.name === APP_NAME) || appModule.initializeApp(window.STUDIO_FIREBASE_CONFIG, APP_NAME);
      const auth = authModule.getAuth(app);
      await timed(authReady(auth, authModule));
      if (!view) throw failure('cancelled');
      if (!auth.currentUser) await timed(anonymousSignIn(auth, authModule));
      if (!auth.currentUser?.uid) throw failure('auth/no-current-user');
      connection = { auth, db: dbModule.getFirestore(app), dbModule };
      authStatus = 'ready';
      return connection;
    })().catch(error => { authStatus = error.code === 'cancelled' ? 'idle' : 'error'; throw error; })
      .finally(() => { connectionPromise = null; });
    return connectionPromise;
  }
  function errorMessage(error, writing = false) {
    const code = String(error?.code || 'connection-failed');
    if (code === 'cancelled') return '등록을 취소했어요. 다시 열어 기록을 확인할 수 있습니다.';
    if (code === 'missing-config') return '온라인 랭킹 설정이 없어 연결할 수 없어요.';
    if (code === 'offline' || navigator.onLine === false) return '인터넷 연결이 끊겼어요. 연결 후 다시 불러오세요.';
    if (code.includes('permission-denied')) return writing ? '기록을 등록할 권한이 없어요. 운영자가 사진관 순위표의 공개 설정을 확인해야 합니다.' : '순위표를 읽을 권한이 없어요. 운영자가 랭킹의 공개 설정을 확인해야 합니다.';
    if (code.includes('operation-not-allowed')) return '랭킹 계정에 연결하지 못했어요. 운영자가 익명 로그인 설정을 확인해야 합니다.';
    if (code.includes('unauthorized-domain')) return '이 사이트에서 랭킹 계정에 연결할 수 없어요. 운영자가 사이트 주소를 확인해야 합니다.';
    if (code.startsWith('auth/') || code.includes('unauthenticated')) return '랭킹 계정 연결에 실패했어요. 잠시 뒤 다시 시도해 주세요.';
    if (code === 'stale-submission') return '경기 기록이 바뀌어 등록을 멈췄어요. 새로 완주한 기록을 확인해 주세요.';
    return writing ? '기록을 등록하지 못했어요. 연결을 확인하고 다시 시도해 주세요.' : '순위표에 연결하지 못했어요. 연결을 확인하고 다시 불러오세요.';
  }
  function setStatus(next, message) {
    status = next;
    if (!view) return;
    view.nodes.status.dataset.state = next;
    view.nodes.status.textContent = message;
    view.nodes.table.setAttribute('aria-busy', String(next === 'loading'));
    updateForm();
  }
  function normalizedRows(snapshot, type, key) {
    const [mode, speedText] = key.split('_'), speed = Number(speedText);
    const result = [];
    for (const doc of snapshot.docs.slice(0, 50)) {
      const value = doc.data();
      if (!value || value.mode !== mode || value.speed !== speed || !number(value.score, 0, 100) ||
          !integer(value.hits, 0, 7) || typeof value.nickname !== 'string' || !TIERS.includes(value.tier)) continue;
      if (type === 'current') {
        if (value.scoringVersion !== SCORING_VERSION || !Number.isInteger(value.score) || !integer(value.accuracy, 0, 100) ||
            !integer(value.combo, 0, 7) || !number(value.seconds, 0.001, 3600)) continue;
      } else if (!number(value.precision, 0, 100)) continue;
      result.push({
        nickname: value.nickname.slice(0, 80), score: value.score, hits: value.hits, tier: value.tier,
        accuracy: type === 'current' ? value.accuracy : null,
        precision: type === 'historical' ? value.precision : null,
        own: doc.id === connection?.auth.currentUser?.uid
      });
    }
    return result.sort((a, b) => b.score - a.score);
  }
  function renderRows() {
    if (!view) return;
    const fragment = document.createDocumentFragment();
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (row.own) tr.classList.add('is-own-record');
      const values = [String(index + 1), row.nickname, view.type === 'current' ? String(row.score) : row.score.toFixed(2),
        row.hits + ' / 7', view.type === 'current' ? row.accuracy + '%' : row.precision.toFixed(1) + '%', row.tier];
      values.forEach((value, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = value;
        tr.appendChild(cell);
      });
      fragment.appendChild(tr);
    });
    view.nodes.rows.replaceChildren(fragment);
  }
  async function loadBoard() {
    if (!view) return;
    if (submitting) { setStatus('loading', '앞선 등록 요청을 마무리한 뒤 순위표를 불러옵니다…'); return; }
    const current = view, request = ++requestSerial, type = view.type, key = view.key;
    rows = []; lastError = ''; renderRows();
    setStatus('loading', '모노리스에서 기록을 불러오는 중…');
    try {
      const { db, dbModule } = await connect();
      if (view !== current || request !== requestSerial) return;
      const list = dbModule.collection(db, type === 'current' ? CURRENT_COLLECTION : HISTORICAL_COLLECTION, key, 'entries');
      const query = dbModule.query(list, dbModule.orderBy('score', 'desc'), dbModule.limit(50));
      const snapshot = await timed(dbModule.getDocsFromServer(query));
      if (view !== current || request !== requestSerial) return;
      rows = normalizedRows(snapshot, type, key); renderRows();
      if (!rows.length && snapshot.docs.length) {
        lastError = 'unsupported-record-format';
        setStatus('unsupported', '등록된 기록은 있지만 확인할 수 있는 형식의 기록이 없어요. 운영자에게 문의해 주세요.');
      } else {
        const skipped = snapshot.docs.length - rows.length;
        setStatus(rows.length ? 'ready' : 'empty', rows.length ? '최고 기록 ' + rows.length + '개 · 점수순으로 표시합니다.' +
          (skipped ? ' 형식을 확인할 수 없는 기록 ' + skipped + '개는 표시하지 않았어요.' : '') : '아직 이 모드에 등록된 기록이 없어요.');
      }
    } catch (error) {
      if (view !== current || request !== requestSerial) return;
      lastError = error.code || 'connection-failed';
      setStatus('error', errorMessage(error));
    }
  }
  function captureExplanation() {
    if (captureReason === 'interrupted') return '중간에 멈춘 경기는 등록할 수 없어요. 다시 도전해 끝까지 진행해 주세요.';
    if (captureReason === 'no-run' || captureReason === 'new-run') return 'TARGET RUSH나 CHAOS를 완주하면 이번 기록을 등록할 수 있어요.';
    return '이번 경기의 완주 기록을 확인하지 못했어요. 다시 도전해 완주한 뒤 등록해 주세요.';
  }
  function updateForm() {
    if (!view) return;
    const nodes = view.nodes, candidate = pendingRun?.record;
    const current = view.type === 'current';
    nodes.form.hidden = !current;
    nodes.historyNote.hidden = current;
    nodes.measureHeading.textContent = current ? '명중률' : '중심 정밀도';
    nodes.caption.textContent = current ? '사진관 경기 · 모드별 최고 기록 50개' : '이전 ASTRA-7 · 정밀도 방식 최고 기록 50개';
    nodes.type.disabled = submitting; nodes.mode.disabled = submitting;
    nodes.refresh.disabled = submitting || status === 'loading';
    nodes.nickname.disabled = submitting; nodes.consent.disabled = submitting;
    const matches = candidate && candidate.boardKey === view.key;
    nodes.candidate.textContent = !candidate ? captureExplanation() :
      modeLabel(candidate.mode) + ' · ' + candidate.score + '점 · ' + candidate.hits + '/7 명중 · ' +
      candidate.accuracy + '% · 최대 ' + candidate.combo + '연속 · ' + candidate.seconds.toFixed(1) + '초';
    let hint = '닉네임은 한글·영문·숫자·공백·_ . -를 사용해 2–18자로 적어 주세요.';
    if (!candidate) hint = '등록할 기록은 이번에 끝까지 플레이한 경기에서 가져옵니다.';
    else if (!matches) hint = '이번 기록은 ' + modeLabel(candidate.mode) + ' 순위표에서 등록할 수 있어요.';
    else if (pendingRun.submitted) hint = '이번 기록을 확인했어요. 새 경기를 완주하면 다시 등록할 수 있습니다.';
    else if (navigator.onLine === false) hint = '인터넷에 연결한 뒤 다시 시도해 주세요.';
    else if (!['ready', 'empty'].includes(status)) hint = '순위표 연결을 확인한 뒤 등록할 수 있어요.';
    else if (validNickname(nickname(nodes.nickname.value)) && !nodes.consent.checked) hint = '공개 항목을 확인하고 동의하면 기록을 등록할 수 있어요.';
    nodes.hint.textContent = hint;
    nodes.submit.disabled = !current || !matches || pendingRun.submitted || submitting || navigator.onLine === false ||
      !['ready', 'empty'].includes(status) || !validNickname(nickname(nodes.nickname.value)) || !nodes.consent.checked;
    nodes.submit.textContent = submitting ? '최고 기록 확인 중…' : '이번 기록 등록';
  }
  async function submitRecord(event) {
    event.preventDefault();
    if (!view || submitting) return;
    updateForm();
    if (view.nodes.submit.disabled) return;
    const current = view, candidate = pendingRun, record = candidate.record;
    const name = nickname(current.nodes.nickname.value), operation = ++submissionSerial;
    submitting = true; current.nodes.submitStatus.textContent = '내 최고 기록과 비교하고 있어요…'; updateForm();
    const stillValid = () => view === current && pendingRun === candidate && operation === submissionSerial &&
      !candidate.submitted && current.type === 'current' && current.key === record.boardKey && current.nodes.consent.checked;
    try {
      const { auth, db, dbModule } = await connect();
      if (!stillValid()) throw failure('stale-submission');
      const reference = dbModule.doc(db, CURRENT_COLLECTION, record.boardKey, 'entries', auth.currentUser.uid);
      const outcome = await dbModule.runTransaction(db, async transaction => {
        if (!stillValid()) throw failure('stale-submission');
        const previous = await transaction.get(reference);
        if (!stillValid()) throw failure('stale-submission');
        const previousScore = previous.exists() ? previous.data().score : null;
        // A transaction callback can be retried. Its returned outcome belongs to the final attempt.
        if (number(previousScore, 0, 100) && previousScore >= record.score) return { written: false, score: previousScore };
        transaction.set(reference, {
          nickname: name, mode: record.mode, speed: record.speed, score: record.score,
          hits: record.hits, accuracy: record.accuracy, combo: record.combo, seconds: record.seconds,
          tier: record.tier, scoringVersion: SCORING_VERSION, updatedAt: dbModule.serverTimestamp()
        });
        return { written: true, score: record.score };
      });
      candidate.submitted = true;
      try { localStorage.setItem(NICKNAME_STORAGE, JSON.stringify(name)); } catch (_) { /* Online success does not depend on local storage. */ }
      if (view === current) current.nodes.submitStatus.textContent = outcome.written ?
        '등록했어요. 이 모드의 내 최고 기록이 ' + outcome.score + '점으로 남았습니다.' :
        '기존 최고 기록 ' + outcome.score + '점을 유지했어요. 같거나 낮은 점수는 덮어쓰지 않습니다.';
    } catch (error) {
      if (view === current) { lastError = error.code || 'submission-failed'; current.nodes.submitStatus.textContent = errorMessage(error, true); }
    } finally {
      submitting = false; updateForm();
      if (view && (view !== current || candidate.submitted)) loadBoard();
    }
  }
  function fillModes(preferred) {
    const options = view.type === 'current' ? CURRENT_BOARDS : HISTORICAL_BOARDS;
    view.nodes.mode.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    view.key = options.some(option => option[0] === preferred) ? preferred : options[0][0];
    view.nodes.mode.value = view.key;
  }
  function mount(element, options = {}) {
    unmount();
    const current = {
      id: ++viewSerial, root: element, type: 'current', key: keyFor(options.preferredMode || pendingRun?.record.mode), nodes: null
    };
    element.innerHTML = '<section class="onlineLeaderboard" aria-label="온라인 경기 기록">' +
      '<p class="leaderboardIntro">이 밤을 지나온 도전자들의 기록. 사진관 경기와 이전 ASTRA-7의 순위표를 각각 볼 수 있어요.</p>' +
      '<div class="leaderboardControls"><label>기록실<select id="leaderboardType"><option value="current">사진관 경기</option><option value="historical">이전 ASTRA-7 기록</option></select></label>' +
      '<label>경기<select id="leaderboardMode"></select></label><button type="button" id="leaderboardRefresh">다시 불러오기</button></div>' +
      '<p id="leaderboardHistoryNote" class="leaderboardNotice" hidden>이전 ASTRA-7은 중심 정밀도를 반영한 점수입니다. 기존 기록은 그대로 보관하며 이곳에서는 조회만 할 수 있어요.</p>' +
      '<p id="leaderboardStatus" class="leaderboardStatus" role="status" aria-live="polite"></p>' +
      '<div class="leaderboardTableWrap" tabindex="0" aria-label="순위표 가로 스크롤"><table id="leaderboardTable"><caption id="leaderboardCaption"></caption>' +
      '<thead><tr><th scope="col">순위</th><th scope="col">닉네임</th><th scope="col">점수</th><th scope="col">명중</th><th id="leaderboardMeasureHeading" scope="col">명중률</th><th scope="col">티어</th></tr></thead>' +
      '<tbody id="leaderboardRows"></tbody></table></div>' +
      '<p id="leaderboardLocal" class="leaderboardLocal"></p>' +
      '<form id="leaderboardForm" class="leaderboardForm"><h3>이번 경기 남기기</h3><p id="leaderboardCandidate" class="leaderboardCandidate"></p>' +
      '<div class="leaderboardNicknameRow"><label for="leaderboardNickname">닉네임</label><input id="leaderboardNickname" name="nickname" type="text" minlength="2" maxlength="18" autocomplete="off" spellcheck="false" aria-describedby="leaderboardSubmitHint" placeholder="순위표에 표시할 이름"></div>' +
      '<label class="leaderboardConsent"><input id="leaderboardConsent" type="checkbox"> <span>닉네임과 경기 기록이 순위표에 공개되는 데 동의합니다.</span></label>' +
      '<p id="leaderboardSubmitHint" class="leaderboardHint"></p><button id="leaderboardSubmit" type="submit" disabled>이번 기록 등록</button>' +
      '<p id="leaderboardSubmitStatus" role="status" aria-live="polite"></p></form></section>';
    const find = id => element.querySelector('#leaderboard' + id);
    current.nodes = Object.fromEntries([
      ['type', 'Type'], ['mode', 'Mode'], ['refresh', 'Refresh'], ['status', 'Status'], ['historyNote', 'HistoryNote'],
      ['table', 'Table'], ['caption', 'Caption'], ['measureHeading', 'MeasureHeading'], ['rows', 'Rows'], ['local', 'Local'],
      ['form', 'Form'], ['candidate', 'Candidate'], ['nickname', 'Nickname'], ['consent', 'Consent'], ['hint', 'SubmitHint'],
      ['submit', 'Submit'], ['submitStatus', 'SubmitStatus']
    ].map(([key, suffix]) => [key, find(suffix)]));
    view = current;
    fillModes(current.key);
    const localScore = mode => {
      const score = options.localBests?.[mode];
      return number(score, 1, 100) ? score + '점' : pendingRun?.record.mode === mode && pendingRun.record.score === 0 ? '0점' : '—';
    };
    current.nodes.local.textContent = '이 기기의 저장 최고점 · TARGET RUSH ' + localScore('rush') + ' / CHAOS ' + localScore('chaos') + ' · 온라인 기록은 직접 등록할 때만 남아요.';
    try { const saved = JSON.parse(localStorage.getItem(NICKNAME_STORAGE) || 'null'); if (typeof saved === 'string' && validNickname(saved)) current.nodes.nickname.value = saved; } catch (_) { /* Optional preference. */ }
    current.nodes.type.addEventListener('change', () => {
      if (submitting) return;
      current.type = current.nodes.type.value === 'historical' ? 'historical' : 'current';
      fillModes(current.key); current.nodes.submitStatus.textContent = ''; updateForm(); loadBoard();
    });
    current.nodes.mode.addEventListener('change', () => {
      if (submitting) return;
      current.key = current.nodes.mode.value; current.nodes.submitStatus.textContent = ''; updateForm(); loadBoard();
    });
    current.nodes.refresh.addEventListener('click', loadBoard);
    current.nodes.nickname.addEventListener('input', updateForm);
    current.nodes.consent.addEventListener('change', updateForm);
    current.nodes.form.addEventListener('submit', submitRecord);
    element.addEventListener('keydown', event => {
      if (event.key === 'Escape' && view === current) { event.stopPropagation(); document.getElementById('infoClose')?.click(); }
    });
    updateForm(); loadBoard();
    current.nodes.type.focus();
  }
  function unmount() {
    view = null; requestSerial++; submissionSerial++;
    status = 'closed'; rows = [];
  }
  window.addEventListener('online', updateForm);
  window.addEventListener('offline', () => {
    if (!view) return;
    requestSerial++; rows = []; renderRows(); lastError = 'offline';
    setStatus('error', errorMessage(failure('offline')));
  });
  window.STUDIO_LEADERBOARD = Object.freeze({
    mount, unmount, clearRun,
    getState: () => ({
      active: !!view, status, authStatus, boardType: view?.type || null, boardKey: view?.key || null,
      lastError, submitting, captureReason,
      round: round ? { id: round.id, startedAt: round.startedAt, mode: round.expectedMode, loaded: round.loaded, reported: round.reported } : null,
      pendingRun: pendingRun ? { ...pendingRun.record, submitted: pendingRun.submitted } : null,
      rows: rows.map(row => ({ ...row }))
    })
  });
})();
