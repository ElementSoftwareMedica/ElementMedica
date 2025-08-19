import React from 'react';

interface CheckboxCellProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

const CheckboxCell: React.FC<CheckboxCellProps> = ({
  checked,
  onChange,
  className = ''
}) => (
  <div
    data-col="select"
    className={`checkbox-cell flex items-center justify-center ${className}`}
    onClick={(e) => e.stopPropagation()}
    style={{ width: '100%', padding: 0 }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-blue-600"
    />
  </div>
);

export default CheckboxCell; 