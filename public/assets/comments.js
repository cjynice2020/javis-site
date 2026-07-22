// Javis — 익명 댓글 클라이언트
// JAVIS_CONFIG.turnstile_site_key 가 있을 때만 활성. 없으면 자리표시 메시지.

(function () {
  const cfg = window.JAVIS_CONFIG || {};
  const root = document.getElementById('comments-root');
  if (!root) return;

  const apiBase = (cfg.comments_api_base || '').replace(/\/+$/, '');
  const turnstileKey = cfg.turnstile_site_key || '';
  const pageId = window.location.pathname;

  if (!turnstileKey) {
    root.innerHTML =
      '<div class="comments-disabled">댓글 시스템 미설정 (Turnstile 사이트 키 필요).</div>';
    return;
  }

  root.innerHTML =
    '<div id="comments-list" class="comments-list">댓글을 불러오는 중...</div>' +
    '<form id="comments-form" class="comments-form">' +
      '<input id="c-name" type="text" placeholder="이름 (필수)" maxlength="50" required>' +
      '<textarea id="c-body" placeholder="댓글 (필수, 최대 5000자)" maxlength="5000" rows="3" required></textarea>' +
      '<div id="c-turnstile"></div>' +
      '<div class="comments-form-row">' +
        '<button id="c-submit" type="submit" disabled>댓글 작성</button>' +
        '<span id="c-msg" class="comments-msg"></span>' +
      '</div>' +
    '</form>';

  let turnstileToken = null;
  let turnstileWidgetId = null;

  function onTurnstileReady() {
    try {
      turnstileWidgetId = window.turnstile.render('#c-turnstile', {
        sitekey: turnstileKey,
        callback: function (token) {
          turnstileToken = token;
          document.getElementById('c-submit').disabled = false;
        },
        'expired-callback': function () {
          turnstileToken = null;
          document.getElementById('c-submit').disabled = true;
        },
        'error-callback': function () {
          turnstileToken = null;
          document.getElementById('c-submit').disabled = true;
        },
      });
    } catch (e) {
      console.warn('Turnstile render failed', e);
    }
  }
  window.onloadTurnstileCallback = onTurnstileReady;

  var ts = document.createElement('script');
  ts.src =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
  ts.async = true;
  ts.defer = true;
  document.head.appendChild(ts);

  async function loadComments() {
    const list = document.getElementById('comments-list');
    try {
      const url = apiBase + '/api/comments?pageId=' + encodeURIComponent(pageId);
      const resp = await fetch(url);
      const data = await resp.json();
      if (!Array.isArray(data.comments)) throw new Error('bad response');
      if (data.comments.length === 0) {
        list.innerHTML = '<div class="comments-empty">첫 댓글을 남겨보세요.</div>';
        return;
      }
      list.innerHTML = data.comments
        .map(function (c) {
          return (
            '<article class="comment">' +
              '<div class="comment-head">' +
                '<strong>' + escapeHtml(c.name) + '</strong>' +
                '<time>' + formatDate(c.createdAt) + '</time>' +
              '</div>' +
              '<div class="comment-body">' +
                escapeHtml(c.comment).replace(/\n/g, '<br>') +
              '</div>' +
            '</article>'
          );
        })
        .join('');
    } catch (e) {
      list.innerHTML =
        '<div class="comments-error">댓글을 불러오지 못했습니다.</div>';
    }
  }

  document
    .getElementById('comments-form')
    .addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = document.getElementById('c-name').value.trim();
      const comment = document.getElementById('c-body').value.trim();
      const msgEl = document.getElementById('c-msg');
      if (!name || !comment) {
        msgEl.textContent = '이름과 댓글을 입력해주세요.';
        return;
      }
      if (!turnstileToken) {
        msgEl.textContent = '아래 CAPTCHA를 통과해주세요.';
        return;
      }
      msgEl.textContent = '전송 중...';
      document.getElementById('c-submit').disabled = true;
      try {
        const resp = await fetch(apiBase + '/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: pageId, name: name, comment: comment, turnstileToken: turnstileToken }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'failed');
        }
        msgEl.textContent = '댓글이 등록되었습니다.';
        document.getElementById('c-name').value = '';
        document.getElementById('c-body').value = '';
        turnstileToken = null;
        try {
          window.turnstile.reset(turnstileWidgetId);
        } catch (_) {}
        loadComments();
      } catch (err) {
        msgEl.textContent = '전송 실패: ' + (err.message || err);
        document.getElementById('c-submit').disabled = false;
      }
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('ko-KR');
    } catch (e) {
      return iso;
    }
  }

  loadComments();
})();
