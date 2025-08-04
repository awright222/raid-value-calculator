import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getItemTypesByCategory, ITEM_CATEGORIES } from '../types/itemTypes';
import type { ItemType } from '../types/itemTypes';

interface ItemAutocompleteProps {
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ItemAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Type to search items...",
  className = ""
}: ItemAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get all items flattened with category info
  const allItems: (ItemType & { category: string })[] = Object.entries(ITEM_CATEGORIES).flatMap(
    ([_, categoryName]) =>
      getItemTypesByCategory(categoryName).map(item => ({
        ...item,
        category: categoryName
      }))
  );

  // Filter items based on search term
  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected item name for display
  const selectedItem = allItems.find(item => item.id === value);
  const displayValue = selectedItem ? selectedItem.name : searchTerm;

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset search when value changes externally
    if (value && selectedItem) {
      setSearchTerm('');
    }
  }, [value, selectedItem]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setSelectedIndex(-1);
    
    // If input is cleared, clear the selection
    if (!newSearchTerm && !selectedItem) {
      onChange('');
    }
  };

  const handleItemSelect = (itemId: string) => {
    onChange(itemId);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
          handleItemSelect(filteredItems[selectedIndex].id);
        } else if (filteredItems.length === 1) {
          handleItemSelect(filteredItems[0].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Delay hiding to allow for item clicks
    setTimeout(() => {
      setIsOpen(false);
      if (!selectedItem && !searchTerm) {
        setSearchTerm('');
      }
    }, 150);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full pr-10"
          autoComplete="off"
        />
        
        {/* Search/dropdown icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            )}
          </svg>
        </div>

        {/* Selected item indicator */}
        {selectedItem && !searchTerm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </motion.div>
        )}
      </div>

      {/* Dropdown list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            <ul ref={listRef} className="py-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(item.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                        index === selectedIndex ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{item.category}</span>
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-gray-500 text-sm">
                  No items found for "{searchTerm}"
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
