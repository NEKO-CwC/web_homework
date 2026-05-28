export function LoadingState({ label = "正在加载数据..." }: { label?: string }) {
  return <div className="empty-state" aria-busy="true">{label}</div>;
}

export function EmptyState({ label = "暂无数据" }: { label?: string }) {
  return <div className="empty-state">{label}</div>;
}

export function ErrorState({ label = "数据加载失败，请稍后重试" }: { label?: string }) {
  return <div className="empty-state" role="alert">{label}</div>;
}
