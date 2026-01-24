import { useState } from 'react';
import { useVoting } from '../../../hooks/useVoting';
import { formatKoreanDate, getKoreanDateString, isWeekday } from '../../../utils/koreanDate';
import VoteCard from './VoteCard';
import VoteResults from './VoteResults';

export default function DailyVoting({ restaurants = [] }) {
  const [showResults, setShowResults] = useState(false);
  const {
    voteCounts,
    totalVotes,
    userVote,
    loading,
    voting,
    error,
    vote,
    getPercentage,
    getSortedRestaurants,
  } = useVoting(restaurants);

  const today = getKoreanDateString();
  const isVotingDay = isWeekday();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedRestaurants = getSortedRestaurants();

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-1">
          오늘 뭐 먹지? 🤔
        </h3>
        <p className="text-sm text-slate-500">
          {formatKoreanDate(today)} 점심 투표
        </p>
        {!isVotingDay && (
          <p className="text-xs text-amber-600 mt-2 bg-amber-50 inline-block px-3 py-1 rounded-full">
            주말에는 투표가 비활성화됩니다
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* Toggle view */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setShowResults(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !showResults
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          투표하기
        </button>
        <button
          onClick={() => setShowResults(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showResults
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          결과 보기
        </button>
      </div>

      {/* Content */}
      {showResults ? (
        <VoteResults
          voteCounts={voteCounts}
          totalVotes={totalVotes}
          restaurants={restaurants}
        />
      ) : (
        <div className="space-y-3">
          {restaurants.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              투표할 수 있는 식당이 없습니다.
            </div>
          ) : (
            <>
              {/* User vote status */}
              {userVote && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center text-sm">
                  <span className="text-blue-700">
                    <strong>{userVote}</strong>에 투표했습니다
                  </span>
                  <span className="text-blue-500 ml-2">(다시 클릭하면 변경됩니다)</span>
                </div>
              )}

              {/* Vote cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedRestaurants.map((name, index) => (
                  <VoteCard
                    key={name}
                    restaurantName={name}
                    voteCount={voteCounts[name] || 0}
                    percentage={getPercentage(name)}
                    isSelected={userVote === name}
                    onVote={vote}
                    disabled={voting || !isVotingDay}
                    rank={voteCounts[name] > 0 ? index + 1 : 0}
                  />
                ))}
              </div>

              {/* Total votes */}
              <div className="text-center text-sm text-slate-400 pt-2">
                현재 {totalVotes}명 참여 중
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
