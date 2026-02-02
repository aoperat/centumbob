import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { IconX } from "./Icons";

const RouletteModal = ({ isOpen, onClose, restaurants = [], onSelectRestaurant }) => {
  // State
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Refs
  const wheelRef = useRef(null);

  // Color palette for wheel slices
  const sliceColors = [
    '#3b82f6', // blue-500
    '#f97316', // orange-500
    '#10b981', // green-500
    '#a855f7', // purple-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
  ];

  // Computed: eligible restaurants (not excluded)
  const eligibleRestaurants = useMemo(
    () => restaurants.filter((r) => !excludedIds.has(r.id)),
    [restaurants, excludedIds]
  );

  const canSpin = eligibleRestaurants.length > 0 && !isSpinning;

  // Handlers
  const toggleExclude = useCallback((restaurantId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(restaurantId)) {
        next.delete(restaurantId);
      } else {
        next.add(restaurantId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setExcludedIds(new Set());
  }, []);

  const deselectAll = useCallback(() => {
    setExcludedIds(new Set(restaurants.map((r) => r.id)));
  }, [restaurants]);

  // Spin logic
  const handleSpin = useCallback(() => {
    if (!canSpin || eligibleRestaurants.length === 0) return;

    // Reset previous result
    setShowResult(false);
    setWinner(null);

    // Calculate rotation
    const baseRotation = 1800; // 5 full spins
    const randomOffset = Math.random() * 360;
    const totalRotation = baseRotation + randomOffset;

    // Calculate winner based on final angle
    const numRestaurants = eligibleRestaurants.length;
    const sliceAngle = 360 / numRestaurants;
    const finalAngle = totalRotation % 360;

    // Winner index (pointer at top = 0deg, adjust for clockwise rotation)
    const winnerIndex = Math.floor((360 - finalAngle + sliceAngle / 2) / sliceAngle) % numRestaurants;
    const selectedRestaurant = eligibleRestaurants[winnerIndex];

    // Set CSS variables for animation
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--spin-rotation', `${totalRotation}deg`);
      wheelRef.current.style.setProperty('--spin-duration', '4s');
    }

    setIsSpinning(true);
    setRotation(totalRotation);

    // Show result after animation completes
    setTimeout(() => {
      setWinner(selectedRestaurant);
      setShowResult(true);
      setIsSpinning(false);
    }, 4500); // 4s animation + 0.5s delay
  }, [canSpin, eligibleRestaurants]);

  const handleNavigateToWinner = useCallback(() => {
    if (winner) {
      onSelectRestaurant(winner);
      onClose();
    }
  }, [winner, onSelectRestaurant, onClose]);

  const handleSpinAgain = useCallback(() => {
    setShowResult(false);
    setWinner(null);
    setRotation(0);
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--spin-rotation', '0deg');
    }
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsSpinning(false);
        setShowResult(false);
        setWinner(null);
        setRotation(0);
        setExcludedIds(new Set());
        if (wheelRef.current) {
          wheelRef.current.style.setProperty('--spin-rotation', '0deg');
        }
      }, 300);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isSpinning) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSpinning, onClose]);

  // Generate SVG path for pie slice
  const getPieSlicePath = (index, total, radius = 180) => {
    const angle = 360 / total;
    const startAngle = index * angle - 90; // -90 to start from top
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 200 + radius * Math.cos(startRad);
    const y1 = 200 + radius * Math.sin(startRad);
    const x2 = 200 + radius * Math.cos(endRad);
    const y2 = 200 + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Get text position and rotation for slice
  const getTextTransform = (index, total) => {
    const angle = 360 / total;
    const midAngle = index * angle + angle / 2 - 90; // -90 to start from top
    const radius = 120; // Position text at 2/3 of radius

    const midRad = (midAngle * Math.PI) / 180;
    const x = 200 + radius * Math.cos(midRad);
    const y = 200 + radius * Math.sin(midRad);

    return { x, y, rotation: midAngle + 90 };
  };

  if (!isOpen) return null;

  // Edge case: No restaurants
  if (restaurants.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 roulette-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-slate-600 font-bold mb-4">식당 데이터가 없습니다</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Edge case: All restaurants excluded
  if (eligibleRestaurants.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto roulette-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">🎲 식당 룰렛</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <IconX />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Restaurant Selection */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700">식당 선택</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {restaurants.map((restaurant) => (
                  <label
                    key={restaurant.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      excludedIds.has(restaurant.id)
                        ? "border-slate-200 bg-slate-50 opacity-50"
                        : "border-blue-500 bg-blue-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!excludedIds.has(restaurant.id)}
                      onChange={() => toggleExclude(restaurant.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {restaurant.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Empty state message */}
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🚫</div>
              <p className="text-slate-600 font-bold mb-2">
                최소 1개 이상의 식당을 선택해주세요
              </p>
              <p className="text-sm text-slate-500 mb-4">
                룰렛을 돌리려면 식당을 선택해야 합니다
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edge case: Only 1 restaurant
  if (eligibleRestaurants.length === 1) {
    const onlyRestaurant = eligibleRestaurants[0];
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 roulette-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">🎲 식당 룰렛</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <IconX />
            </button>
          </div>

          {/* Content */}
          <div className="text-center py-8">
            <p className="text-slate-600 mb-6">선택 가능한 식당이 1개뿐입니다</p>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white shadow-2xl rounded-2xl p-8 mb-6">
              <h3 className="text-3xl font-bold text-white mb-2">
                {onlyRestaurant.name}
              </h3>
              {onlyRestaurant.building_name && (
                <p className="text-blue-100 text-sm">{onlyRestaurant.building_name}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleNavigateToWinner}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                메뉴 보러가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main view: Normal roulette
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto roulette-modal-enter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="roulette-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200">
          <h2 id="roulette-title" className="text-xl sm:text-2xl font-bold text-slate-800">
            🎲 식당 룰렛
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {!showResult ? (
            <>
              {/* Restaurant Selection Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-700">
                    식당 선택 ({eligibleRestaurants.length}/{restaurants.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {restaurants.map((restaurant) => {
                    const isIncluded = !excludedIds.has(restaurant.id);
                    return (
                      <label
                        key={restaurant.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isIncluded
                            ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                            : "border-slate-200 bg-slate-50 opacity-50 hover:opacity-75"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => toggleExclude(restaurant.id)}
                          className="w-4 h-4 accent-blue-600"
                          disabled={isSpinning}
                        />
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {restaurant.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Wheel Section */}
              <div className="relative">
                <svg
                  viewBox="0 0 400 400"
                  className="w-full max-w-[400px] mx-auto"
                  style={{ maxHeight: '400px' }}
                >
                  {/* Outer decorative circle */}
                  <circle
                    cx="200"
                    cy="200"
                    r="190"
                    fill="white"
                    stroke="#cbd5e1"
                    strokeWidth="4"
                  />

                  {/* Wheel group (rotates) */}
                  <g
                    ref={wheelRef}
                    className={isSpinning ? 'roulette-spinning' : ''}
                    style={{ transformOrigin: '200px 200px' }}
                  >
                    {eligibleRestaurants.map((restaurant, index) => {
                      const color = sliceColors[index % sliceColors.length];
                      const path = getPieSlicePath(index, eligibleRestaurants.length);
                      const { x, y, rotation } = getTextTransform(index, eligibleRestaurants.length);

                      return (
                        <g key={restaurant.id}>
                          {/* Pie slice */}
                          <path d={path} fill={color} stroke="white" strokeWidth="2" />

                          {/* Restaurant name */}
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="14"
                            fontWeight="bold"
                            transform={`rotate(${rotation}, ${x}, ${y})`}
                            style={{
                              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                              pointerEvents: 'none',
                            }}
                          >
                            {restaurant.name.length > 8
                              ? restaurant.name.substring(0, 7) + '...'
                              : restaurant.name}
                          </text>
                        </g>
                      );
                    })}
                  </g>

                  {/* Center circle */}
                  <circle cx="200" cy="200" r="35" fill="#1e293b" />
                  <circle cx="200" cy="200" r="30" fill="white" />

                  {/* Pointer at top */}
                  <polygon
                    points="190,15 210,15 200,35"
                    fill="#ef4444"
                    stroke="#dc2626"
                    strokeWidth="2"
                  />
                </svg>

                {/* Spin button (center of wheel) */}
                {!isSpinning && (
                  <button
                    onClick={handleSpin}
                    disabled={!canSpin}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    style={{ marginTop: '0' }}
                  >
                    룰렛 돌리기
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Result Display */
            <div className="text-center py-8 relative">
              {/* 배경 장식 효과 */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300 rounded-full opacity-20 animate-ping"></div>
                <div className="absolute top-20 right-10 w-16 h-16 bg-pink-300 rounded-full opacity-20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-20 left-20 w-12 h-12 bg-blue-300 rounded-full opacity-20 animate-ping" style={{ animationDelay: '1s' }}></div>
              </div>

              {/* 이모지 */}
              <div className="relative z-10 flex justify-center items-center gap-4 mb-6">
                <span className="text-5xl animate-bounce">🎉</span>
                <span className="text-6xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</span>
                <span className="text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6 relative z-10">
                오늘의 식당은?
              </h3>

              {/* 당첨 카드 */}
              <div className="relative z-10 mb-8 mx-auto max-w-md">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-1">
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border-2 border-white/30">
                      <h4 className="text-3xl sm:text-4xl font-black text-white mb-3 drop-shadow-lg animate-pulse">
                        {winner.name}
                      </h4>
                      {winner.building_name && (
                        <p className="text-white/90 text-lg font-semibold drop-shadow-md">
                          📍 {winner.building_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
                <button
                  onClick={handleSpinAgain}
                  className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  🎲 다시 돌리기
                </button>
                <button
                  onClick={handleNavigateToWinner}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  🍽️ 메뉴 보러가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouletteModal;
