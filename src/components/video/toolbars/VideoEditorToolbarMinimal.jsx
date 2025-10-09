import React from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { FaChevronCircleRight , FaChevronCircleLeft} from 'react-icons/fa';
export default function VideoEditorToolbarMinimal(props) {

  const { onToggleDisplay } = props;

  const { colorMode } = useColorMode();

  return (
    <div
      className={`h-full m-auto fixed top-0 overflow-y-auto pl-1 w-[2%] pr-0 transition-colors duration-200 ${
        colorMode === 'dark'
          ? 'bg-slate-950/85 border-l border-white/10 text-slate-100'
          : 'bg-white border-l border-slate-200 text-slate-700 shadow-sm'
      }`}
    >
      <div className='mt-[80px]'>
        <FaChevronCircleLeft
          className={`text-lg cursor-pointer transition-colors duration-150 ${
            colorMode === 'dark' ? 'text-slate-200 hover:text-slate-100' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={onToggleDisplay}
        />
      </div>
    </div>    
  );
}
