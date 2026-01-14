import React from 'react';

type CardProps<T extends React.ElementType = 'div'> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const baseCardClasses = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

const Card = <T extends React.ElementType = 'div'>({
  as,
  className = '',
  ...props
}: CardProps<T>) => {
  const Component = as ?? 'div';
  const classes = [baseCardClasses, className].filter(Boolean).join(' ');
  return <Component className={classes} {...props} />;
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader: React.FC<CardHeaderProps> = ({ className = '', ...props }) => {
  const classes = ['px-6 pt-6', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent: React.FC<CardContentProps> = ({ className = '', ...props }) => {
  const classes = ['p-6', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
};

export { Card, CardHeader, CardContent };
