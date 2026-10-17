import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs
 * Visual location indicator adhering to the civic design tokens.
 */
export default function Breadcrumbs({ customCrumbs }) {
  const location = useLocation();

  if (customCrumbs && customCrumbs.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-stone-600 flex-wrap font-medium">
          <li className="flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-stone-500" />
          </li>
          {customCrumbs.map((crumb, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-emerald-700 transition-colors font-medium focus-visible:ring-1 focus-visible:ring-emerald-600 rounded">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-bold text-stone-800" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-stone-600 flex-wrap font-medium">
        <li className="flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5 text-stone-500" />
        </li>
        {segments.map((seg, idx) => {
          const path = `/${segments.slice(0, idx + 1).join('/')}`;
          const isLast = idx === segments.length - 1;
          const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace('-', ' ');

          return (
            <li key={path} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
              {isLast ? (
                <span className="font-bold text-stone-800" aria-current="page">
                  {formatted}
                </span>
              ) : (
                <Link to={path} className="hover:text-emerald-700 transition-colors font-medium focus-visible:ring-1 focus-visible:ring-emerald-600 rounded">
                  {formatted}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
