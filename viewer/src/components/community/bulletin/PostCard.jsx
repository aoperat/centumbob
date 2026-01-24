import { IconHeart, IconMessageCircle, IconEye } from '../../Icons';
import { getRelativeTime } from '../../../utils/koreanDate';

const categoryColors = {
  '자유': 'bg-purple-100 text-purple-700',
  '메뉴후기': 'bg-orange-100 text-orange-700',
  '맛집추천': 'bg-green-100 text-green-700',
  '정보': 'bg-blue-100 text-blue-700',
};

export default function PostCard({ post, onClick }) {
  const {
    id,
    category,
    title,
    display_name,
    view_count,
    like_count,
    comment_count,
    created_at,
  } = post;

  return (
    <button
      onClick={() => onClick(id)}
      className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Category badge */}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[category]}`}>
          {category}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-medium text-slate-800 truncate">{title}</h4>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{display_name}</span>
            <span>{getRelativeTime(created_at)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <IconEye className="w-3.5 h-3.5" />
          {view_count}
        </span>
        <span className="flex items-center gap-1">
          <IconHeart className="w-3.5 h-3.5" />
          {like_count}
        </span>
        <span className="flex items-center gap-1">
          <IconMessageCircle className="w-3.5 h-3.5" />
          {comment_count}
        </span>
      </div>
    </button>
  );
}
