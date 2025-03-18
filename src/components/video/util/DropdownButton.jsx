import React, { useState, useEffect } from 'react';
import { FaPlus, FaChevronRight } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode';

function DropdownButton(props) {
  const {
    addLayerToComposition, // function to add a layer with the chosen position
    copyCurrentLayerBelow,
    showBatchLayerDialog
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [defaultSubOption, setDefaultSubOption] = useState(null); // default sub-option

  const { colorMode } = useColorMode();

  // Container & hover colors separated
  const containerBg = colorMode === 'dark' ? 'bg-gray-900' : 'bg-neutral-200';
  const itemHoverBg = colorMode === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-neutral-300';
  const textColor = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-700';

  useEffect(() => {
    const storedOption = localStorage.getItem('defaultAddLayerSubOption');
    if (storedOption) {
      setDefaultSubOption(storedOption);
    } else {
      setDefaultSubOption('below');
    }
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsSubMenuOpen(false);
    }
  };

  const toggleSubMenu = (e) => {
    // Stop propagation so clicking on parent doesn't close the menu immediately
    e.stopPropagation();
    setIsSubMenuOpen(!isSubMenuOpen);
  };

  const handleAddLayerClick = (option) => {
    localStorage.setItem('defaultAddLayerSubOption', option);
    setDefaultSubOption(option);
    addLayerToComposition(option);
    setIsSubMenuOpen(false);
    setIsOpen(false);
  };

  const copyCurrentLayer = () => {
    copyCurrentLayerBelow();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      {/* MAIN "Add" BUTTON */}
      <button
        onClick={toggleDropdown}
        className={`inline-flex justify-center w-full px-4 py-2
          text-sm font-medium border border-gray-300
          rounded-md shadow-sm focus:outline-none
          ${textColor} ${containerBg} ${itemHoverBg}`}
      >
        <FaPlus className="mr-2" />
        <span className="text-xs">Add</span>
      </button>

      {/* MAIN DROPDOWN MENU */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-32 origin-top-right 
                      rounded-md shadow-lg ring-1 ring-black ring-opacity-5
                      ${textColor} ${containerBg}`}
          style={{ zIndex: 100 }}
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            
            {/* PARENT ITEM for "Add layer" */}
            <div
              className={`px-2 py-2 text-sm w-full text-left
                          flex items-center justify-between
                          cursor-pointer ${textColor} ${itemHoverBg}`}
              onClick={toggleSubMenu}
              role="menuitem"
            >
              <span>Add layer</span>
              <FaChevronRight className="ml-2" />
            </div>

            {/* SUB-MENU OPTIONS */}
            {isSubMenuOpen && (
              <div className="ml-4 mt-1 space-y-1">
                <button
                  className={`block px-2 py-1 text-sm text-left w-full 
                              focus:outline-none ${textColor} ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('below')}
                >
                  Below current
                </button>
                <button
                  className={`block px-2 py-1 text-sm text-left w-full 
                              focus:outline-none ${textColor} ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('end')}
                >
                  At end
                </button>
                <button
                  className={`block px-2 py-1 text-sm text-left w-full 
                              focus:outline-none ${textColor} ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('beginning')}
                >
                  At beginning
                </button>
              </div>
            )}

            {/* COPY CURRENT LAYER */}
            <button
              onClick={copyCurrentLayer}
              className={`block px-2 py-2 text-sm w-full text-left
                          focus:outline-none ${textColor} ${itemHoverBg}`}
              role="menuitem"
            >
              Copy current
            </button>

            {/* ADD BATCH */}
            <button
              onClick={() => {
                showBatchLayerDialog();
                setIsOpen(false);
              }}
              className={`block px-2 py-2 text-sm w-full text-left
                          focus:outline-none ${textColor} ${itemHoverBg}`}
              role="menuitem"
            >
              Add Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DropdownButton;
