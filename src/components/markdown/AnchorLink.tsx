import React from 'react';
import { useHeadingAnchors } from '../../hooks/useHeadingAnchors';

interface AnchorLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const AnchorLink: React.FC<AnchorLinkProps> = ({ href, children, ...props }) => {
  const { scrollToHeading } = useHeadingAnchors();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const id = href.substring(1);
      scrollToHeading(id);
    }
  };

  return (
    <a 
      href={href} 
      onClick={handleClick}
      className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-600 dark:hover:text-blue-300 transition-colors"
      {...props}
    >
      {children}
    </a>
  );
};
