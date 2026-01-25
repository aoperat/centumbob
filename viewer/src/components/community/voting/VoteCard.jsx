export default function VoteCard({
  restaurantId,
  restaurantName,
  voteCount = 0,
  percentage = 0,
  isSelected = false,
  onVote,
  disabled = false,
  rank = 0,
}) {
  const getRankBadge = () => {
    if (rank === 1) return { bg: 'bg-yellow-400', text: '1st' };
    if (rank === 2) return { bg: 'bg-slate-300', text: '2nd' };
    if (rank === 3) return { bg: 'bg-amber-600', text: '3rd' };
    return null;
  };

  const rankBadge = getRankBadge();

  return (
    <button
      onClick={() => onVote(restaurantId, restaurantName)}
      disabled={disabled}
      className={`
        relative w-full p-4 rounded-xl border-2 transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Rank badge */}
      {rankBadge && voteCount > 0 && (
        <span className={`absolute -top-2 -left-2 ${rankBadge.bg} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow`}>
          {rankBadge.text}
        </span>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          내 투표
        </span>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
          {restaurantName}
        </span>
        <span className="text-sm text-slate-500">
          {voteCount}표
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isSelected ? 'bg-blue-500' : 'bg-slate-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="text-right mt-1">
        <span className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
          {percentage}%
        </span>
      </div>
    </button>
  );
}
