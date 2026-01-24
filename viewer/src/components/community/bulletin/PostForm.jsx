import { useState } from 'react';
import { IconArrowLeft } from '../../Icons';

const categories = [
  { id: '자유', label: '자유', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: '메뉴후기', label: '메뉴후기', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: '맛집추천', label: '맛집추천', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: '정보', label: '정보', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function PostForm({ onSubmit, onCancel, submitting = false }) {
  const [category, setCategory] = useState('자유');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    const result = await onSubmit({
      category,
      title: title.trim(),
      content: content.trim(),
    });

    if (!result.success) {
      setError(result.error || '글 작성에 실패했습니다.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <IconArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h3 className="text-lg font-bold text-slate-800">글쓰기</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Category selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            카테고리
          </label>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${category === cat.id
                    ? `${cat.color} border-current`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {title.length}/100
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder="내용을 입력하세요"
            className="w-full h-40 px-4 py-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {content.length}/2000
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-red-500 text-sm mb-4">{error}</div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className={`
            w-full py-3 rounded-lg text-sm font-medium transition-colors
            ${!submitting && title.trim() && content.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {submitting ? '등록 중...' : '글 등록하기'}
        </button>
      </form>
    </div>
  );
}
