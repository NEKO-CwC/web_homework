import Link from "next/link";
import { Card } from "@minimal-mall/ui";

export function AccessDenied({
  title,
  message,
  actionHref = "/account",
  actionLabel = "去登录"
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
      </div>
      <Card className="panel">
        <div className="empty-state">
          <p>{message}</p>
          <Link className="ui-button ui-button--primary" href={actionHref} style={{ marginTop: 16 }}>
            {actionLabel}
          </Link>
        </div>
      </Card>
    </>
  );
}
