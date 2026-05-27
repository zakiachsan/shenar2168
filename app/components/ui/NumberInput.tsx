'use client';

import React, { useState, useEffect } from 'react';

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

function formatThousand(num: string): string {
  const clean = num.replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  prefix,
  suffix,
  disabled,
  required,
  className = '',
  id,
}: NumberInputProps) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const str = String(value ?? '');
    setDisplay(formatThousand(str));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d]/g, '');
    const formatted = formatThousand(cleaned);
    setDisplay(formatted);
    onChange(cleaned);
  };

  const handleBlur = () => {
    const clean = display.replace(/\./g, '');
    let num = clean ? parseInt(clean, 10) : 0;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    const final = String(num);
    setDisplay(formatThousand(final));
    onChange(final);
  };

  const baseClasses =
    'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`${baseClasses} ${className} ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
