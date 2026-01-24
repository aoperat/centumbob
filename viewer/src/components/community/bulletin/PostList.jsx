import PostCard from './PostCard';

const categories = [
  { id: null, label: '전체' },
  { id: '자유', label: '자유' },
  { id: '메뉴후기', label: '메뉴후기' },
  { id: '맛집추천', label: '맛집추천' },
  { id: '정보', label: '정보' },
];

export default function PostList({
  posts,
  category,
  loading,
  hasMore,
  onCategoryChange,
  onPostClick,
  onLoadMore,
  onWritePost,
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header with write button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">게시판</h3>
        <button
          onClick={onWritePost}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          글쓰기
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id || 'all'}
            onClick={() => onCategoryChange(cat.id)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${category === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={onPostClick}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 disabled:text-slate-400"
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
