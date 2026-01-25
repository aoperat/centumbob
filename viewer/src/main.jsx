import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

// 빌드 버전 (빌드 시 자동 생성)
const APP_VERSION = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';

// Service Worker 등록
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && APP_VERSION !== 'dev') {
    try {
      // Vite의 base path를 사용 (GitHub Pages 대응)
      const basePath = import.meta.env.BASE_URL || '/';
      const swPath = `${basePath}sw.js`.replace(/\/+/g, '/'); // 중복 슬래시 제거

      const registration = await navigator.serviceWorker.register(swPath, {
        scope: basePath,
      });

      console.log('[Main] Service Worker 등록 성공:', registration.scope);

      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[Main] 새 Service Worker 발견');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 버전이 설치되었고, 이전 버전이 활성화 중
            console.log('[Main] 새 버전 설치 완료! 자동 업데이트 중...');

            // Service Worker에게 즉시 활성화 요청
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Service Worker가 제어권을 가져올 때 페이지 새로고침
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[Main] Service Worker 업데이트됨. 페이지 새로고침...');
        window.location.reload();
      });

      // 주기적으로 업데이트 확인 (1시간마다)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      return registration;
    } catch (error) {
      console.error('[Main] Service Worker 등록 실패:', error);
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

