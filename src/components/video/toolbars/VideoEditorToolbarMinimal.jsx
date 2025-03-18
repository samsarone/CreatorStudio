import React from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { FaChevronCircleRight , FaChevronCircleLeft} from 'react-icons/fa';
export default function VideoEditorToolbarMinimal(props) {

  const { onToggleDisplay } = props;

  const { colorMode } = useColorMode();

  let bgColor = "bg-gray-900 border-neutral-800";
  if (colorMode === 'light') {
    bgColor = "bg-neutral-50 text-neutral-900";
  }

  let buttonBgcolor = "bg-gray-900 text-white";
  if (colorMode === 'light') {
    buttonBgcolor = "bg-stone-200 text-neutral-900";
  }

  let textInnerColor = colorMode === 'dark' ? 'text-neutral-900' : 'text-white';
  const text2Color = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';


  return (
    <div className={`border-l-2 border-stone-200 ${bgColor} h-full m-auto fixed top-0 
    overflow-y-auto pl-1 r-4 w-[2%] pr-0 `}>
      <div className='mt-[80px]'>
        <FaChevronCircleLeft className='text-neutral-100 text-lg cursor-pointer ' onClick={onToggleDisplay}/>
      </div>
    </div>    
  );
}