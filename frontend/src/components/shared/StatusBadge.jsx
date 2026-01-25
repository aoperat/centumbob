// StatusBadge.jsx - 상태 표시 배지 컴포넌트

const StatusBadge = ({ status, type = "complaint" }) => {
  // 상태별 색상 매핑
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "processing":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-300";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  // 상태별 텍스트 매핑
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "processing":
        return "처리중";
      case "resolved":
        return "해결됨";
      case "closed":
        return "종료";
      default:
        return status;
    }
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(
        status
      )}`}
    >
      {getStatusText(status)}
    </span>
  );
};

export default StatusBadge;
