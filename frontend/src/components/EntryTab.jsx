import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { IconCheck, IconUpload, IconRefreshCw, IconWand2, IconDownload } from './Icons';
import MenuListEditor from './MenuListEditor';
import { analyzeImage, loadMenuData, fetchImageFromWebhook } from '../utils/api';

const EntryTab = forwardRef(({ 
  restaurants, 
  dateRanges, 
  selectedCafeteria, 
  setSelectedCafeteria,
  selectedDateRange,
  setSelectedDateRange,
  onSave
}, ref) => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [savedImageUrl, setSavedImageUrl] = useState(null); // 저장된 이미지 URL
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prices, setPrices] = useState({ lunch: "", dinner: "" });
  const [menuGrid, setMenuGrid] = useState({
    "월": { lunch: [], dinner: [] },
    "화": { lunch: [], dinner: [] },
    "수": { lunch: [], dinner: [] },
    "목": { lunch: [], dinner: [] },
    "금": { lunch: [], dinner: [] },
  });
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingWebhook, setIsFetchingWebhook] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState({}); // 식당 상세 정보 캐시

  // 식당 목록 상세 정보 불러오기
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        const response = await fetch('/api/restaurants');
        if (response.ok) {
          const data = await response.json();
          // 식당 이름을 키로 하는 객체로 변환
          const details = data.reduce((acc, curr) => {
            acc[curr.name] = curr;
            return acc;
          }, {});
          setRestaurantDetails(details);
        }
      } catch (error) {
        console.error('식당 상세 정보 로드 실패:', error);
      }
    };
    fetchRestaurantDetails();
  }, []);

  // 식당/날짜 변경 시 데이터 자동 불러오기
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCafeteria || !selectedDateRange) return;

      setIsLoading(true);
      try {
        const data = await loadMenuData(selectedCafeteria, selectedDateRange);
        
        if (data) {
          // 데이터가 있으면 저장된 데이터 사용
          setPrices({
            lunch: data.price_lunch || "",
            dinner: data.price_dinner || ""
          });

          // 메뉴 정보 설정
          if (data.menus) {
            setMenuGrid(data.menus);
          }

          // 이미지 불러오기
          if (data.imageUrl) {
            // 이미지 URL 저장 (프록시를 통해 접근)
            setSavedImageUrl(data.imageUrl);
            setImagePreview(data.imageUrl);
            // 이미지 파일은 null로 유지 (서버에서 제공하는 URL 사용)
            setImageFile(null);
          } else {
            setImagePreview(null);
            setImageFile(null);
            setSavedImageUrl(null);
          }
        } else {
          // 데이터가 없으면 초기화하되, 식당 기본 정보가 있으면 채워넣기
          const detail = restaurantDetails[selectedCafeteria];
          
          setPrices({ 
            lunch: detail?.price_lunch || "", 
            dinner: detail?.price_dinner || "" 
          });
          
          setMenuGrid({
            "월": { lunch: [], dinner: [] },
            "화": { lunch: [], dinner: [] },
            "수": { lunch: [], dinner: [] },
            "목": { lunch: [], dinner: [] },
            "금": { lunch: [], dinner: [] },
          });
          setImagePreview(null);
          setImageFile(null);
        }
      } catch (error) {
        console.error('데이터 불러오기 오류:', error);
        // 에러가 발생해도 폼은 초기화 상태로 유지
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCafeteria, selectedDateRange, restaurantDetails]);

  // 이미지 파일 처리 공통 함수
  const processImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  // 클립보드 이미지 붙여넣기 처리
  useEffect(() => {
    const handlePaste = async (e) => {
      // 입력 필드에 포커스가 있으면 무시
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // 이미지 타입 확인
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    };

    // 전역 paste 이벤트 리스너 추가
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile) return alert("이미지를 먼저 업로드해주세요.");
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(imageFile);
      setPrices(result.price);
      setMenuGrid(result.menus);
    } catch (error) {
      alert("분석 실패: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 웹훅에서 이미지 가져오기
  const handleFetchFromWebhook = async () => {
    // 현재 선택된 식당의 웹훅 URL 확인
    const currentRestaurant = restaurantDetails[selectedCafeteria];

    if (!currentRestaurant?.webhook_url) {
      alert('선택한 식당에 웹훅 URL이 설정되어 있지 않습니다.\n기준 정보 관리에서 웹훅 URL을 설정해주세요.');
      return;
    }

    setIsFetchingWebhook(true);
    try {
      const result = await fetchImageFromWebhook(
        currentRestaurant.webhook_url,
        selectedCafeteria
      );

      if (result.success && result.imageData) {
        // Base64 데이터를 File 객체로 변환
        const response = await fetch(result.imageData);
        const blob = await response.blob();
        const file = new File(
          [blob],
          `webhook_image_${Date.now()}.${result.extension}`,
          { type: result.contentType }
        );

        // 기존 이미지 처리 로직 사용
        processImageFile(file);

        console.log('[웹훅] 이미지 가져오기 성공:', result.size, 'bytes');
      }
    } catch (error) {
      console.error('[웹훅] 이미지 가져오기 실패:', error);
      alert('웹훅에서 이미지를 가져오는데 실패했습니다.\n' + error.message);
    } finally {
      setIsFetchingWebhook(false);
    }
  };

  const handleMenuChange = (day, type, newItems) => {
    setMenuGrid(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: newItems }
    }));
  };

  const handleSave = () => {
    const finalData = {
      name: selectedCafeteria,
      date: selectedDateRange,
      price: prices,
      menus: menuGrid
    };
    // imageFile이 있으면 새 이미지, 없으면 savedImageUrl이 있어도 기존 이미지 유지
    // imageFile이 null이고 savedImageUrl이 있으면 기존 이미지 유지 (서버에서 처리)
    onSave(finalData, imageFile);
  };

  // ref를 통해 부모 컴포넌트에서 저장 함수 호출 가능하도록
  useImperativeHandle(ref, () => ({
    save: handleSave
  }));

  const days = ["월", "화", "수", "목", "금"];

  return (
    <div ref={containerRef} className="flex w-full h-full fade-in" tabIndex={-1}>
      {/* 왼쪽 패널: 이미지 및 설정 */}
      <div className="w-4/12 bg-white border-r border-slate-200 flex flex-col overflow-y-auto custom-scrollbar z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <IconCheck size={16} className="text-green-600" />
              Target Selection
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">식당 선택</label>
                <select
                  value={selectedCafeteria}
                  onChange={(e) => setSelectedCafeteria(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {restaurants.map((res, i) => (
                    <option key={i} value={res}>{res}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">날짜 범위 선택</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {dateRanges.map((date, i) => (
                    <option key={i} value={date}>{date}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <IconUpload size={16} className="text-blue-600" />
                Source Image
              </h2>
              {imagePreview && (
                <button 
                  onClick={() => { 
                    setImageFile(null); 
                    setImagePreview(null); 
                    setSavedImageUrl(null);
                  }} 
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  삭제
                </button>
              )}
            </div>

            {/* 웹훅 버튼 - 이미지가 없고 웹훅 URL이 설정된 경우에만 표시 */}
            {!imagePreview && restaurantDetails[selectedCafeteria]?.webhook_url && (
              <button
                onClick={handleFetchFromWebhook}
                disabled={isFetchingWebhook}
                className={`w-full py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all mb-3
                  ${isFetchingWebhook
                    ? "bg-slate-400 cursor-wait"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:scale-[1.02]"
                  }`}
              >
                {isFetchingWebhook ? (
                  <><IconRefreshCw size={18} className="animate-spin" /> 가져오는 중...</>
                ) : (
                  <><IconDownload size={18} /> 웹훅에서 이미지 가져오기</>
                )}
              </button>
            )}

            {!imagePreview ? (
              <label className="block w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group">
                <div className="bg-white p-3 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <IconUpload size={24} className="text-slate-400 group-hover:text-blue-500" />
                </div>
                <span className="text-slate-500 text-sm font-medium group-hover:text-blue-600">이미지 업로드</span>
                <span className="text-slate-400 text-xs mt-1">또는 Ctrl+V로 붙여넣기</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!imageFile || isAnalyzing}
              className={`w-full py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all
                ${!imageFile
                  ? "bg-slate-300 cursor-not-allowed"
                  : isAnalyzing
                    ? "bg-slate-800 cursor-wait"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02]"
                }`}
            >
              {isAnalyzing ? (
                <><IconRefreshCw size={18} className="animate-spin" /> 분석 중...</>
              ) : (
                <><IconWand2 size={18} /> 메뉴 추출하기</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽 패널: 에디터 */}
      <div className="w-8/12 bg-slate-50 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-[1200px] mx-auto w-full">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">메뉴 데이터 편집</h2>
              <p className="text-slate-500 text-sm mt-1">추출된 메뉴를 확인하고 수정하세요. 항목을 클릭하여 수정할 수 있습니다.</p>
            </div>
          </div>

          {/* 가격 정보 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">L</div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 block mb-1">점심 가격</label>
                <input
                  type="text"
                  value={prices.lunch}
                  onChange={(e) => setPrices({ ...prices, lunch: e.target.value })}
                  className="w-full font-bold text-slate-800 outline-none border-b border-transparent focus:border-blue-500 transition-colors placeholder-slate-300"
                  placeholder="가격 입력"
                />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">D</div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 block mb-1">저녁 가격</label>
                <input
                  type="text"
                  value={prices.dinner}
                  onChange={(e) => setPrices({ ...prices, dinner: e.target.value })}
                  className="w-full font-bold text-slate-800 outline-none border-b border-transparent focus:border-blue-500 transition-colors placeholder-slate-300"
                  placeholder="가격 입력"
                />
              </div>
            </div>
          </div>

          {/* 요일별 메뉴 테이블 (리스트 에디터 적용) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-20 px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase border-r border-slate-200">구분</th>
                    {days.map(day => (
                      <th key={day} className="px-4 py-3 text-center text-sm font-bold text-slate-700 border-r border-slate-200 last:border-r-0">
                        {day}요일
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* 점심 행 */}
                  <tr>
                    <th className="bg-slate-50/50 border-r border-slate-200 align-top py-6">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">점심</span>
                      </div>
                    </th>
                    {days.map(day => (
                      <td key={day} className="border-r border-slate-200 last:border-r-0 p-0 align-top h-80 bg-white hover:bg-slate-50/30 transition-colors">
                        <MenuListEditor
                          items={menuGrid[day].lunch}
                          onChange={(newItems) => handleMenuChange(day, 'lunch', newItems)}
                        />
                      </td>
                    ))}
                  </tr>
                  {/* 저녁 행 */}
                  <tr>
                    <th className="bg-slate-50/50 border-r border-slate-200 align-top py-6">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">저녁</span>
                      </div>
                    </th>
                    {days.map(day => (
                      <td key={day} className="border-r border-slate-200 last:border-r-0 p-0 align-top h-80 bg-white hover:bg-slate-50/30 transition-colors">
                        <MenuListEditor
                          items={menuGrid[day].dinner}
                          onChange={(newItems) => handleMenuChange(day, 'dinner', newItems)}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EntryTab.displayName = 'EntryTab';

export default EntryTab;

