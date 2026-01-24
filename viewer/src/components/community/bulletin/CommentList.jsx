import { useState } from 'react';
import { getRelativeTime } from '../../../utils/koreanDate';
import { IconSend } from '../../Icons';

export default function CommentList({
  comments,
  onAddComment,
  submitting = false,
}) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    const result = await onAddComment(newComment.trim());
    if (result.success) {
      setNewComment('');
    }
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  const getReplies = (parentId) => {
    return replies.filter(r => r.parent_id === parentId);
  };

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <h4 className="font-bold text-slate-800 mb-4">
        댓글 {comments.length}개
      </h4>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요"
          maxLength={500}
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${newComment.trim() && !submitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <IconSend className="w-4 h-4" />
        </button>
      </form>

      {/* Comments */}
      {comments.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          아직 댓글이 없습니다. 첫 번째 댓글을 달아보세요!
        </div>
      ) : (
        <div className="space-y-3">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, replies = [] }) {
  return (
    <div>
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-slate-700 text-sm">
            {comment.display_name}
          </span>
          <span className="text-xs text-slate-400">
            {getRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-slate-600 text-sm">{comment.content}</p>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-6 mt-2 space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="bg-slate-50 rounded-lg p-3 border-l-2 border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-700 text-sm">
                  {reply.display_name}
                </span>
                <span className="text-xs text-slate-400">
                  {getRelativeTime(reply.created_at)}
                </span>
              </div>
              <p className="text-slate-600 text-sm">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
