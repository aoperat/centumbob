import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

// 빌드 버전 (빌드 시 자동 생성)
const APP_VERSION = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';

// Safari bfcache 감지 및 강제 새로고침
const handleBfcache = () => {
  window.addEventListener('pageshow', (event) => {
    // persisted가 true이면 bfcache에서 복원된 것
    if (event.persisted) {
      console.log('[bfcache] 캐시된 페이지에서 복원됨. 새로고침 중...');
      window.location.reload();
    }
  });

  // Safari에서 페이지 언로드 시 bfcache 비활성화
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      // bfcache에 저장되려고 할 때 - 캐시 무효화
      console.log('[bfcache] 페이지 숨김 처리');
    }
  });
};

// Service Worker 등록
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && APP_VERSION !== 'dev') {
    try {
      // Vite의 base path를 사용 (GitHub Pages 대응)
      const basePath = import.meta.env.BASE_URL || '/';
      // 캐시 무효화를 위해 버전 쿼리 파라미터 추가
      const swPath = `${basePath}sw.js?v=${APP_VERSION}`.replace(/\/+/g, '/');

      const registration = await navigator.serviceWorker.register(swPath, {
        scope: basePath,
        updateViaCache: 'none', // Service Worker 파일 자체는 캐시하지 않음
      });

      console.log('[SW] 등록 완료:', registration.scope);

      // 업데이트 감지 시 자동 적용
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] 새 버전 다운로드 중...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 버전이 설치됨 - 즉시 활성화
            console.log('[SW] 새 버전 설치 완료! 활성화 중...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Service Worker 업데이트 시 페이지 새로고침
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[SW] 새 버전 활성화됨. 페이지 새로고침...');
        window.location.reload();
      });

      // 페이지 포커스 시 업데이트 확인 (사용자가 탭으로 돌아올 때)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          registration.update();
        }
      });

      return registration;
    } catch (error) {
      console.error('[SW] 등록 실패:', error);
    }
  }
};

// 버전 체크 및 캐시 클리어
const checkVersion = async () => {
  const STORAGE_KEY = 'centumbob_app_version';
  const storedVersion = localStorage.getItem(STORAGE_KEY);

  if (storedVersion && storedVersion !== APP_VERSION && APP_VERSION !== 'dev') {
    console.log('🔄 새 버전 감지! 업데이트 중...', { 이전: storedVersion, 새: APP_VERSION });

    // 새 버전 감지 - 캐시 클리어 후 새로고침
    localStorage.setItem(STORAGE_KEY, APP_VERSION);

    // 모든 캐시 클리어
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ 캐시 삭제 완료');
      } catch (e) {
        console.warn('캐시 삭제 실패:', e);
      }
    }

    // 강제 새로고침 (캐시 무시)
    // location.reload(true)는 deprecated이므로 쿼리 파라미터 추가
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now());
    window.location.href = url.toString();
    return false;
  }

  // 버전 저장
  if (APP_VERSION !== 'dev') {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
  }
  return true;
};

// Safari bfcache 처리
handleBfcache();

// Service Worker 등록 및 버전 체크 후 앱 렌더링
Promise.all([registerServiceWorker(), checkVersion()]).then(([, shouldRender]) => {
  if (shouldRender) {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>,
    );
  }
});

