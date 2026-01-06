import { useState, useEffect, useRef } from 'react';
import { IconX, IconPlus } from './Icons';

const MenuListEditor = ({ items, onChange }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const inputRef = useRef(null);

  // 편집 모드 진입 시 focus
  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingIndex]);

  const handleAdd = () => {
    const newItems = [...items, "새 메뉴"];
    onChange(newItems);
    setEditingIndex(newItems.length - 1); // 바로 편집 모드
  };

  const handleDelete = (index, e) => {
    e.stopPropagation();
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleEditStart = (index) => {
    setEditingIndex(index);
  };

  const handleEditSave = (index, newValue) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
    setEditingIndex(null);
  };

  const handleKeyDown = (e, index, value) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(index, value);
    }
  };

  // 드래그 시작
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    // 드래그 중 커서 스타일
    e.target.style.opacity = '0.5';
  };

  // 드래그 종료
  const handleDragEnd = (e) => {
    e.target.style.opacity = '';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 드래그 오버 (드롭 가능 영역 위에 있을 때)
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // 드래그 리브 (드롭 가능 영역을 벗어날 때)
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // 드롭
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 아이템 순서 재배열
    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    // 드래그된 아이템 제거
    newItems.splice(draggedIndex, 1);
    
    // 새로운 위치에 삽입
    newItems.splice(dropIndex, 0, draggedItem);
    
    onChange(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar max-h-[280px]">
        {items.length === 0 && (
          <p className="text-slate-300 text-xs text-center py-4">메뉴 없음</p>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            draggable={editingIndex !== index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => editingIndex !== index && handleEditStart(index)}
            className={`
              group flex items-center justify-between text-sm px-2 py-1.5 rounded transition-all
              ${editingIndex === index 
                ? 'bg-blue-50 ring-1 ring-blue-200 cursor-text' 
                : 'hover:bg-slate-100 cursor-move'
              }
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''}
            `}
          >
            {editingIndex === index ? (
              <input
                ref={inputRef}
                type="text"
                defaultValue={item}
                onBlur={(e) => handleEditSave(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index, e.target.value)}
                className="w-full bg-transparent outline-none text-slate-800 font-medium"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-slate-400 text-xs select-none cursor-grab active:cursor-grabbing">
                    ⋮⋮
                  </div>
                  <span className="text-slate-600 truncate flex-1">{item}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(index, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                >
                  <IconX size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleAdd}
        className="w-full py-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors flex items-center justify-center gap-1"
      >
        <IconPlus size={14} /> 메뉴 추가
      </button>
    </div>
  );
};

export default MenuListEditor;

