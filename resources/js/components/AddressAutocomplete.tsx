import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { addressService, AddressSuggestion } from '../services/addressService';

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (address: string, components: {
    street?: string;
    housenumber?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  error?: string;
  label?: string;
  showLabel?: boolean;
  minQueryLength?: number;
  debounceMs?: number;
  limit?: number;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value = '',
  onChange,
  placeholder = 'Rechercher une adresse...',
  className = '',
  disabled = false,
  required = false,
  name = 'address',
  id = 'address-autocomplete',
  error,
  label = 'Adresse',
  showLabel = true,
  minQueryLength = 2,
  debounceMs = 300,
  limit = 5
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update internal state when external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, suggestions, selectedIndex]);

  // Search for addresses with debounce
  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await addressService.searchAddresses(searchQuery, limit, true);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength, limit]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, debounceMs);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    const components = addressService.parseAddressComponents(suggestion);
    onChange?.(suggestion.label, components);
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange?.('', {
      street: '',
      housenumber: '',
      city: '',
      postal_code: '',
      country: '',
      latitude: '',
      longitude: ''
    });
    inputRef.current?.focus();
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.trim().length >= minQueryLength && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-10 py-2 border ${
            error 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed`}
          autoComplete="off"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Effacer"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Aucune adresse trouvée
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id || index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="flex items-start space-x-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {suggestion.label}
                    </div>
                    {suggestion.context && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {suggestion.context}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;