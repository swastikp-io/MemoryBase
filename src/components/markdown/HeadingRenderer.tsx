import React from 'react';

// Utilities for generating an ID from heading text
export const generateIdFromText = (children: React.ReactNode): string => {
  let text = '';
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string') {
      text += child;
    }
  });
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// ChatGPT style typography scales
const styles = {
  h1: "mt-[32px] mb-[16px] text-[30px] md:text-[32px] font-[700] leading-[1.25] text-text-primary tracking-tight",
  h2: "mt-[28px] mb-[12px] text-[24px] font-[700] leading-[1.3] text-text-primary tracking-tight",
  h3: "mt-[24px] mb-[10px] text-[20px] font-[650] leading-[1.35] text-text-primary",
  h4: "mt-[20px] mb-[8px] text-[16px] font-[600] leading-[1.4] text-text-primary",
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4;
}

export const HeadingRenderer: React.FC<HeadingProps> = ({ level, children, ...props }) => {
  const id = generateIdFromText(children);
  const className = styles[`h${level}`];
  
  if (level === 1) return <h1 id={id} className={className} {...props}>{children}</h1>;
  if (level === 2) return <h2 id={id} className={className} {...props}>{children}</h2>;
  if (level === 3) return <h3 id={id} className={className} {...props}>{children}</h3>;
  return <h4 id={id} className={className} {...props}>{children}</h4>;
};
