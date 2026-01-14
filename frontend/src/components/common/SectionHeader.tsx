import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className
}) => {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between${
        className ? ` ${className}` : ''
      }`}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="sm:text-right">{action}</div>}
    </div>
  );
};

export default SectionHeader;
