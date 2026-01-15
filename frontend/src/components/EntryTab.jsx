import {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  IconCheck,
  IconUpload,
  IconRefreshCw,
  IconWand2,
  IconDownload,
  IconX,
  IconTrash,
} from "./Icons";
import MenuListEditor from "./MenuListEditor";
import {
  analyzeImage,
  loadMenuData,
  fetchImageFromWebhook,
  fetchJsonFromWebhook,
  deleteAllMenuDataByRestaurant,
} from "../utils/api";

const EntryTab = forwardRef(
  (
    {
      restaurants,
      dateRanges,
      selectedCafeteria,
      setSelectedCafeteria,
      selectedDateRange,
      setSelectedDateRange,
      onSave,
    },
    ref
  ) => {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [savedImageUrl, setSavedImageUrl] = useState(null); // 저장된 이미지 URL
    const [imageFiles, setImageFiles] = useState({}); // 요일별 이미지 파일 (개별 요일 모드용)
    const [imagePreviews, setImagePreviews] = useState({}); // 요일별 이미지 미리보기
    const [savedImageUrls, setSavedImageUrls] = useState({}); // 요일별 저장된 이미지 URL
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [menuGrid, setMenuGrid] = useState({
      월: { lunch: [], dinner: [] },
      화: { lunch: [], dinner: [] },
      수: { lunch: [], dinner: [] },
      목: { lunch: [], dinner: [] },
      금: { lunch: [], dinner: [] },
    });
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingWebhook, setIsFetchingWebhook] = useState(false);
    const [isFetchingJson, setIsFetchingJson] = useState(false);
    const [restaurantDetails, setRestaurantDetails] = useState({}); // 식당 상세 정보 캐시
    const [targetDay, setTargetDay] = useState("월"); // 업데이트할 대상 요일 (개별요일 모드용)
    const [modalImage, setModalImage] = useState(null); // 이미지 확대 모달용
    const [isDeleting, setIsDeleting] = useState(false); // 데이터 삭제 로딩 상태
    const [excludedMenuItems, setExcludedMenuItems] = useState([]); // GPT 제외 항목 목록

    // 식당 목록 상세 정보 불러오기
    useEffect(() => {
      const fetchRestaurantDetails = async () => {
        try {
          const response = await fetch("/api/restaurants");
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
          console.error("식당 상세 정보 로드 실패:", error);
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
            // 메뉴 정보 설정
            if (data.menus) {
              setMenuGrid(data.menus);
            }
            // 제외 항목 목록 설정
            if (data.excluded_menu_items) {
              setExcludedMenuItems(data.excluded_menu_items);
            } else {
              setExcludedMenuItems([]);
            }

            // 이미지 불러오기
            if (data.imageUrls) {
              // 요일별 이미지 URL
              setSavedImageUrls(data.imageUrls);
              const previews = {};
              Object.keys(data.imageUrls).forEach((day) => {
                previews[day] = data.imageUrls[day];
              });
              setImagePreviews(previews);
              // 전체 요일 모드는 첫 번째 이미지 사용
              if (data.imageUrls["월"]) {
                setSavedImageUrl(data.imageUrls["월"]);
                setImagePreview(data.imageUrls["월"]);
              }
            } else if (data.imageUrl) {
              // 하위 호환성: 단일 이미지 URL
              setSavedImageUrl(data.imageUrl);
              setImagePreview(data.imageUrl);
              setImageFile(null);
            } else {
              setImagePreview(null);
              setImageFile(null);
              setSavedImageUrl(null);
              setImagePreviews({});
              setSavedImageUrls({});
            }
          } else {
            // 데이터가 없으면 초기화
            setMenuGrid({
              월: { lunch: [], dinner: [] },
              화: { lunch: [], dinner: [] },
              수: { lunch: [], dinner: [] },
              목: { lunch: [], dinner: [] },
              금: { lunch: [], dinner: [] },
            });
            setExcludedMenuItems([]);
            setImagePreview(null);
            setImageFile(null);
          }
        } catch (error) {
          console.error("데이터 불러오기 오류:", error);
          // 에러가 발생해도 폼은 초기화 상태로 유지
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, [selectedCafeteria, selectedDateRange, restaurantDetails]);

    // 이미지 파일 처리 공통 함수
    const processImageFile = useCallback((file) => {
      if (file && file.type.startsWith("image/")) {
        const currentRestaurant = restaurantDetails[selectedCafeteria];
        const useAllDays =
          currentRestaurant?.use_all_days === undefined
            ? true
            : currentRestaurant.use_all_days === 1;

        // 개별 요일 모드: 선택된 요일에 이미지 설정
        if (!useAllDays && targetDay) {
          setImageFiles((prev) => ({ ...prev, [targetDay]: file }));
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreviews((prev) => ({
              ...prev,
              [targetDay]: reader.result,
            }));
          };
          reader.readAsDataURL(file);
          return; // 요일별 이미지만 설정하고 종료
        }

        // 전체 요일 모드: 하나의 이미지 사용
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
    }, [restaurantDetails, selectedCafeteria, targetDay]);

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
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // 이미지 타입 확인
          if (item.type.indexOf("image") !== -1) {
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
      window.addEventListener("paste", handlePaste);

      return () => {
        window.removeEventListener("paste", handlePaste);
      };
    }, [processImageFile]);

    const handleAnalyze = async () => {
      const currentRestaurant = restaurantDetails[selectedCafeteria];
      const useAllDays =
        currentRestaurant?.use_all_days === undefined
          ? true
          : currentRestaurant.use_all_days === 1;

      // 분석할 이미지 결정: 새로 업로드한 파일 또는 저장된 이미지
      let fileToAnalyze = null;

      // 개별 요일 모드일 때 해당 요일 이미지 확인
      if (!useAllDays && targetDay) {
        if (imageFiles[targetDay]) {
          fileToAnalyze = imageFiles[targetDay];
        } else if (imagePreviews[targetDay] || savedImageUrls[targetDay]) {
          // 저장된 이미지 URL을 File로 변환
          const imageUrl =
            imagePreviews[targetDay] || savedImageUrls[targetDay];
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            fileToAnalyze = new File([blob], `saved_image_${targetDay}.jpg`, {
              type: blob.type,
            });
          } catch (e) {
            console.error("저장된 이미지 로드 실패:", e);
          }
        }
      } else {
        // 전체 요일 모드
        fileToAnalyze = imageFile;
        if (!fileToAnalyze && (imagePreview || savedImageUrl)) {
          const imageUrl = imagePreview || savedImageUrl;
          // data URL이 아닌 경우(서버 URL)만 fetch
          if (!imageUrl.startsWith("data:")) {
            try {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              fileToAnalyze = new File([blob], "saved_image.jpg", {
                type: blob.type,
              });
            } catch (e) {
              console.error("저장된 이미지 로드 실패:", e);
            }
          }
        }
      }

      if (!fileToAnalyze) return alert("이미지를 먼저 업로드해주세요.");
      setIsAnalyzing(true);
      try {
        const result = await analyzeImage(fileToAnalyze);

        if (!useAllDays) {
          // 개별 요일 모드: 선택된 요일만 업데이트
          // GPT 결과에서 데이터가 있는 요일 찾기
          const daysWithData = Object.keys(result.menus).filter((day) => {
            const dayMenu = result.menus[day];
            return (
              (dayMenu.lunch && dayMenu.lunch.length > 0) ||
              (dayMenu.dinner && dayMenu.dinner.length > 0)
            );
          });

          console.log(
            "[분석] 개별 요일 모드, 대상 요일:",
            targetDay,
            "추출된 요일:",
            daysWithData
          );

          if (daysWithData.length === 0) {
            alert(
              "이미지에서 메뉴를 추출하지 못했습니다. 이미지를 확인해주세요."
            );
          } else if (daysWithData.length === 1) {
            const sourceDay = daysWithData[0];
            console.log(
              "[분석] 하루치 데이터 발견:",
              sourceDay,
              "→",
              targetDay,
              "로 적용"
            );
            setMenuGrid((prev) => ({
              ...prev,
              [targetDay]: result.menus[sourceDay],
            }));
          } else {
            const sourceDay = daysWithData.includes(targetDay)
              ? targetDay
              : daysWithData[0];
            console.log(
              "[분석] 여러 요일 데이터 발견, 사용할 요일:",
              sourceDay,
              "→",
              targetDay
            );
            setMenuGrid((prev) => ({
              ...prev,
              [targetDay]: result.menus[sourceDay],
            }));
          }
        } else {
          // 전체 요일 모드: 기존 동작
          setMenuGrid(result.menus);
        }
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
        alert(
          "선택한 식당에 웹훅 URL이 설정되어 있지 않습니다.\n기준 정보 관리에서 웹훅 URL을 설정해주세요."
        );
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

          console.log("[웹훅] 이미지 가져오기 성공:", result.size, "bytes");
        }
      } catch (error) {
        console.error("[웹훅] 이미지 가져오기 실패:", error);
        alert("웹훅에서 이미지를 가져오는데 실패했습니다.\n" + error.message);
      } finally {
        setIsFetchingWebhook(false);
      }
    };

    // JSON 데이터를 메뉴 그리드 형식으로 변환
    const parseJsonToMenuGrid = (jsonData) => {
      try {
        // 배열인 경우 첫 번째 요소 사용
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

        if (!data || !data.weeklyMenu) {
          throw new Error("JSON 데이터에 weeklyMenu가 없습니다.");
        }

        const weeklyMenu = data.weeklyMenu;
        const days = ["월", "화", "수", "목", "금"];
        const newMenuGrid = {
          월: { lunch: [], dinner: [] },
          화: { lunch: [], dinner: [] },
          수: { lunch: [], dinner: [] },
          목: { lunch: [], dinner: [] },
          금: { lunch: [], dinner: [] },
        };

        // 각 요일별로 메뉴 항목 변환
        days.forEach((day) => {
          const dayData = weeklyMenu[day];
          if (
            dayData &&
            dayData.menuItems &&
            Array.isArray(dayData.menuItems)
          ) {
            // menuItems를 점심 메뉴로 설정 (점심/저녁 구분이 없으므로 점심에만 입력)
            newMenuGrid[day].lunch = dayData.menuItems;
          }
        });

        return newMenuGrid;
      } catch (error) {
        console.error("[JSON 파싱] 오류:", error);
        throw new Error(`JSON 데이터 파싱 실패: ${error.message}`);
      }
    };

    // 웹훅에서 JSON 가져오기
    const handleFetchJsonFromWebhook = async () => {
      // 현재 선택된 식당의 웹훅 URL 사용
      const currentRestaurant = restaurantDetails[selectedCafeteria];

      if (!currentRestaurant?.webhook_url) {
        alert(
          "선택한 식당에 웹훅 URL이 설정되어 있지 않습니다.\n기준 정보 관리에서 웹훅 URL을 설정해주세요."
        );
        return;
      }

      setIsFetchingJson(true);
      try {
        const result = await fetchJsonFromWebhook(
          currentRestaurant.webhook_url
        );

        if (result.success && result.data) {
          console.log("[웹훅 JSON] 가져온 데이터:", result.data);

          // JSON 데이터를 메뉴 그리드 형식으로 변환
          const parsedMenuGrid = parseJsonToMenuGrid(result.data);

          // 메뉴 그리드에 적용
          setMenuGrid(parsedMenuGrid);

          alert("웹훅에서 JSON 데이터를 가져와 메뉴에 입력했습니다.");
        }
      } catch (error) {
        console.error("[웹훅 JSON] 가져오기 실패:", error);
        alert(
          "웹훅에서 JSON 데이터를 가져오는데 실패했습니다.\n" + error.message
        );
      } finally {
        setIsFetchingJson(false);
      }
    };

    const handleMenuChange = (day, type, newItems) => {
      setMenuGrid((prev) => ({
        ...prev,
        [day]: { ...prev[day], [type]: newItems },
      }));
    };

    // 식당의 모든 데이터 삭제
    const handleDeleteAllData = async () => {
      if (!selectedCafeteria) return;

      const confirmed = confirm(
        `정말 '${selectedCafeteria}' 식당의 모든 메뉴 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      );

      if (!confirmed) return;

      setIsDeleting(true);
      try {
        await deleteAllMenuDataByRestaurant(selectedCafeteria);

        // 데이터 초기화
        setMenuGrid({
          월: { lunch: [], dinner: [] },
          화: { lunch: [], dinner: [] },
          수: { lunch: [], dinner: [] },
          목: { lunch: [], dinner: [] },
          금: { lunch: [], dinner: [] },
        });
        setImagePreview(null);
        setImageFile(null);
        setSavedImageUrl(null);
        setImagePreviews({});
        setSavedImageUrls({});
        setImageFiles({});

        alert("식당의 모든 메뉴 데이터가 삭제되었습니다.");
      } catch (error) {
        console.error("데이터 삭제 오류:", error);
        alert("데이터 삭제 실패: " + error.message);
      } finally {
        setIsDeleting(false);
      }
    };

    const handleSave = async () => {
      const currentRestaurant = restaurantDetails[selectedCafeteria];
      const useAllDays =
        currentRestaurant?.use_all_days === undefined
          ? true
          : currentRestaurant.use_all_days === 1;

      const finalData = {
        name: selectedCafeteria,
        date: selectedDateRange,
        menus: menuGrid,
        use_all_days: useAllDays,
        excluded_menu_items: excludedMenuItems,
      };

      if (useAllDays) {
        // 전체 요일 모드: 하나의 이미지
        onSave(finalData, imageFile, {});
      } else {
        // 개별 요일 모드: 요일별 이미지
        onSave(finalData, null, imageFiles);
      }
    };

    // ref를 통해 부모 컴포넌트에서 저장 함수 호출 가능하도록
    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    const days = ["월", "화", "수", "목", "금"];

    return (
      <div
        ref={containerRef}
        className="flex w-full h-full fade-in"
        tabIndex={-1}
      >
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
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    식당 선택
                  </label>
                  <select
                    value={selectedCafeteria}
                    onChange={(e) => setSelectedCafeteria(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {restaurants.map((res, i) => (
                      <option key={i} value={res}>
                        {res}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    날짜 범위 선택
                  </label>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {dateRanges.map((date, i) => (
                      <option key={i} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const currentRestaurant = restaurantDetails[selectedCafeteria];
              const useAllDays =
                currentRestaurant?.use_all_days === undefined
                  ? true
                  : currentRestaurant.use_all_days === 1;

              // 개별요일 모드일 때 현재 선택된 요일의 이미지
              const currentDayImage = !useAllDays
                ? imagePreviews[targetDay] || savedImageUrls[targetDay]
                : null;
              // 전체요일 모드일 때 이미지
              const allDaysImage = useAllDays ? imagePreview : null;
              // 현재 표시할 이미지
              const displayImage = useAllDays ? allDaysImage : currentDayImage;
              // 분석 가능한 이미지가 있는지
              const hasAnalyzableImage = useAllDays
                ? imageFile || imagePreview || savedImageUrl
                : imageFiles[targetDay] ||
                  imagePreviews[targetDay] ||
                  savedImageUrls[targetDay];

              return (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <IconUpload size={16} className="text-blue-600" />
                      Source Image
                    </h2>
                    {displayImage && (
                      <button
                        onClick={() => {
                          if (useAllDays) {
                            setImageFile(null);
                            setImagePreview(null);
                            setSavedImageUrl(null);
                          } else {
                            const dayToDelete = targetDay;
                            console.log("[삭제] 요일:", dayToDelete);
                            setImageFiles((prev) => {
                              const newFiles = { ...prev };
                              delete newFiles[dayToDelete];
                              return newFiles;
                            });
                            setImagePreviews((prev) => {
                              const newPreviews = { ...prev };
                              delete newPreviews[dayToDelete];
                              return newPreviews;
                            });
                            setSavedImageUrls((prev) => {
                              const newUrls = { ...prev };
                              delete newUrls[dayToDelete];
                              return newUrls;
                            });
                          }
                        }}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {/* 개별요일 모드: 요일 선택 */}
                  {!useAllDays && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 font-medium">
                        요일 선택:
                      </span>
                      <select
                        value={targetDay}
                        onChange={(e) => setTargetDay(e.target.value)}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {days.map((day) => (
                          <option key={day} value={day}>
                            {day}요일
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 웹훅 이미지 버튼 - webhook_type이 'image'인 경우에만 표시 */}
                  {!displayImage &&
                    restaurantDetails[selectedCafeteria]?.webhook_url &&
                    restaurantDetails[selectedCafeteria]?.webhook_type ===
                      "image" && (
                      <button
                        onClick={handleFetchFromWebhook}
                        disabled={isFetchingWebhook}
                        className={`w-full py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all mb-3
                      ${
                        isFetchingWebhook
                          ? "bg-slate-400 cursor-wait"
                          : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:shadow-lg hover:scale-[1.02]"
                      }`}
                      >
                        {isFetchingWebhook ? (
                          <>
                            <IconRefreshCw size={18} className="animate-spin" />{" "}
                            가져오는 중...
                          </>
                        ) : (
                          <>
                            <IconDownload size={18} /> 웹훅에서 이미지 가져오기
                          </>
                        )}
                      </button>
                    )}

                  {!displayImage ? (
                    <label className="block w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group">
                      <div className="bg-white p-3 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                        <IconUpload
                          size={24}
                          className="text-slate-400 group-hover:text-blue-500"
                        />
                      </div>
                      <span className="text-slate-500 text-sm font-medium group-hover:text-blue-600">
                        {useAllDays
                          ? "이미지 업로드"
                          : `${targetDay}요일 이미지 업로드`}
                      </span>
                      <span className="text-slate-400 text-xs mt-1">
                        또는 Ctrl+V로 붙여넣기
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  ) : (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={displayImage}
                        alt="Preview"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!hasAnalyzableImage || isAnalyzing}
                    className={`w-full py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all
                    ${
                      !hasAnalyzableImage
                        ? "bg-slate-300 cursor-not-allowed"
                        : isAnalyzing
                        ? "bg-slate-800 cursor-wait"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02]"
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <IconRefreshCw size={18} className="animate-spin" />{" "}
                        분석 중...
                      </>
                    ) : (
                      <>
                        <IconWand2 size={18} />{" "}
                        {useAllDays
                          ? "메뉴 추출하기"
                          : `${targetDay}요일 메뉴 추출`}
                      </>
                    )}
                  </button>

                  {/* 웹훅 JSON 가져오기 버튼 - webhook_type이 'json'인 경우에만 표시 */}
                  {restaurantDetails[selectedCafeteria]?.webhook_url &&
                    restaurantDetails[selectedCafeteria]?.webhook_type ===
                      "json" && (
                      <button
                        onClick={handleFetchJsonFromWebhook}
                        disabled={isFetchingJson}
                        className={`w-full py-2.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all text-sm
                      ${
                        isFetchingJson
                          ? "bg-slate-800 cursor-wait"
                          : "bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-lg hover:scale-[1.02]"
                      }`}
                      >
                        {isFetchingJson ? (
                          <>
                            <IconRefreshCw size={16} className="animate-spin" />{" "}
                            JSON 가져오는 중...
                          </>
                        ) : (
                          <>
                            <IconDownload size={16} /> 웹훅에서 JSON 가져오기
                          </>
                        )}
                      </button>
                    )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 오른쪽 패널: 에디터 */}
        <div className="w-8/12 bg-slate-50 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1200px] mx-auto w-full">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  메뉴 데이터 편집
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  추출된 메뉴를 확인하고 수정하세요. 항목을 클릭하여 수정할 수
                  있습니다.
                </p>
              </div>
              {selectedCafeteria && (
                <button
                  onClick={handleDeleteAllData}
                  disabled={isDeleting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                    isDeleting
                      ? "bg-slate-300 text-slate-500 cursor-wait"
                      : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
                  }`}
                >
                  <IconTrash size={16} />
                  {isDeleting ? "삭제 중..." : "식당 데이터 모두 삭제"}
                </button>
              )}
            </div>

            {/* 요일별 메뉴 테이블 (리스트 에디터 적용) - 항상 월~금 전체 표시 */}
            {(() => {
              const currentRestaurant = restaurantDetails[selectedCafeteria];
              const useAllDays =
                currentRestaurant?.use_all_days === undefined
                  ? true
                  : currentRestaurant.use_all_days === 1;

              // 요일별 이미지 업로드 핸들러
              const handleDayImageUpload = (day, file) => {
                if (file && file.type.startsWith("image/")) {
                  setImageFiles((prev) => ({ ...prev, [day]: file }));
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreviews((prev) => ({
                      ...prev,
                      [day]: reader.result,
                    }));
                  };
                  reader.readAsDataURL(file);
                }
              };

              const handleDayImageRemove = (day) => {
                setImageFiles((prev) => {
                  const newFiles = { ...prev };
                  delete newFiles[day];
                  return newFiles;
                });
                setImagePreviews((prev) => {
                  const newPreviews = { ...prev };
                  delete newPreviews[day];
                  return newPreviews;
                });
                setSavedImageUrls((prev) => {
                  const newUrls = { ...prev };
                  delete newUrls[day];
                  return newUrls;
                });
              };

              const handleExcludedItemToggle = (item) => {
                setExcludedMenuItems((prev) => {
                  if (prev.includes(item)) {
                    return prev.filter((i) => i !== item);
                  } else {
                    return [...prev, item];
                  }
                });
              };

              return (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="w-20 px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase border-r border-slate-200">
                              구분
                            </th>
                            {days.map((day) => (
                              <th
                                key={day}
                                className="px-4 py-3 text-center text-sm font-bold text-slate-700 border-r border-slate-200 last:border-r-0"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <span>{day}요일</span>
                                  {!useAllDays && (
                                    <div className="mt-1">
                                      {imagePreviews[day] ||
                                      savedImageUrls[day] ? (
                                        <div className="relative group">
                                          <img
                                            src={
                                              imagePreviews[day] ||
                                              savedImageUrls[day]
                                            }
                                            alt={`${day}요일 이미지`}
                                            className="w-16 h-16 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() =>
                                              setModalImage(
                                                imagePreviews[day] ||
                                                  savedImageUrls[day]
                                              )
                                            }
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDayImageRemove(day);
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 z-10 shadow-md"
                                            title="이미지 삭제"
                                          >
                                            <IconX size={12} />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="cursor-pointer">
                                          <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                                            <IconUpload
                                              size={16}
                                              className="text-slate-400"
                                            />
                                          </div>
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files[0];
                                              if (file)
                                                handleDayImageUpload(day, file);
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* 점심 행 */}
                          <tr>
                            <th className="bg-slate-50/50 border-r border-slate-200 align-top py-6">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                  점심
                                </span>
                              </div>
                            </th>
                            {days.map((day) => (
                              <td
                                key={day}
                                className="border-r border-slate-200 last:border-r-0 p-0 align-top h-80 bg-white hover:bg-slate-50/30 transition-colors"
                              >
                                <MenuListEditor
                                  items={menuGrid[day].lunch}
                                  onChange={(newItems) =>
                                    handleMenuChange(day, "lunch", newItems)
                                  }
                                  excludedMenuItems={excludedMenuItems}
                                  onExcludedToggle={handleExcludedItemToggle}
                                />
                              </td>
                            ))}
                          </tr>
                          {/* 저녁 행 */}
                          <tr>
                            <th className="bg-slate-50/50 border-r border-slate-200 align-top py-6">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                  저녁
                                </span>
                              </div>
                            </th>
                            {days.map((day) => (
                              <td
                                key={day}
                                className="border-r border-slate-200 last:border-r-0 p-0 align-top h-80 bg-white hover:bg-slate-50/30 transition-colors"
                              >
                                <MenuListEditor
                                  items={menuGrid[day].dinner}
                                  onChange={(newItems) =>
                                    handleMenuChange(day, "dinner", newItems)
                                  }
                                  excludedMenuItems={excludedMenuItems}
                                  onExcludedToggle={handleExcludedItemToggle}
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* 이미지 확대 모달 */}
        {modalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setModalImage(null)}
          >
            <div className="relative max-w-7xl max-h-full">
              <button
                onClick={() => setModalImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors p-2"
              >
                <IconX size={24} />
              </button>
              <img
                src={modalImage}
                alt="확대 이미지"
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

EntryTab.displayName = "EntryTab";

export default EntryTab;
