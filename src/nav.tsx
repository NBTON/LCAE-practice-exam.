import { useEffect, useState } from 'react';

export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const fn = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return hash;
}

export function Link({ href, children, className, ...rest }: {
  href: string; children: React.ReactNode; className?: string;
  [k: string]: unknown;
}) {
  return <a href={href} className={className} {...(rest as object)}>{children}</a>;
}

export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, '');
}
