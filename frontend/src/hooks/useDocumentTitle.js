import { useEffect } from 'react';

/**
 * useDocumentTitle
 * Sets the document <title> and updates meta description dynamically for SEO & accessibility.
 * Reverts to the default platform title upon unmount.
 */
export function useDocumentTitle(title, description) {
  useEffect(() => {
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDescription = metaDesc ? metaDesc.getAttribute('content') : '';

    if (description && metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDescription) {
        metaDesc.setAttribute('content', originalDescription);
      }
    };
  }, [title, description]);
}

export default useDocumentTitle;
