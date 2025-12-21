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
  const containerBg =
    colorMode === 'dark'
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d] shadow-[0_14px_36px_rgba(0,0,0,0.35)]'
      : 'bg-white text-slate-800 border border-slate-200 shadow-sm';
  const itemHoverBg =
    colorMode === 'dark'
      ? 'hover:bg-[#111a2f]'
      : 'hover:bg-slate-100';

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
        className={`inline-flex justify-center w-full px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-colors duration-150 ${containerBg} ${itemHoverBg}`}
      >
        <FaPlus className="mr-2" />
        <span className="text-xs">Add</span>
      </button>

      {/* MAIN DROPDOWN MENU */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-36 origin-top-right rounded-lg shadow-xl shadow-slate-900/30 ring-1 ring-black/5 ${containerBg}`}
          style={{ zIndex: 100 }}
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            
            {/* PARENT ITEM for "Add layer" */}
            <div
              className={`px-3 py-2 text-sm w-full text-left flex items-center justify-between cursor-pointer transition-colors duration-150 ${itemHoverBg}`}
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
                  className={`block px-3 py-1.5 text-sm text-left w-full rounded-md focus:outline-none transition-colors duration-150 ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('below')}
                >
                  Below current
                </button>
                <button
                  className={`block px-3 py-1.5 text-sm text-left w-full rounded-md focus:outline-none transition-colors duration-150 ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('end')}
                >
                  At end
                </button>
                <button
                  className={`block px-3 py-1.5 text-sm text-left w-full rounded-md focus:outline-none transition-colors duration-150 ${itemHoverBg}`}
                  onClick={() => handleAddLayerClick('beginning')}
                >
                  At beginning
                </button>
              </div>
            )}

            {/* COPY CURRENT LAYER */}
            <button
              onClick={copyCurrentLayer}
              className={`block px-3 py-2 text-sm w-full text-left rounded-md focus:outline-none transition-colors duration-150 ${itemHoverBg}`}
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
              className={`block px-3 py-2 text-sm w-full text-left rounded-md focus:outline-none transition-colors duration-150 ${itemHoverBg}`}
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
