import React from 'react';

export function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  className = '',
  as = 'input',
  rows = 4,
  ...props
}) {
  const inputId = id || name;

  const baseInputStyles = `w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
    error
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
  } ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {as === 'textarea' ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={baseInputStyles}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseInputStyles}
          {...props}
        />
      )}

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
