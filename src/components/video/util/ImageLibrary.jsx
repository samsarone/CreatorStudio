import React, { useState } from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import { getRemoteImageLink } from '../../../utils/image.jsx'
import { FaChevronCircleLeft } from 'react-icons/fa';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;


export default function ImageLibrary(props) {
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

  const panelSurface =
    colorMode === 'dark'
      ? 'bg-slate-950/85 text-slate-100 border border-white/10'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const cardSurface =
    colorMode === 'dark'
      ? 'bg-slate-900/60 border border-white/10'
      : 'bg-white border border-slate-200 shadow-sm';

  const imagesLinks = generationImages.map((image) => {
    const imageLink = getRemoteImageLink(image.src);
    return (
      <div key={imageLink} className={`image-item ${cardSurface} rounded-xl overflow-hidden transition-transform duration-150 hover:shadow-lg hover:-translate-y-1`}>
        <img
          src={imageLink}
          alt="generationImage"
          onClick={() => handleImageClick(imageLink)}
          className="w-full h-full object-cover cursor-pointer"
        />
        {selectedImage === imageLink && (
          <div className="p-2">
            <SecondaryButton onClick={() => handleSelect(imageLink)} className="w-full justify-center">
              Select
            </SecondaryButton>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className={`w-full h-full overflow-y-auto ${panelSurface} rounded-2xl pl-4 pr-4 pt-6 pb-6 mt-[50px] space-y-4`}>
      <div className='mb-2 mt-2'>
        <div
          className='inline-flex float-left cursor-pointer items-center gap-2 text-sm font-medium'
          onClick={() => resetImageLibrary()}
        >
          <FaChevronCircleLeft className='text-lg' />
          <span>Back</span>
        </div>
        <h2 className='text-lg font-bold'>Image Library</h2>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
        {imagesLinks}
      </div>
    </div>
  );
}
