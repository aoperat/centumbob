import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

// 빌드 버전 (빌드 시 자동 생성)
const APP_VERSION = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';

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

// 버전 체크 후 앱 렌더링
checkVersion().then(shouldRender => {
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

