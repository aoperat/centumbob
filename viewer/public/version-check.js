// 외부 버전 체크 스크립트 - 타임스탬프로 캐시 우회하여 로드됨
// Service Worker가 없는 구버전 사용자를 최신 버전으로 마이그레이션
(function() {
  const CURRENT_VERSION = '__APP_VERSION__'; // 빌드 시 치환
  const VERSION_KEY = 'centumbob_version';
  const SW_KEY = 'centumbob_sw_migrated';

  // 개발 환경 스킵
  if (CURRENT_VERSION.indexOf('__') === 0) return;

  const storedVersion = localStorage.getItem(VERSION_KEY);
  const isMigrated = localStorage.getItem(SW_KEY);

  // 버전이 다르거나 SW 마이그레이션이 안 된 경우만 처리
  if ((storedVersion && storedVersion !== CURRENT_VERSION) || !isMigrated) {
    console.log('[Update] 새 버전 적용 중...', CURRENT_VERSION);

    // 모든 캐시 삭제
    if ('caches' in window) {
      caches.keys().then(function(names) {
        return Promise.all(names.map(function(name) {
          return caches.delete(name);
        }));
      }).then(function() {
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        localStorage.setItem(SW_KEY, 'true');
        // 새로고침 (Service Worker가 등록되도록)
        window.location.href = window.location.href.split('?')[0] + '?_v=' + Date.now();
      });
    } else {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      localStorage.setItem(SW_KEY, 'true');
      window.location.href = window.location.href.split('?')[0] + '?_v=' + Date.now();
    }
  } else if (!storedVersion) {
    // 첫 방문
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }
})();
