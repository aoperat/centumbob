// restaurants는 { id, name } 객체 배열
export default function VoteResults({ voteCounts, totalVotes, restaurants }) {
  if (totalVotes === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        아직 투표가 없습니다. 첫 번째로 투표해보세요!
      </div>
    );
  }

  // Sort by vote count descending, 0표인 식당은 제외
  const sorted = [...restaurants]
    .map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      count: voteCounts[restaurant.id] || 0,
      percentage: Math.round((voteCounts[restaurant.id] || 0) / totalVotes * 100),
    }))
    .filter(item => item.count > 0) // 0표 제외
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        아직 투표가 없습니다. 첫 번째로 투표해보세요!
      </div>
    );
  }

  const winner = sorted[0];

  return (
    <div className="space-y-4">
      {/* Winner highlight */}
      {winner.count > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="font-bold text-amber-800">{winner.name}</div>
          <div className="text-sm text-amber-600">
            {winner.count}표 ({winner.percentage}%)
          </div>
        </div>
      )}

      {/* Ranking list - 투표 받은 식당만 표시 */}
      <div className="space-y-2">
        {sorted.map((item, index) => (
          <div
            key={item.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg
              ${index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-slate-100' : index === 2 ? 'bg-amber-50' : 'bg-white'}
            `}
          >
            <span className={`
              w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
              ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-slate-400 text-white' : index === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}
            `}>
              {index + 1}
            </span>
            <span className="flex-1 font-medium text-slate-700">{item.name}</span>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-700">{item.count}표</span>
              <span className="text-xs text-slate-400 ml-1">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-slate-400 pt-2">
        총 {totalVotes}명 참여
      </div>
    </div>
  );
}
