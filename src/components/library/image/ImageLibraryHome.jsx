import React, { useState } from 'react';


import { useColorMode } from '../../../contexts/ColorMode.jsx';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import { getRemoteImageLink } from '../../../utils/image.jsx'
import { FaChevronCircleLeft } from 'react-icons/fa';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;


export default function ImageLibraryHome(props) {
  const { generationImages, selectImageFromLibrary, resetImageLibrary } = props;
  const [selectedImage, setSelectedImage] = useState(null);

  const { colorMode } = useColorMode();

  const handleImageClick = (imageLink) => {
    setSelectedImage(imageLink);
  };

  const handleSelect = (imageLink) => {
    const imagePath = imageLink.replace(`${API_SERVER}`, '');
    selectImageFromLibrary(imagePath);
    setSelectedImage(null);
  };

  const bgColor = colorMode === 'dark' ? 'bg-gray-800 ' : 'bg-gray-200';

  const textColor = colorMode === 'dark' ? 'text-white' : 'text-black';

  const imagesLinks = generationImages.map((image) => {
    const imageLink = getRemoteImageLink(image.src);
    return (
      <div key={imageLink} className={`image-item `}>
        <img
          src={imageLink}
          alt="generationImage"
          onClick={() => handleImageClick(imageLink)}
          style={{ cursor: 'pointer' }}
        />
        {selectedImage === imageLink && (
          <SecondaryButton onClick={() => handleSelect(imageLink)}
          >Select</SecondaryButton>
        )}
      </div>
    );
  });

  return (
    <div className={`w-full h-full overflow-y-auto ${bgColor}  ${textColor} pl-2 pr-2 pt-4 pb-4`}>


      <div className='grid grid-cols-4 gap-1'>
        {imagesLinks}
      </div>
    </div>
  );
}
