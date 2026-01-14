import React from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary:
    'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400'
};

const baseButtonClasses =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => {
  const classes = [baseButtonClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
};

export default Button;
