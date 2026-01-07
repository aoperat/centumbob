import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 빌드 버전 (빌드 시 자동 생성)
const APP_VERSION = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';

// 버전 체크 및 캐시 클리어
const checkVersion = async () => {
  const STORAGE_KEY = 'centumbob_app_version';
  const storedVersion = localStorage.getItem(STORAGE_KEY);

  if (storedVersion && storedVersion !== APP_VERSION && APP_VERSION !== 'dev') {
    // 새 버전 감지 - 캐시 클리어 후 새로고침
    localStorage.setItem(STORAGE_KEY, APP_VERSION);

    // Service Worker 캐시 클리어
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // 강제 새로고침 (캐시 무시)
    window.location.reload();
    return false;
  }

  // 버전 저장
  localStorage.setItem(STORAGE_KEY, APP_VERSION);
  return true;
};

// 버전 체크 후 앱 렌더링
checkVersion().then(shouldRender => {
  if (shouldRender) {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
});

