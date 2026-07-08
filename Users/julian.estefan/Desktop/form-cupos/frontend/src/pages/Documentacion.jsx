function DocList({ items, color = 'blue' }) {
  const dotColors = { 
    blue: 'bg-blue-500', 
    green: 'bg-emerald-500', 
    orange: 'bg-orange-500', 
    red: 'bg-red-500' 
  };
  
  return (
    <ul className="space-y-1.5 my-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          {/* 使用 span 来表示图标状态 */}
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] || dotColors.blue} flex-shrink-0 mt-1.5`} />
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}