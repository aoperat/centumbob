import { useState } from 'react';

// 데이터 수집 채널 모달 컴포넌트
function DataSourceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const links = [
    {
      name: '삼촌밥차런치펍',
      url: 'https://pf.kakao.com/_FxbaQC',
      type: 'kakao',
      description: '카카오톡 채널',
    },
    {
      name: '슈마우스만찬센텀점',
      url: 'https://pf.kakao.com/_CiVis',
      type: 'kakao',
      description: '카카오톡 채널',
    },
    {
      name: '큐비e센텀',
      url: 'https://blog.naver.com/dawafood-qubi',
      type: 'naver',
      description: '네이버 블로그',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4">
          <h2 className="text-lg font-bold">데이터 수집 채널</h2>
          <p className="text-sm text-slate-300 mt-1">센텀밥집이 메뉴 정보를 수집하는 출처입니다</p>
        </div>

        {/* 링크 목록 */}
        <div className="p-4 space-y-3">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]
                ${link.type === 'kakao'
                  ? 'bg-[#FEE500] hover:bg-[#FDD835]'
                  : 'bg-[#03C75A] hover:bg-[#02b350]'
                }
              `}
            >
              {/* 아이콘 */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                link.type === 'kakao' ? 'bg-[#3C1E1E]/10' : 'bg-white/20'
              }`}>
                {link.type === 'kakao' ? (
                  <svg className="w-5 h-5 text-[#3C1E1E]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.48 2 11c0 2.84 1.75 5.36 4.39 6.72L5.5 21l3.5-1.28c1.08.3 2.22.47 3.4.47 5.52 0 10-3.48 10-8s-4.48-8-10-8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                )}
              </div>

              {/* 텍스트 */}
              <div className="flex-1">
                <div className={`font-bold ${link.type === 'kakao' ? 'text-[#3C1E1E]' : 'text-white'}`}>
                  {link.name}
                </div>
                <div className={`text-xs ${link.type === 'kakao' ? 'text-[#3C1E1E]/70' : 'text-white/80'}`}>
                  {link.description}
                </div>
              </div>

              {/* 화살표 */}
              <svg
                className={`w-5 h-5 ${link.type === 'kakao' ? 'text-[#3C1E1E]/50' : 'text-white/50'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* 닫기 버튼 */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Footer({ onOpenComplaint, onOpenAdInquiry }) {
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-slate-800 text-slate-300 mt-auto">
        {/* 상단 링크 영역 */}
        <div className="max-w-[1800px] mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {/* 서비스 */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm">서비스</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => setIsLinksModalOpen(true)}
                    className="hover:text-white transition-colors"
                  >
                    데이터 수집 채널
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenComplaint}
                    className="hover:text-white transition-colors"
                  >
                    민원 제출
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenAdInquiry}
                    className="hover:text-white transition-colors"
                  >
                    광고문의
                  </button>
                </li>
              </ul>
            </div>

            {/* 정보 */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm">정보</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    이용안내
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    자주 묻는 질문
                  </a>
                </li>
              </ul>
            </div>

            {/* 법적 고지 */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm">법적 고지</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    이용약관
                  </a>
                </li>
              </ul>
            </div>

            {/* 문의 */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm">문의</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/user/centumbob/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    버그 신고
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@example.com" className="hover:text-white transition-colors">
                    이메일 문의
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 하단 저작권 영역 */}
        <div className="border-t border-slate-700">
          <div className="max-w-[1800px] mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                  센텀밥집
                </span>
                <span>© {currentYear} Centum Bob. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-4">
                <span>v1.0.0</span>
                <span className="text-slate-500">|</span>
                <span>Made with ❤️ in Busan</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 데이터 수집 채널 모달 */}
      <DataSourceModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
      />
    </>
  );
}
