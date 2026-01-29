/**
 * 오늘의 투표 컴포넌트
 */

import { useState, useEffect } from 'react';
import { getTodayPoll, vote } from '../../utils/nearbyRestaurantApi';

const TodayPoll = ({ user }) => {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [voting, setVoting] = useState(false);

  // 익명 ID 생성/조회
  const getAnonymousId = () => {
    let id = localStorage.getItem('nearby_anonymous_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nearby_anonymous_id', id);
    }
    return id;
  };

  // 투표 여부 확인
  const checkVoted = () => {
    const votedPolls = JSON.parse(localStorage.getItem('nearby_voted_polls') || '{}');
    return votedPolls[poll?.id] || false;
  };

  // 투표 로드
  useEffect(() => {
    const loadPoll = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getTodayPoll();
        setPoll(data);

        if (data) {
          const votedPolls = JSON.parse(localStorage.getItem('nearby_voted_polls') || '{}');
          if (votedPolls[data.id]) {
            setVoted(true);
            setSelectedId(votedPolls[data.id]);
          }
        }
      } catch (err) {
        console.error('투표 로드 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, []);

  // 투표하기
  const handleVote = async (restaurantId) => {
    if (voted || voting) return;

    setVoting(true);
    setSelectedId(restaurantId);

    try {
      await vote({
        pollId: poll.id,
        restaurantId,
        userId: user?.id,
        anonymousId: user ? null : getAnonymousId(),
      });

      // 투표 기록 저장
      const votedPolls = JSON.parse(localStorage.getItem('nearby_voted_polls') || '{}');
      votedPolls[poll.id] = restaurantId;
      localStorage.setItem('nearby_voted_polls', JSON.stringify(votedPolls));

      setVoted(true);

      // 투표 결과 새로고침
      const updatedPoll = await getTodayPoll();
      setPoll(updatedPoll);
    } catch (err) {
      console.error('투표 실패:', err);
      setSelectedId(null);
      alert(err.message || '투표에 실패했습니다.');
    } finally {
      setVoting(false);
    }
  };

  // 투표 마감 시간 계산
  const getTimeRemaining = () => {
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(13, 0, 0, 0); // 오후 1시 마감

    if (now >= endTime) {
      return '마감됨';
    }

    const diff = endTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}시간 ${minutes}분 남음`;
  };

  // 로딩
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // 투표 없음
  if (!poll) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🗳️</div>
        <p className="text-slate-500">아직 오늘의 투표가 없습니다.</p>
        <p className="text-sm text-slate-400 mt-2">
          주변 식당이 등록되면 자동으로 투표가 생성됩니다.
        </p>
      </div>
    );
  }

  const isClosed = poll.status === 'closed' || new Date().getHours() >= 13;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-800">
            🗳️ 오늘 점심 어디?
          </h3>
          <span
            className={`text-sm px-2 py-1 rounded-full ${
              isClosed
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {isClosed ? '마감됨' : getTimeRemaining()}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {isClosed
            ? `총 ${poll.total_votes}명이 투표에 참여했습니다.`
            : '구내식당 대신 어디로 갈까요? 투표해주세요!'}
        </p>
      </div>

      {/* 투표 옵션 */}
      <div className="space-y-3">
        {poll.restaurants
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .map((restaurant, index) => {
            const percentage =
              poll.total_votes > 0
                ? Math.round(((restaurant.vote_count || 0) / poll.total_votes) * 100)
                : 0;
            const isSelected = selectedId === restaurant.id;
            const isWinner = index === 0 && isClosed && poll.total_votes > 0;

            return (
              <button
                key={restaurant.id}
                onClick={() => !isClosed && handleVote(restaurant.id)}
                disabled={voted || voting || isClosed}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isWinner
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                } ${(voted || isClosed) ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* 진행률 바 (투표 후 표시) */}
                {(voted || isClosed) && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all ${
                      isSelected ? 'bg-blue-100' : isWinner ? 'bg-yellow-100' : 'bg-slate-100'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 순위 뱃지 (결과 표시 시) */}
                    {isClosed && index < 3 && (
                      <span className="text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    )}

                    {/* 라디오 버튼 (투표 전) */}
                    {!voted && !isClosed && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="font-medium text-slate-800">{restaurant.name}</p>
                      <p className="text-sm text-slate-500">
                        {restaurant.category} · ⭐ {restaurant.avg_rating?.toFixed(1) || '0.0'}
                      </p>
                    </div>
                  </div>

                  {/* 득표율 (투표 후 표시) */}
                  {(voted || isClosed) && (
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{percentage}%</p>
                      <p className="text-sm text-slate-500">{restaurant.vote_count || 0}표</p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
      </div>

      {/* 투표 완료 메시지 */}
      {voted && !isClosed && (
        <div className="text-center py-4">
          <p className="text-green-600 font-medium">✓ 투표가 완료되었습니다!</p>
          <p className="text-sm text-slate-500 mt-1">
            결과는 오후 1시에 확정됩니다.
          </p>
        </div>
      )}

      {/* 우승자 발표 */}
      {isClosed && poll.restaurants.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm text-yellow-700">오늘의 인기 맛집</p>
              <p className="font-bold text-yellow-900">
                {poll.restaurants.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0]?.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayPoll;
