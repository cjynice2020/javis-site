// Javis — 카카오 공유 + 링크 복사 핸들러
//
// 카카오 SDK는 site/config.json의 kakao_app_key 가 있을 때만 로드된다.
// 값이 비어 있으면 카카오 공유 버튼은 숨김, 링크 복사 버튼만 노출.

(function () {
  const cfg = window.JAVIS_CONFIG || {};
  const kakaoBtn = document.getElementById('btn-kakao-share');
  const copyBtn = document.getElementById('btn-copy-url');

  // ---- 링크 복사 ---------------------------------------------------------
  if (copyBtn) {
    copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyBtn.textContent = '복사됨 ✓';
        setTimeout(() => { copyBtn.textContent = '링크 복사'; }, 1800);
      } catch (e) {
        // 폴백 — 보안 컨텍스트 외에서 clipboard API 불가
        const ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = '복사됨 ✓'; }
        catch (_) { copyBtn.textContent = '복사 실패'; }
        document.body.removeChild(ta);
        setTimeout(() => { copyBtn.textContent = '링크 복사'; }, 1800);
      }
    });
  }

  // ---- 카카오 공유 -------------------------------------------------------
  if (!kakaoBtn) return;
  if (!cfg.kakao_app_key) {
    // 키 없음 — 버튼 숨기고 종료
    kakaoBtn.hidden = true;
    return;
  }

  function loadKakaoSdk(cb) {
    if (window.Kakao) return cb();
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    s.integrity =
      'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';
    s.crossOrigin = 'anonymous';
    s.onload = cb;
    document.head.appendChild(s);
  }

  // Read OG / Twitter / standard meta. OG is the source of truth — set by
  // build-javis-site.py per report — and falls back to legacy attributes
  // when an older HTML predates the OG block.
  function pickMeta(name) {
    const el = document.querySelector(
      'meta[property="' + name + '"], meta[name="' + name + '"]'
    );
    return el ? (el.getAttribute('content') || '') : '';
  }

  loadKakaoSdk(function () {
    try {
      if (!Kakao.isInitialized()) Kakao.init(cfg.kakao_app_key);
    } catch (e) {
      console.warn('Kakao init failed', e);
      kakaoBtn.hidden = true;
      return;
    }
    kakaoBtn.addEventListener('click', function () {
      const title = pickMeta('og:title') || document.title || 'Javis 리포트';
      const desc  = pickMeta('og:description') || pickMeta('description') || '';
      const img   = pickMeta('og:image') || cfg.share_image || '';
      const url   = pickMeta('og:url') || window.location.href;
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: desc,
          imageUrl: img,
          link: { mobileWebUrl: url, webUrl: url },
        },
      });
    });
  });
})();
