import { useState, useEffect } from 'react';
import { generateBlogPost } from '../utils/api';
import { IconFileText, IconLoader } from './Icons';

const BlogTab = ({ dateRanges }) => {
  const [selectedDay, setSelectedDay] = useState('월');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const days = ['월', '화', '수', '목', '금'];

  // 날짜 범위가 변경되면 첫 번째 항목으로 설정
  useEffect(() => {
    if (dateRanges.length > 0 && !selectedDateRange) {
      setSelectedDateRange(dateRanges[0]);
    }
  }, [dateRanges, selectedDateRange]);

  const handleGenerate = async () => {
    if (!selectedDateRange) {
      alert('날짜 범위를 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await generateBlogPost(selectedDay, selectedDateRange);
      setResult(response);
      alert(`블로그 포스트가 생성되었습니다!\n\n파일: ${response.postPath}\n이미지: ${response.imagePath}`);
    } catch (err) {
      setError(err.message);
      alert(`블로그 생성 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar fade-in bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 text-purple-700 p-1.5 rounded-lg">
                <IconFileText size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">블로그 포스트 생성</h3>
                <p className="text-xs text-slate-500">뷰어의 특정 요일 식단표를 스크린샷으로 생성하고 Jekyll 형식 블로그 포스트를 만듭니다.</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 날짜 범위 선택 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                날짜 범위 선택
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                disabled={isGenerating}
              >
                <option value="">날짜 범위를 선택하세요</option>
                {dateRanges.map((dateRange, idx) => (
                  <option key={idx} value={dateRange}>
                    {dateRange}
                  </option>
                ))}
              </select>
              {selectedDateRange && (
                <p className="mt-1.5 text-xs text-slate-500">
                  선택된 날짜 범위: <span className="font-bold">{selectedDateRange}</span>
                </p>
              )}
            </div>

            {/* 요일 선택 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                요일 선택
              </label>
              <div className="flex gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    disabled={isGenerating}
                    className={`flex-1 py-2 px-3 text-sm rounded-lg font-bold transition-all ${
                      selectedDay === day
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {day}요일
                  </button>
                ))}
              </div>
            </div>

            {/* 생성 버튼 */}
            <div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedDateRange}
                className={`w-full py-2.5 px-5 rounded-lg font-bold text-white text-sm transition-all flex items-center justify-center gap-2 ${
                  isGenerating || !selectedDateRange
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-sm hover:shadow-md'
                }`}
              >
                {isGenerating ? (
                  <>
                    <IconLoader size={16} className="animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <IconFileText size={16} />
                    블로그 포스트 생성
                  </>
                )}
              </button>
            </div>

            {/* 결과 표시 */}
            {result && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-bold text-green-800 mb-1.5 text-sm">생성 완료!</h4>
                <div className="space-y-1 text-xs text-green-700">
                  <p>
                    <span className="font-bold">포스트 파일:</span> {result.postPath}
                  </p>
                  <p>
                    <span className="font-bold">이미지 파일:</span> {result.imagePath}
                  </p>
                  {result.dateInfo && (
                    <p>
                      <span className="font-bold">생성된 날짜:</span> {result.dateInfo.koreanDate}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 에러 표시 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-bold text-red-800 mb-1.5 text-sm">오류 발생</h4>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* 사용 방법 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-sm">
            <IconFileText size={16} />
            사용 방법
          </h4>
          <ol className="space-y-1.5 text-xs text-blue-700 list-decimal list-inside">
            <li>날짜 범위를 선택하세요 (예: "1월 5일 ~ 1월 9일")</li>
            <li>생성할 요일을 선택하세요 (월~금)</li>
            <li>"블로그 포스트 생성" 버튼을 클릭하세요</li>
            <li>생성된 파일은 <code className="bg-blue-100 px-1 rounded">_posts/</code> 폴더에 저장됩니다</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default BlogTab;



