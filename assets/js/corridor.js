/* 별빛 사진관 V6.2 · 고요한 별빛 회랑
 * 960 × 540 논리 좌표용 순수 기하/투영 함수입니다.
 * 게임 상태, DOM, 입력, 음악 및 ASTRA-7 경기장에 접근하지 않습니다.
 * index 로드 순서: corridor.js → world-data.js → studio.js.
 */
(function (global) {
  'use strict';

  const config = Object.freeze({
    roomId: 'corridor',
    bodyClass: 'in-corridor',
    width: 960,
    height: 540,
    // 실제 회랑 그림의 먼 문턱(y195)과 바닥 안쪽 테두리에 맞춘 값입니다.
    farY: 195,
    nearY: 514,
    farLeft: 455,
    farRight: 505,
    nearLeft: 12,
    nearRight: 948,
    farScale: 0.30,
    nearScale: 1,
    nearSpeed: 62,
    firstArrivalMs: 1900
  });
  const span = config.nearY - config.farY;
  const leftSlope = (config.nearLeft - config.farLeft) / span;
  const rightSlope = (config.nearRight - config.farRight) / span;
  const leftNormal = Math.hypot(1, leftSlope);
  const rightNormal = Math.hypot(1, rightSlope);
  const epsilon = 1e-7;
  const walkPolygon = Object.freeze([
    Object.freeze([config.farLeft, config.farY]),
    Object.freeze([config.farRight, config.farY]),
    Object.freeze([config.nearRight, config.nearY]),
    Object.freeze([config.nearLeft, config.nearY])
  ]);

  // 0 = 먼 문턱, 1 = 가까운 바닥. 범위 밖 좌표도 안정적으로 투영합니다.
  function depthAt(y) {
    const value = Number.isFinite(y) ? y : config.nearY;
    return Math.max(0, Math.min(1, (value - config.farY) / span));
  }

  function scaleAt(y) {
    return config.farScale + (config.nearScale - config.farScale) * depthAt(y);
  }

  // 절대 속도: 논리 px / 초. 기본 탐색 속도에 다시 곱하지 않습니다.
  // x480, y480에서 먼 문 trigger까지 약7.7초; 원경에서는 보폭도 작아집니다.
  // 문 앞 SD의 실제 실루엣 높이는 약30px로, 그림 속 약36px 문에 맞춥니다.
  function speedAt(y) {
    return config.nearSpeed * scaleAt(y);
  }

  // radius는 원근 적용 전 발 반경입니다. 내부에서 한 번만 축소합니다.
  // 비스듬한 양측 경계에는 선의 법선 길이를 반영해 원형 발을 안쪽에 둡니다.
  function walkBoundsAt(y, radius = 0) {
    if (!Number.isFinite(y) || !Number.isFinite(radius)) return null;
    const projectedRadius = Math.max(0, radius) * scaleAt(y);
    if (y < config.farY + projectedRadius - epsilon ||
        y > config.nearY - projectedRadius + epsilon) return null;
    const depth = depthAt(y);
    const left = config.farLeft + (config.nearLeft - config.farLeft) * depth + projectedRadius * leftNormal;
    const right = config.farRight + (config.nearRight - config.farRight) * depth - projectedRadius * rightNormal;
    return left <= right ? { left, right } : null;
  }

  function contains(x, y, radius = 10) {
    if (!Number.isFinite(x)) return false;
    const bounds = walkBoundsAt(y, radius);
    return !!bounds && x >= bounds.left - epsilon && x <= bounds.right + epsilon;
  }

  global.STUDIO_CORRIDOR = Object.freeze({
    roomId: config.roomId,
    config,
    walkPolygon,
    depthAt,
    scaleAt,
    speedAt,
    walkBoundsAt,
    contains
  });
})(window);
