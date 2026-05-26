import type { ReactNode } from 'react';

type PageShellProps = {
  eyebrow: string;
  title: string;
  className?: string;
  children?: ReactNode;
};

export default function PageShell({ eyebrow, title, className, children }: PageShellProps) {
  return (
    <section className={className ? `page-section ${className}` : 'page-section'}>
      <div className="page-kicker">{eyebrow}</div>
      <h1>{title}</h1>
      {children ? <div className="page-body">{children}</div> : null}
    </section>
  );
}
