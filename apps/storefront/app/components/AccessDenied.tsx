import Link from "next/link";
import { Card } from "@minimal-mall/ui";

export function AccessDenied({
  title,
  message,
  actionHref = "/account",
  actionLabel = "去登录",
  secondaryHref = "/",
  secondaryLabel = "返回商城"
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
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
          <div className="top-actions access-actions">
            <Link className="ui-button ui-button--primary" href={actionHref}>
              {actionLabel}
            </Link>
            <Link className="ui-button ui-button--secondary" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}
