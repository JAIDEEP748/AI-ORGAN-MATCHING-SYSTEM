import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black"
          style={{ color: "#000000" }}
        >
          {title}
        </h1>

        {description && (
          <p
            className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 font-medium"
            style={{ color: "#475569" }}
          >
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
