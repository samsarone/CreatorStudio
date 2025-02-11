import React from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';


export default function VideoAiVideoOptionsViewer(props) {
  const {
    currentLayer,           // you likely already pass this in from your parent
    onDeleteLayer,          // prop to handle Delete
    onRegenerateLayer,      // prop to handle Regenerate
    onRequestLipSync,       // prop to handle Request Lip Sync
    removeVideoLayer,
  } = props;




  const handleDeleteLayer = () => {
    // Make sure the parent-provided handler exists
    if (onDeleteLayer) {
      removeVideoLayer(currentLayer);
    }
  };

  return (
    <div className="mt-2">
      {/* Delete button */}
      <div className="mb-2">
        <SecondaryButton onClick={handleDeleteLayer}>
          Delete Layer
        </SecondaryButton>
      </div>

    </div>
  );
}