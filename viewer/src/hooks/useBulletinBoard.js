import { useState, useEffect, useCallback } from 'react';
import {
  fetchPosts,
  fetchPost,
  createPost,
  toggleLike,
  hasLikedPost,
  fetchComments,
  createComment,
} from '../utils/communityApi';
import { getAnonymousId } from '../utils/anonymousUser';
import { useAuth } from './useAuth';

export function useBulletinBoard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPost, setLoadingPost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const userId = user?.id || null;
  const anonymousId = !userId ? getAnonymousId() : null;
  const displayName = user?.user_metadata?.display_name || anonymousId;

  // Fetch posts
  const loadPosts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      }

      const currentOffset = reset ? 0 : offset;
      const { data, error: fetchError } = await fetchPosts({
        category,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      if (fetchError) throw fetchError;

      if (reset) {
        setPosts(data || []);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length || 0) >= PAGE_SIZE);
      setOffset(currentOffset + PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, offset]);

  // Initial load and category change
  useEffect(() => {
    loadPosts(true);
  }, [category]);

  // Load more posts
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  }, [loading, hasMore, loadPosts]);

  // Fetch single post with comments
  const openPost = useCallback(async (postId) => {
    try {
      setLoadingPost(true);
      setSelectedPost(null);
      setComments([]);

      const [postResult, commentsResult] = await Promise.all([
        fetchPost(postId),
        fetchComments(postId),
      ]);

      if (postResult.error) throw postResult.error;

      // Check if user liked this post
      const liked = await hasLikedPost(postId, userId, anonymousId);

      setSelectedPost({ ...postResult.data, isLiked: liked });
      setComments(commentsResult.data || []);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError(err.message);
    } finally {
      setLoadingPost(false);
    }
  }, [userId, anonymousId]);

  // Close post
  const closePost = useCallback(() => {
    setSelectedPost(null);
    setComments([]);
  }, []);

  // Create a new post
  const submitPost = useCallback(async ({ category, title, content }) => {
    if (submitting) return { success: false };

    try {
      setSubmitting(true);
      setError(null);

      const { data, error: submitError } = await createPost({
        category,
        title,
        content,
        displayName,
        isAnonymous: !userId,
        userId,
        anonymousId,
      });

      if (submitError) throw submitError;

      // Prepend new post to list
      setPosts(prev => [data, ...prev]);

      return { success: true, data };
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  }, [userId, anonymousId, displayName, submitting]);

  // Toggle like on current post
  const likePost = useCallback(async () => {
    if (!selectedPost) return;

    try {
      const { liked, error: likeError } = await toggleLike(
        selectedPost.id,
        userId,
        anonymousId
      );

      if (likeError) throw likeError;

      // Update selected post
      setSelectedPost(prev => ({
        ...prev,
        isLiked: liked,
        like_count: prev.like_count + (liked ? 1 : -1),
      }));

      // Update post in list
      setPosts(prev =>
        prev.map(p =>
          p.id === selectedPost.id
            ? { ...p, like_count: p.like_count + (liked ? 1 : -1) }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setError(err.message);
    }
  }, [selectedPost, userId, anonymousId]);

  // Add a comment
  const addComment = useCallback(async (content, parentId = null) => {
    if (!selectedPost || submitting) return { success: false };

    try {
      setSubmitting(true);

      const { data, error: commentError } = await createComment({
        postId: selectedPost.id,
        content,
        displayName,
        isAnonymous: !userId,
        userId,
        anonymousId,
        parentId,
      });

      if (commentError) throw commentError;

      // Add comment to list
      setComments(prev => [...prev, data]);

      // Update comment count
      setSelectedPost(prev => ({
        ...prev,
        comment_count: prev.comment_count + 1,
      }));

      // Update post in list
      setPosts(prev =>
        prev.map(p =>
          p.id === selectedPost.id
            ? { ...p, comment_count: p.comment_count + 1 }
            : p
        )
      );

      return { success: true, data };
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  }, [selectedPost, userId, anonymousId, displayName, submitting]);

  return {
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
    refetch: () => loadPosts(true),
  };
}
