import { IconEdit, IconStar, IconVote } from '../Icons';

const tabs = [
  { id: 'bulletin', label: '게시판', icon: IconEdit },
  { id: 'reviews', label: '메뉴리뷰', icon: IconStar },
  { id: 'voting', label: '오늘의투표', icon: IconVote },
];

export default function CommunityTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex border-b border-slate-200">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
            ${activeTab === id
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
