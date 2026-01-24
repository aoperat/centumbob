import { IconArrowLeft, IconHeart, IconEye } from '../../Icons';
import { getRelativeTime } from '../../../utils/koreanDate';
import CommentList from './CommentList';

const categoryColors = {
  '자유': 'bg-purple-100 text-purple-700',
  '메뉴후기': 'bg-orange-100 text-orange-700',
  '맛집추천': 'bg-green-100 text-green-700',
  '정보': 'bg-blue-100 text-blue-700',
};

export default function PostDetail({
  post,
  comments,
  loading,
  submitting,
  onBack,
  onLike,
  onAddComment,
}) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  const {
    category,
    title,
    content,
    display_name,
    view_count,
    like_count,
    created_at,
    isLiked,
  } = post;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <IconArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[category]}`}>
          {category}
        </span>
      </div>

      {/* Post content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
          <span>{display_name}</span>
          <span>{getRelativeTime(created_at)}</span>
          <span className="flex items-center gap-1">
            <IconEye className="w-4 h-4" />
            {view_count}
          </span>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none mb-4">
          <p className="whitespace-pre-wrap text-slate-700">{content}</p>
        </div>

        {/* Like button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={onLike}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
              ${isLiked
                ? 'bg-red-50 text-red-500 border-2 border-red-200'
                : 'bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-red-200 hover:text-red-500'
              }
            `}
          >
            <IconHeart className="w-5 h-5" filled={isLiked} />
            <span>좋아요 {like_count}</span>
          </button>
        </div>

        {/* Comments */}
        <CommentList
          comments={comments}
          onAddComment={onAddComment}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
