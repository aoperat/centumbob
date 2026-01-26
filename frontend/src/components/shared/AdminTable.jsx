// AdminTable.jsx - 관리자 테이블 컴포넌트

import { useState } from "react";

const AdminTable = ({ columns, data, onRowClick, sortable = true }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // 'asc' | 'desc'

  // 정렬 핸들러
  const handleSort = (columnKey) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      // 같은 컬럼 클릭: 방향 전환
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 다른 컬럼 클릭: 새 컬럼으로 오름차순 정렬
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // 데이터 정렬
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue === bValue) return 0;

    const comparison = aValue > bValue ? 1 : -1;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => sortable && handleSort(column.key)}
                className={`
                  px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider
                  ${sortable ? "cursor-pointer hover:bg-slate-100" : ""}
                `}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {sortable && sortColumn === column.key && (
                    <span className="text-blue-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-slate-500 text-sm"
              >
                표시할 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                  ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}
                  transition-colors
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-2.5 whitespace-nowrap text-sm text-slate-900"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
