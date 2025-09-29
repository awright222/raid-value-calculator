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
  const listRef = useRef<HTMLDivElement>(null);

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

  // Group filtered items by category for display
  const groupedItems = filteredItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, (ItemType & { category: string })[]>);

  // Get selected item name for display
  const selectedItem = allItems.find(item => item.id === value);
  const displayValue = selectedItem ? selectedItem.name : '';

  useEffect(() => {
    if (!isModalOpen) {
      setSelectedIndex(-1);
      setSearchTerm('');
    } else {
      // Clear search term and focus input when modal opens
      setSearchTerm('');
      setSelectedIndex(-1);
      // Use a slightly longer timeout to ensure DOM is ready
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Ensure the input is ready for typing
          searchInputRef.current.select();
        }
      }, 150);
    }
  }, [isModalOpen]);

  useEffect(() => {
    // Reset search when value changes externally
    if (value && selectedItem) {
      setSearchTerm('');
    }
  }, [value, selectedItem]);

  const handleInputClick = () => {
    setSearchTerm(''); // Clear search term when opening
    setSelectedIndex(-1); // Reset selection
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
    if (selectedIndex >= 0 && listRef.current && filteredItems.length > 0) {
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        // Find the button element for the selected item
        const buttonElement = listRef.current.querySelector(`button[data-item-id="${selectedItem.id}"]`);
        if (buttonElement) {
          buttonElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedIndex, filteredItems]);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 2147483647 }} // Maximum z-index value
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
              style={{ zIndex: 2147483647 }} // Maximum z-index value
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    Search Items
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Enhanced Search Input */}
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    key={isModalOpen ? 'open' : 'closed'} // Force re-render when modal opens
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type to search items..."
                    className="w-full px-5 py-4 bg-white/95 backdrop-blur border-0 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-white text-gray-900 placeholder-gray-500 text-lg font-medium shadow-lg"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results with improved styling */}
              <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
                <div className="h-full overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(85vh - 200px)' }}>
                  <div ref={listRef} className="p-4">
                    {filteredItems.length > 0 ? (
                      Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
                        <div key={categoryName} className="mb-6 last:mb-4">
                          {/* Enhanced Category separator - removed sticky positioning */}
                          <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 backdrop-blur-sm px-4 py-3 mb-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                              <div className="w-3 h-3 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"></div>
                              {categoryName}
                              <span className="ml-auto text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                                {categoryItems.length}
                              </span>
                            </h4>
                          </div>
                          {/* Enhanced Category items */}
                          <div className="space-y-2">
                            {categoryItems.map((item) => {
                              const globalIndex = filteredItems.findIndex(i => i.id === item.id);
                              return (
                                <div key={item.id}>
                                  <button
                                    type="button"
                                    data-item-id={item.id}
                                    onClick={() => handleItemSelect(item.id)}
                                    className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 ${
                                      globalIndex === selectedIndex 
                                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-[1.02]' 
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 dark:hover:from-primary-900/20 dark:hover:to-blue-900/20 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700'
                                    } border border-gray-200 dark:border-gray-700 shadow-sm`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`font-semibold text-lg ${
                                        globalIndex === selectedIndex ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                                      }`}>
                                        {item.name}
                                      </span>
                                      {globalIndex === selectedIndex && (
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {searchTerm ? 'No items found' : 'Start searching'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm ? `No items match "${searchTerm}"` : 'Type to search through all available items'}
                        </p>
                      </div>
                    )}
                  </div>
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
