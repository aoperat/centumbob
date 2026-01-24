import { useState } from 'react';
import { useBulletinBoard } from '../../../hooks/useBulletinBoard';
import PostList from './PostList';
import PostDetail from './PostDetail';
import PostForm from './PostForm';

export default function BulletinBoard() {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'write'

  const {
    posts,
    selectedPost,
    comments,
    category,
    loading,
    loadingPost,
    submitting,
    error,
    hasMore,
    setCategory,
    loadMore,
    openPost,
    closePost,
    submitPost,
    likePost,
    addComment,
  } = useBulletinBoard();

  const handlePostClick = async (postId) => {
    await openPost(postId);
    setView('detail');
  };

  const handleBack = () => {
    closePost();
    setView('list');
  };

  const handleWritePost = () => {
    setView('write');
  };

  const handleSubmitPost = async (postData) => {
    const result = await submitPost(postData);
    if (result.success) {
      setView('list');
    }
    return result;
  };

  const handleCancelWrite = () => {
    setView('list');
  };

  return (
    <div className="p-4 sm:p-6 h-[60vh]">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* View content */}
      {view === 'list' && (
        <PostList
          posts={posts}
          category={category}
          loading={loading}
          hasMore={hasMore}
          onCategoryChange={setCategory}
          onPostClick={handlePostClick}
          onLoadMore={loadMore}
          onWritePost={handleWritePost}
        />
      )}

      {view === 'detail' && (
        <PostDetail
          post={selectedPost}
          comments={comments}
          loading={loadingPost}
          submitting={submitting}
          onBack={handleBack}
          onLike={likePost}
          onAddComment={addComment}
        />
      )}

      {view === 'write' && (
        <PostForm
          onSubmit={handleSubmitPost}
          onCancel={handleCancelWrite}
          submitting={submitting}
        />
      )}
    </div>
  );
}
