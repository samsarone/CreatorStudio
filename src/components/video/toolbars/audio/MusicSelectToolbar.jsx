import React, { useState, useEffect } from 'react';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';
import { TOOLBAR_ACTION_VIEW } from '../../../../constants/Types.ts';
import SecondaryButton from '../../../common/SecondaryButton.tsx';

export default function MusicSelectToolbar(props) {

  const { audioLayer, setCurrentCanvasAction, submitAddTrackToProject } = props;

  const [audioData, setAudioData] = useState([]);

  useEffect(() => {
    const audioData = audioLayer.remoteAudioData;
    setAudioData(audioData);

  }, [audioLayer]);


  const { colorMode } = useColorMode();

  const showAudioSubOptionsDisplay = (index) => {
    const newAudioLayers = audioData.map((layer, i) => {
      if (i === index) {
        return {
          ...layer,
          isOptionSelected: true
        }
      } else {
        return {
          ...layer,
          isOptionSelected: false
        }
      }
    });
    setAudioData(newAudioLayers);
  }

  const panelSurface =
    colorMode === 'dark'
      ? 'bg-slate-950/85 text-slate-100 border border-white/10'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const inputSurface =
    colorMode === 'dark'
      ? 'bg-slate-900/60 border border-white/10 text-slate-100'
      : 'bg-white border border-slate-200 text-slate-900 shadow-sm';

  const latestLayer = audioData[audioData.length - 1];
  if (!latestLayer) {
    return;
  }

  const addTrackSubmit = (evt, index) => {

    const formData = new FormData(evt.target);

    const startTimestamp = formData.get('track');
 
    evt.preventDefault();

    const volume = formData.get('volume');
    let payload = {
      startTime: startTimestamp,
      volume: volume
    }

    if (audioLayer.generationType === 'music') {
      const duration = 120;
      const endTime = startTimestamp + duration;
      payload = {
        ...payload,
        endTime: endTime,
        duration: duration,
      }
    }

    

    submitAddTrackToProject(index, payload);


  }

  const audioPreviewDisplay = audioData.map((layer, index) => {

    const previewUrl = layer.audio_url;
    let optionsSelectDisplay = <span />;
    if (layer.isOptionSelected) {
      optionsSelectDisplay = (
        <div className={`${panelSurface} mt-3 rounded-lg p-3`}>
          <form onSubmit={(evt) => addTrackSubmit(evt, index)} className="grid grid-cols-3 gap-3 items-end">
            <div>
              <input
                type='text'
                name="track"
                placeholder='Start timestamp (secs)'
                defaultValue={0}
                className={`${inputSurface} h-10 w-full rounded-md px-3 py-2 bg-transparent`}
              />
              <div className='text-xs mt-1 text-center'>
                Start Time (secs)
              </div>
            </div>
            <div>
              <input
                type='text'
                name="volume"
                placeholder='Volume'
                defaultValue={100}
                className={`${inputSurface} h-10 w-full rounded-md px-3 py-2 bg-transparent`}
              />
              <div className='text-xs mt-1 text-center'>
                Volume
              </div>
            </div>
            <SecondaryButton type="submit" className="w-full">
              Add
            </SecondaryButton>
          </form>
        </div>
      )
    }

    let selectButton = layer.isOptionSelected ? <span /> : <SecondaryButton>
      Select
    </SecondaryButton>

    return (
      <div onClick={() => showAudioSubOptionsDisplay(index)}>
        <div className='text-sm cursor-pointer'>
          {layer.title}
        </div>
        <div>
          <audio controls className='w-[200px] h-[40px]' >
            <source src={previewUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
        <div>
          {selectButton}
        </div>
        <div>
          {optionsSelectDisplay}
        </div>
      </div>
    )
  });


  
  return (
    <div className={`${panelSurface} rounded-xl p-4 space-y-4`}>
      <div>
        <button
          className="text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_MUSIC_GENERATE_DISPLAY)}
        >
          Back
        </button>
      </div>
      <div className="space-y-4">
        {audioPreviewDisplay}
      </div>
    </div>
  );
}
