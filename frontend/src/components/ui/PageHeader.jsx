export default function PageHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {Icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div>{action}</div>
    </div>
  );
}
