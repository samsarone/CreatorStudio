import React from 'react';
import MusicLibraryHome from '../library/audio/MusicLibraryHome';
export default function MusicPanelContent() {
  return (
    <div className='mb-4 mt-4 pt-4 pb-4 h-auto overflow-scroll'>
      <div className='h-[600px] '>
      <MusicLibraryHome hideSelectButton={true}/>
      </div>

    </div>
  )
}