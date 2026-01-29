// Service Worker - 자동 캐시 관리 및 업데이트
// 버전은 빌드 시 자동으로 주입됩니다
const CACHE_VERSION = '__APP_VERSION__';
const CACHE_NAME = `centumbob-v${CACHE_VERSION}`;

// Base path 자동 감지 (GitHub Pages 대응)
const getBasePath = () => {
  const path = self.location.pathname;
  const match = path.match(/^\/[^/]+\//);
  return match ? match[0] : '/';
};

const BASE_PATH = getBasePath();

// 캐시할 기본 리소스
const STATIC_CACHE = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
];

// 설치 이벤트 - 새 버전의 Service Worker가 설치될 때
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);

  // 즉시 활성화 (대기하지 않음)
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static resources');
      return cache.addAll(STATIC_CACHE).catch((err) => {
        console.error('[SW] Cache addAll failed:', err);
      });
    })
  );
});

// 활성화 이벤트 - 새 Service Worker가 활성화될 때
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);

  event.waitUntil(
    Promise.all([
      // 이전 버전의 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트를 즉시 제어
      self.clients.claim(),
    ])
  );
});

// Fetch 이벤트 - 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 같은 origin만 처리
  if (url.origin !== location.origin) {
    return;
  }

  // Service Worker 자체는 캐시하지 않음
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
    return;
  }

  // HTML 파일은 항상 네트워크 우선 (Network First) + 캐시 무시
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          // 성공 시 캐시 업데이트
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 제공
          return caches.match(request);
        })
    );
    return;
  }

  // 정적 리소스 (JS, CSS, 이미지)는 캐시 우선 (Cache First)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // 유효한 응답만 캐시
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // API 요청 및 기타 요청은 네트워크만 사용 (캐시 안 함)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('menu-data.json')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
    return;
  }
});

// 메시지 이벤트 - 클라이언트로부터 메시지 수신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
