import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, selected, interactive, className = '', ...props }, ref) => {
    const baseStyles = 'rounded-xl border p-4 transition-all';
    const interactiveStyles = interactive
      ? 'cursor-pointer hover:border-primary/50 hover:bg-surface-hover'
      : '';
    const selectedStyles = selected
      ? 'border-primary bg-primary/10'
      : 'border-border bg-surface';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${interactiveStyles} ${selectedStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
