import React from "react";
import { FaSpinner } from "react-icons/fa6";
import { useUser } from "../../contexts/UserContext";
import { useColorMode } from "../../contexts/ColorMode";

export default function CommonButton(props) {
  const { children , onClick, isPending, isDisabled, extraClasses} = props;
  const { user } = useUser();
  const { colorMode } = useColorMode();


  let isBtnDisabled = false;

  if (!user || !user._id || isPending) {
    isBtnDisabled = true;
  }
  
  let pendingSpinner = <span />;
  if (isPending) {
    pendingSpinner = <FaSpinner className="animate-spin inline-flex ml-2" />;
  }

  const bgColor = colorMode === 'dark' ? `text-neutral-100  border-2 border-neutral-500 from-gray-950 to-gray-800 text-white hover:from-gray-800 hover:text-neutral-100` :
    `text-neutral-100  from-blue-500 to-blue-600  hover:bg-blue-60 hover:text-neutral-300
    
    `;
  return (
    <button onClick={onClick} className={`m-auto text-center min-w-16
    rounded-lg shadow-sm 
    ${bgColor}
    font-bold
  
    bg-gradient-to-r 
    pl-8 pr-8 pt-2 pb-2 text-bold
    shadow-lg 
    cursor:pointer 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-neutral-100 ${extraClasses}`}
    disabled={isBtnDisabled || isDisabled} 
    >
      {children}
      {pendingSpinner}
    </button>
  )
}