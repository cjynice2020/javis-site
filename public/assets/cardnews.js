/* Javis 카드뉴스 — 만화 속도선 히어로 Canvas 렌더러 */
(function () {
  'use strict';

  var THEMES = {
    'cat-policy':   { r: 65,  g: 134, b: 191, icon: 'shield'  },
    'cat-industry': { r: 77,  g: 171, b: 173, icon: 'trend'   },
    'cat-tech':     { r: 34,  g: 197, b: 94,  icon: 'bolt'    },
    'cat-incident': { r: 255, g: 107, b: 107, icon: 'warning' },
    'cat-research': { r: 255, g: 192, b: 0,   icon: 'search'  },
  };

  // 카드번호+카테고리 기반 고정 시드 — 매 로드마다 동일한 속도선 패턴
  function seededRand(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function drawHero(cvs) {
    var cat = cvs.dataset.cat || 'cat-policy';
    var num = parseInt(cvs.dataset.num, 10) || 1;
    var theme = THEMES[cat] || THEMES['cat-policy'];
    var ctx = cvs.getContext('2d');
    var hero = cvs.parentElement;
    var dpr = window.devicePixelRatio || 1;
    var W = hero.clientWidth;
    var H = hero.clientHeight;
    if (!W || !H) return;

    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.scale(dpr, dpr);

    var cx = W * 0.5;
    var cy = H * 0.47;
    var r = theme.r, g = theme.g, b = theme.b;
    var rand = seededRand(num * 137 + cat.charCodeAt(4));

    // 속도선 (集中線)
    var N = 88;
    for (var i = 0; i < N; i++) {
      var base = (i / N) * Math.PI * 2;
      var jitter = (rand() - 0.5) * (Math.PI * 2 / N) * 1.7;
      var a = base + jitter;
      var r0 = 50 + rand() * 18;
      var r1 = Math.hypot(W * 0.65, H * 0.65) * (0.58 + rand() * 0.42);
      var lw = rand() * 4.5 + 0.3;
      var alpha = rand() * 0.21 + 0.04;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // 하프톤 도트 텍스처
    var ds = 16;
    for (var dx = ds / 2; dx < W; dx += ds) {
      for (var dy = ds / 2; dy < H; dy += ds) {
        var dist = Math.hypot(dx - cx, dy - cy);
        var da = Math.max(0, 0.052 - dist * 0.00009);
        if (da < 0.004) continue;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + da + ')';
        ctx.fill();
      }
    }

    // 중앙 글로우
    var gGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 88);
    gGrd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.22)');
    gGrd.addColorStop(0.55, 'rgba(' + r + ',' + g + ',' + b + ',0.06)');
    gGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gGrd;
    ctx.fillRect(0, 0, W, H);

    // 카테고리 아이콘
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.48)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawIcon(ctx, theme.icon, r, g, b);
    ctx.restore();
  }

  function drawIcon(ctx, icon, r, g, b) {
    var clr = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
    ctx.fillStyle = clr;
    ctx.strokeStyle = clr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (icon === 'shield') {
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.bezierCurveTo(27, -35, 33, -13, 33, 0);
      ctx.bezierCurveTo(33, 18, 17, 31, 0, 39);
      ctx.bezierCurveTo(-17, 31, -33, 18, -33, 0);
      ctx.bezierCurveTo(-33, -13, -27, -35, 0, -35);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-14, 1);
      ctx.lineTo(-3, 13);
      ctx.lineTo(15, -10);
      ctx.stroke();

    } else if (icon === 'trend') {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, 14);
      ctx.lineTo(-14, 2);
      ctx.lineTo(0, 8);
      ctx.lineTo(14, -8);
      ctx.lineTo(28, -20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, -26);
      ctx.lineTo(32, -18);
      ctx.lineTo(22, -8);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, 22);
      ctx.lineTo(30, 22);
      ctx.stroke();

    } else if (icon === 'bolt') {
      ctx.beginPath();
      ctx.moveTo(8, -38);
      ctx.lineTo(-7, -2);
      ctx.lineTo(6, -2);
      ctx.lineTo(-8, 38);
      ctx.lineTo(9, 4);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'warning') {
      var t = 37;
      ctx.beginPath();
      ctx.moveTo(0, -t);
      ctx.lineTo(t * 0.87, t * 0.5);
      ctx.lineTo(-t * 0.87, t * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(-4, -16, 8, 20);
      ctx.beginPath();
      ctx.arc(0, 12, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'search') {
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(-6, -8, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(11, 9);
      ctx.lineTo(28, 28);
      ctx.stroke();
    }
  }

  function init() {
    document.querySelectorAll('.cn-hero canvas').forEach(drawHero);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
