import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useColorMode } from '../../contexts/ColorMode.js';
import { FaFastForward } from "react-icons/fa";
import { MdExplore } from "react-icons/md";
import { MdCreateNewFolder } from "react-icons/md";
import SingleSelect from './SingleSelect.js';
import { aspectRatioOptions } from '../../utils/canvas.js';


function AddSessionDropdown(props) {
  const {
    createNewSession,
    gotoViewSessionsPage,
    addNewExpressSession,
    addNewVidGPTSession,
    showAddNewMovieMakerSession,
    betaOptionVisible
  } = props;

  const [aspectRatio, setAspectRatio] = useState(aspectRatioOptions[0]);

  useEffect(() => {
    const defaultAspectRatio = localStorage.getItem('defaultAspectRatio');
    if (defaultAspectRatio) {
      const selectedAspectRatio = aspectRatioOptions.find((option) => option.value === defaultAspectRatio);
      if (selectedAspectRatio) {
        setAspectRatio(selectedAspectRatio);
      }
    }
  }, []);

  const { colorMode } = useColorMode();
  const [isOpen, setIsOpen] = useState(false);

  const bgColor = colorMode === 'dark' ? 'bg-gray-900 hover:bg-gray-700' : 'bg-neutral-200 hover:bg-neutral-300';
  const textColor = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-700';


  const borderColor = colorMode === 'dark' ? 'border-gray-600 border-2' : 'border-gray-300 border-2';
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };



  const addNewSession = () => {
    createNewSession(aspectRatio.value);
    setIsOpen(false);
  };

  const viewSessions = () => {
    gotoViewSessionsPage();
    setIsOpen(false);
  };

  const showAddNewExpressSession = () => {
    addNewExpressSession();
    setIsOpen(false);
  }

  const showAddNewVidGPTSession = () => {
    addNewVidGPTSession();
    setIsOpen(false);
  }

  const handleAspectRatioChange = (selectedOption) => {
    console.log(selectedOption);
    localStorage.setItem('defaultAspectRatio', selectedOption.value);
    setAspectRatio(selectedOption);

  }
  return (
    <div className="relative inline-block text-left ">
      <button
        onClick={toggleDropdown}
        className={`inline-flex justify-center w-32 px-4 py-4 
         text-md font-medium 
          rounded-md shadow-sm focus:outline-none ${textColor} ${bgColor}`}
      >
        <FaPlus className="mr-2" />
        <span className="text-xs">New Project</span>
      </button>

      {isOpen && (
        <div className={`absolute left-0 mt-2 w-36 origin-top-right rounded-md
         shadow-lg ring-1 ring-black ring-opacity-5 ${borderColor} z-20`} >
          <div role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <button

              className={`block px-2 py-2 text-sm text-gray-700  w-full text-left ${textColor} ${bgColor}}`}
              role="menuitem"
            >

              <div>
                <SingleSelect
                  options={aspectRatioOptions}
                  onChange={handleAspectRatioChange}
                  value={aspectRatio}
                />
              </div>
              <div>
                <div onClick={addNewSession} className='flex mt-2 hover:bg-gray-600'>
                  <MdCreateNewFolder className='inline-flex text-lg mt-1 cursor-pointer' />

                  <div className='text-lg inline-flex ml-2 '>
                    Create
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={showAddNewExpressSession}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}}`}
              role="menuitem"
            >
              <FaFastForward className='inline-flex ' /> Express Create
            </button>
            <button
              onClick={showAddNewVidGPTSession}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}}`}
              role="menuitem"
            >
              <FaFastForward className='inline-flex ' /> VideoGPT
            </button>  

            {betaOptionVisible && ( 
            <button
              onClick={showAddNewMovieMakerSession}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}}`}
              role="menuitem"
            >
              <FaFastForward className='inline-flex ' /> Movie Maker
            </button>) }      
            <button
              onClick={viewSessions}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}}`}
              role="menuitem"
            >
              <MdExplore className='inline-flex' /> View Projects
            </button>

            
          </div>
        </div>
      )}
    </div>
  );
}

export default AddSessionDropdown;
