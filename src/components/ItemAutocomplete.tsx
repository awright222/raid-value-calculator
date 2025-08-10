import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const displayValue = selectedItem ? selectedItem.name : '';

  useEffect(() => {
    if (!isModalOpen) {
      setSelectedIndex(-1);
      setSearchTerm('');
    } else {
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  useEffect(() => {
    // Reset search when value changes externally
    if (value && selectedItem) {
      setSearchTerm('');
    }
  }, [value, selectedItem]);

  const handleInputClick = () => {
    setIsModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
  };

  const handleItemSelect = (itemId: string) => {
    onChange(itemId);
    setSearchTerm('');
    setIsModalOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isModalOpen) return;

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
        setIsModalOpen(false);
        break;
    }
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
    <>
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onClick={handleInputClick}
          readOnly
          placeholder={placeholder}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full pr-10 cursor-pointer"
        />
        
        {/* Search icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Removed selected item indicator as it was covering text */}
      </div>

      {/* Search Modal with Portal */}
      {isModalOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
            style={{ zIndex: 2147483647 }} // Maximum z-index value
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              style={{ zIndex: 2147483647 }} // Maximum z-index value
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Search Items</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Search Input */}
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type to search items..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <ul ref={listRef} className="p-2">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item, index) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleItemSelect(item.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                              index === selectedIndex ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-lg">{item.name}</span>
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {item.category}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-8 text-center text-gray-500">
                        {searchTerm ? `No items found for "${searchTerm}"` : 'Start typing to search items...'}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
