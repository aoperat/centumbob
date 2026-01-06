const MenuList = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-gray-400 text-xs italic">정보 없음</p>;
  }
  
  return (
    <ul className="space-y-1 mt-2">
      {items.map((item, idx) => (
        <li key={idx} className="text-sm text-slate-700 leading-snug break-keep">
          · {item}
        </li>
      ))}
    </ul>
  );
};

export default MenuList;

