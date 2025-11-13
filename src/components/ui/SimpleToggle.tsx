import React from 'react';

interface SimpleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function SimpleToggle({ checked, onChange, className = '' }: SimpleToggleProps) {
  const uniqueId = React.useId();

  return (
    <label htmlFor={uniqueId} className={`relative inline-flex cursor-pointer items-center ${className}`}>
      <input
        type="checkbox"
        id={uniqueId}
        className="peer sr-only" // Hide the default checkbox but keep it accessible
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {/* Background */}
      <div
        className="h-[1.15rem] w-8 rounded-full bg-gray-300 peer-checked:bg-green-500 transition-colors dark:bg-gray-600"
      ></div>
      {/* Thumb */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[calc(100%-2px)]"
      ></div>
    </label>
  );
}
