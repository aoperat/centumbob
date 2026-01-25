// AdminCard.jsx - 대시보드 메트릭 카드 컴포넌트

const AdminCard = ({ title, value, subtitle, icon, color = "blue", onClick }) => {
  // 색상별 클래스 매핑
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    green: "bg-green-50 border-green-200 hover:border-green-400 hover:shadow-green-100",
    yellow: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100",
    red: "bg-red-50 border-red-200 hover:border-red-400 hover:shadow-red-100",
    purple: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-purple-100",
    gray: "bg-gray-50 border-gray-200 hover:border-gray-400 hover:shadow-gray-100",
  };

  const iconColorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
  };

  const valueColorClasses = {
    blue: "text-blue-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
    purple: "text-purple-700",
    gray: "text-gray-700",
  };

  return (
    <div
      onClick={onClick}
      className={`
        border-2 rounded-xl p-4 transition-all
        ${colorClasses[color] || colorClasses.blue}
        ${onClick ? "cursor-pointer hover:shadow-lg" : ""}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
        {icon && (
          <div className={`text-2xl ${iconColorClasses[color]}`}>{icon}</div>
        )}
      </div>
      <div className={`text-3xl font-bold mb-1 ${valueColorClasses[color]}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
};

export default AdminCard;
