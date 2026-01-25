import { IconX, IconVote } from '../Icons';
import DailyVoting from './voting/DailyVoting';

export default function CommunityModal({ isOpen, onClose, menuData = [] }) {
  if (!isOpen) return null;

  // Extract restaurant names from menu data
  const restaurants = menuData.map(d => d.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-orange-500 text-white p-1 sm:p-1.5 rounded-lg">
              <IconVote className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            오늘 뭐 먹지?
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-full transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Content - Voting Only */}
        <div className="flex-1 overflow-y-auto">
          <DailyVoting restaurants={restaurants} />
        </div>
      </div>
    </div>
  );
}
