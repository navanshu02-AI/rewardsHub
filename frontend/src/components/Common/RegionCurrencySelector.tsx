import React from 'react';
import { useAuth, REGION_CONFIG, Region } from '../../contexts/AuthContext';

interface RegionCurrencySelectorProps {
  label?: string;
  onChange?: (region: Region) => void;
  align?: 'left' | 'right';
}

const RegionCurrencySelector: React.FC<RegionCurrencySelectorProps> = ({ label, onChange, align = 'left' }) => {
  const { region, setRegionCurrency } = useAuth();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = event.target.value as Region;
    const config = REGION_CONFIG[newRegion];
    setRegionCurrency(newRegion, config.currency);
    onChange?.(newRegion);
  };

  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {label && <span className="text-sm text-gray-600 mb-1">{label}</span>}
      <select
        value={region}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
      >
        {(Object.keys(REGION_CONFIG) as Region[]).map((option) => (
          <option key={option} value={option}>
            {REGION_CONFIG[option].flag} {REGION_CONFIG[option].label} ({REGION_CONFIG[option].currency})
          </option>
        ))}
      </select>
    </div>
  );
};

export default RegionCurrencySelector;
