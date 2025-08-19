import React, { useState, useEffect, useRef, ReactNode } from 'react';

type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'date' | 'tel';

interface Option {
  value: string;
  label: string;
}

interface EntityFormFieldProps {
  /** Nome del campo (usato come id e name) */
  name: string;
  /** Label da visualizzare */
  label: string;
  /** Tipo di campo */
  type?: FieldType;
  /** Valore corrente */
  value: string | number | boolean | undefined;
  /** Handler per il cambio valore */
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Se il campo è obbligatorio */
  required?: boolean;
  /** Placeholder da visualizzare */
  placeholder?: string;
  /** Messaggio di errore */
  error?: string;
  /** Classi CSS aggiuntive */
  className?: string;
  /** Opzioni per select */
  options?: Option[];
  /** Se il campo è disabilitato */
  disabled?: boolean;
  /** Se il campo è in sola lettura */
  readOnly?: boolean;
  /** Numero di righe per textarea */
  rows?: number;
  /** Icona da visualizzare a sinistra dell'input */
  leftIcon?: ReactNode;
  /** Icona da visualizzare a destra dell'input */
  rightIcon?: ReactNode;
  /** Dimensione del campo */
  size?: 'sm' | 'md' | 'lg';
  /** Stile dell'input */
  variant?: 'default' | 'pill';
  /** Testo di aiuto aggiuntivo */
  helpText?: string;
  /** Se il campo select è ricercabile */
  searchable?: boolean;
  /** Se il campo deve essere multilinea (textarea) */
  multiline?: boolean;
  /** Proprietà HTML aggiuntive */
  [key: string]: any;
}

/**
 * Campo form standardizzato per l'interfaccia utente
 */
const EntityFormField: React.FC<EntityFormFieldProps> = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  error,
  className = '',
  options = [],
  disabled = false,
  readOnly = false,
  rows = 3,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  helpText,
  searchable = false,
  multiline = false,
  ...rest
}) => {
  // Se multiline è true, forza il tipo a textarea
  const fieldType = multiline ? 'textarea' : type;
  // State for select search
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  
  // Ensure value is properly formatted for display
  const displayValue = value !== undefined && value !== null ? String(value) : '';
  
  // Get display label for select options
  const getOptionLabel = () => {
    if (!value || !options.length) return '';
    const option = options.find(opt => opt.value === String(value));
    return option ? option.label : '';
  };
  
  // Reset search term when value changes or component mounts
  useEffect(() => {
    if (fieldType === 'select' && searchable && value) {
      setSearchTerm('');
    }
  }, [value, fieldType, searchable]);
  
  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    console.log(`Field ${name} changed:`, e.target.value);
    onChange(e);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };
  
  // Handle dropdown option click
  const handleOptionClick = (optionValue: string) => {
    // Create synthetic event for onChange handler
    const syntheticEvent = {
      target: {
        name,
        value: optionValue
      }
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onChange(syntheticEvent);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };
  
  // Dimensioni del campo in base alla proprietà size
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };
  
  // Stile dell'input in base alla variante
  const variantClasses = {
    default: 'rounded-md',
    pill: 'rounded-full',
  };
  
  // Classe base per gli input
  const baseInputClass = `
    block w-full border 
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'} 
    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'} 
    ${readOnly ? 'bg-gray-50' : ''}
    shadow-sm focus:outline-none focus:ring-2 
    transition-colors duration-200
    ${variantClasses[variant]}
    ${fieldType !== 'textarea' ? sizeClasses[size] : ''}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
  `;
  
  // Classi per checkbox/radio
  const checkboxClass = `
    h-5 w-5 
    ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} 
    rounded
    ${disabled ? 'bg-gray-100 text-gray-400' : 'text-blue-600'}
    transition-colors duration-200
  `;
  
  // Renderizza il campo appropriato in base al tipo
  const renderField = () => {
    switch (fieldType) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={displayValue}
            onChange={handleInputChange}
            className={`${baseInputClass} py-2 px-3 resize-none`}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            {...rest}
          />
        );
        
      case 'select':
        if (searchable) {
          // Filter options based on search term
          const filteredOptions = options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          return (
            <div className="relative">
              {leftIcon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {leftIcon}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                className={`${baseInputClass} px-3 cursor-pointer pr-8`}
                placeholder={placeholder || 'Cerca...'}
                onClick={() => setIsDropdownOpen(true)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                onChange={handleSearchChange}
                value={isDropdownOpen ? searchTerm : getOptionLabel() || searchTerm}
                readOnly={disabled}
                disabled={disabled}
              />
              <div 
                className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen && inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                      <div className="px-3 py-2 text-gray-500">Nessun risultato</div>
                    ) : (
                      filteredOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                            value === option.value ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleOptionClick(option.value)}
                        >
                          {option.label}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {/* Hidden select for form submission - actually hidden now */}
              <select
                ref={selectRef}
                name={name}
                value={displayValue}
                onChange={handleInputChange}
                className="hidden"
                required={required}
                disabled={disabled}
              >
                <option value="">Seleziona...</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        
        return (
          <div className="relative">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                {leftIcon}
              </div>
            )}
            <select
              id={name}
              name={name}
              value={displayValue}
              onChange={handleInputChange}
              className={`${baseInputClass} px-3 pr-8 appearance-none`}
              disabled={disabled}
              required={required}
              {...rest}
            >
              <option value="">{placeholder || 'Seleziona...'}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M7 7l3 3 3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={Boolean(value)}
              onChange={handleInputChange}
              className={checkboxClass}
              disabled={disabled}
              required={required}
              {...rest}
            />
          </div>
        );
        
      case 'radio':
        return (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="radio"
              checked={Boolean(value)}
              onChange={handleInputChange}
              className={`${checkboxClass} rounded-full`}
              disabled={disabled}
              required={required}
              {...rest}
            />
          </div>
        );
        
      default:
        return (
          <div className="relative">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                {leftIcon}
              </div>
            )}
            <input
              id={name}
              name={name}
              type={fieldType}
              value={displayValue}
              onChange={handleInputChange}
              className={`${baseInputClass} px-3`}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              {...rest}
            />
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        );
    }
  };
  
  // Render the complete field with label and error
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
      
      {renderField()}
      
      {helpText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default EntityFormField;