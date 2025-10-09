// SpeechSelectToolbar.jsx
import React, { useEffect, useState } from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import { TOOLBAR_ACTION_VIEW } from '../../../../constants/Types.ts';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';
import SingleSelect from '../../../common/SingleSelect.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

export default function SpeechSelectToolbar(props) {
  const {
    audioLayer,
    submitAddTrackToProject,
    setCurrentCanvasAction,
    currentLayer,
  } = props;

  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(audioLayer.duration || 5);
  const [volume, setVolume] = useState(100);
  const [addSubtitles, setAddSubtitles] = useState(true);

  const subtitleOptions = [
    { value: 'groupRows', label: 'Group Rows' },
    { value: 'groupWords', label: 'Group Words' },
    { value: 'highlightWords', label: 'Highlight Words' },
  ];

  const [selectedSubtitleOption, setSelectedSubtitleOption] = useState(subtitleOptions[0]);

  useEffect(() => {
    setStartTime(currentLayer.durationOffset);
    setDuration(audioLayer.duration);
  }, [currentLayer, audioLayer]);

  const { colorMode } = useColorMode();

  const panelSurface =
    colorMode === 'dark'
      ? 'bg-slate-950/85 text-slate-100 border border-white/10'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const inputSurface =
    colorMode === 'dark'
      ? 'bg-slate-900/60 text-slate-100 border border-white/10'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const textEmphasis = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';

  const audioUrl = `${PROCESSOR_API_URL}/${audioLayer.localAudioLinks[0]}`;

  const handleSubmit = (evt) => {
    evt.preventDefault();
    const payload = {
      startTime: parseFloat(startTime),
      duration: parseFloat(duration),
      volume: parseFloat(volume),
      endTime: parseFloat(startTime) + parseFloat(duration),
      addSubtitles,
      speakerCharacterName: audioLayer.speakerCharacterName,
      subtitleOption: selectedSubtitleOption?.value,
    };

    submitAddTrackToProject(0, payload);
  };

  return (
    <div className={`${panelSurface} p-4 rounded-xl space-y-4`}>
      <div>
        <audio controls className="w-full">
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3 items-center">
          <div>
            <input
              type="number"
              name="startTime"
              placeholder="Start Time (secs)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${inputSurface} h-10 w-full rounded-md px-3 py-2 bg-transparent`}
            />
            <div className="text-xs text-center mt-1">Start</div>
          </div>
          <div>
            <input
              type="number"
              name="duration"
              placeholder="Duration (secs)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`${inputSurface} h-10 w-full rounded-md px-3 py-2 bg-transparent`}
            />
            <div className="text-xs text-center mt-1">Duration</div>
          </div>
          <div>
            <input
              type="number"
              name="volume"
              placeholder="Volume"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className={`${inputSurface} h-10 w-full rounded-md px-3 py-2 bg-transparent`}
            />
            <div className="text-xs text-center mt-1">Volume</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center text-xs">
            <input
              type="checkbox"
              checked={addSubtitles}
              onChange={(e) => setAddSubtitles(e.target.checked)}
              className="mr-2"
            />
            <span className={textEmphasis}>Subtitles</span>
          </label>
        </div>

        {addSubtitles && (
          <div className="space-y-2 text-xs">
            <label htmlFor="subtitleOptionSelect" className={`block font-medium ${textEmphasis}`}>
              Subtitle Options
            </label>
            <SingleSelect
              id="subtitleOptionSelect"
              options={subtitleOptions}
              value={selectedSubtitleOption}
              onChange={(option) => setSelectedSubtitleOption(option)}
            />
          </div>
        )}

        <div className="pt-2 flex justify-between">
          <SecondaryButton type="submit">Add to Project</SecondaryButton>
          <SecondaryButton onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY)}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </div>
  );
}
