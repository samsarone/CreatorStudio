import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaCheck, FaCopy, FaDownload, FaPause, FaPlay } from 'react-icons/fa';
import { getHeaders } from '../../../utils/web';
import { useColorMode } from '../../../contexts/ColorMode';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const LIBRARY_SCOPE_PROJECT = 'project';
const LIBRARY_SCOPE_GLOBAL = 'global';
const AUDIO_TYPE_MUSIC = 'music';
const AUDIO_TYPE_SPEECH = 'speech';
const AUDIO_TYPE_SOUND_EFFECT = 'sound_effect';

const EMPTY_GLOBAL_ARTIFACTS = {
  music: [],
  speech: [],
  soundEffect: [],
};

function normalizeAudioLibraryType(generationType) {
  const normalizedGenerationType = typeof generationType === 'string'
    ? generationType.trim().toLowerCase()
    : '';

  if (normalizedGenerationType === 'music' || normalizedGenerationType === 'background_music') {
    return AUDIO_TYPE_MUSIC;
  }

  if (normalizedGenerationType === 'speech' || normalizedGenerationType === 'lip_sync') {
    return AUDIO_TYPE_SPEECH;
  }

  return AUDIO_TYPE_SOUND_EFFECT;
}

function resolveAudioPath(item = {}) {
  if (typeof item.selectedLocalAudioLink === 'string' && item.selectedLocalAudioLink.trim()) {
    return item.selectedLocalAudioLink.trim();
  }

  if (Array.isArray(item.localAudioLinks) && item.localAudioLinks.length > 0) {
    const localAudioLink = item.localAudioLinks.find((link) => typeof link === 'string' && link.trim());
    if (localAudioLink) {
      return localAudioLink.trim();
    }
  }

  if (typeof item.url === 'string' && item.url.trim()) {
    return item.url.trim();
  }

  if (typeof item.selectedRemoteAudioLink === 'string' && item.selectedRemoteAudioLink.trim()) {
    return item.selectedRemoteAudioLink.trim();
  }

  if (Array.isArray(item.remoteAudioLinks) && item.remoteAudioLinks.length > 0) {
    const remoteAudioLink = item.remoteAudioLinks.find((link) => typeof link === 'string' && link.trim());
    if (remoteAudioLink) {
      return remoteAudioLink.trim();
    }
  }

  if (Array.isArray(item.remoteAudioData) && item.remoteAudioData.length > 0) {
    const remoteAudioData = item.remoteAudioData.find((audioData) => (
      typeof audioData?.audio_url === 'string' && audioData.audio_url.trim()
    ));

    if (remoteAudioData?.audio_url) {
      return remoteAudioData.audio_url.trim();
    }
  }

  return null;
}

function resolveAudioUrl(item = {}) {
  const audioPath = resolveAudioPath(item);
  if (!audioPath) {
    return null;
  }

  if (/^https?:\/\//i.test(audioPath)) {
    return audioPath;
  }

  return `${API_SERVER}/${audioPath.replace(/^\/+/, '')}`;
}

function getProjectName(sessionDetails) {
  if (typeof sessionDetails?.sessionName === 'string' && sessionDetails.sessionName.trim()) {
    return sessionDetails.sessionName.trim();
  }

  const sessionId = sessionDetails?._id?.toString?.() || '';
  if (sessionId) {
    return `Project ${sessionId.slice(-6)}`;
  }

  return 'Current Project';
}

function getDisplayTitle(item, libraryType) {
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const speakerCharacterName = typeof item.speakerCharacterName === 'string'
    ? item.speakerCharacterName.trim()
    : '';
  const promptText = getPromptText(item);
  const hasDistinctTitle = title
    && (!promptText || title.toLowerCase() !== promptText.toLowerCase());

  if (libraryType === AUDIO_TYPE_SPEECH) {
    return (hasDistinctTitle ? title : '') || speakerCharacterName || 'Speech';
  }

  if (libraryType === AUDIO_TYPE_MUSIC) {
    return (hasDistinctTitle ? title : '') || 'Music';
  }

  return (hasDistinctTitle ? title : '') || 'Sound Effect';
}

function getPromptText(item = {}) {
  const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
  if (prompt) {
    return prompt;
  }

  const description = typeof item.description === 'string' ? item.description.trim() : '';
  return description;
}

function getDefaultDurationValue(item = {}) {
  const parsedDuration = Number(item.duration);
  if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
    return `${parsedDuration}`;
  }

  return '5';
}

function formatTimelineValue(value) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  const roundedValue = Math.round(value * 10) / 10;
  return Number.isInteger(roundedValue) ? `${roundedValue}` : roundedValue.toFixed(1);
}

function getItemTags(item, libraryType) {
  const tagSet = new Set();

  if (Array.isArray(item.tags)) {
    item.tags.forEach((tag) => {
      if (typeof tag === 'string' && tag.trim()) {
        tagSet.add(tag.trim());
      }
    });
  }

  if (libraryType === AUDIO_TYPE_SPEECH && typeof item.speakerCharacterName === 'string' && item.speakerCharacterName.trim()) {
    tagSet.add(item.speakerCharacterName.trim());
  }

  if (typeof item.generationType === 'string' && item.generationType.trim()) {
    tagSet.add(item.generationType.trim());
  }

  return Array.from(tagSet);
}

function mapSessionAudioLayerToLibraryItem(audioLayer, index, sessionDetails) {
  const audioPath = resolveAudioPath(audioLayer);
  if (!audioPath) {
    return null;
  }

  const libraryType = normalizeAudioLibraryType(audioLayer?.generationType);
  const sessionId = sessionDetails?._id?.toString?.() || '';

  return {
    ...audioLayer,
    _id: audioLayer?._id?.toString?.() || audioLayer?._id || `${sessionId}:${libraryType}:${index}`,
    sessionId,
    projectId: sessionId,
    projectName: getProjectName(sessionDetails),
    libraryType,
    title: getDisplayTitle(audioLayer, libraryType),
    description: typeof audioLayer?.prompt === 'string' ? audioLayer.prompt : '',
    url: audioPath,
    tags: getItemTags(audioLayer, libraryType),
  };
}

function matchesAudioSearch(item, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) {
    return true;
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const searchableText = [
    item?.title,
    item?.description,
    item?.prompt,
    item?.projectName,
    item?.speakerCharacterName,
    item?.generationType,
    ...(Array.isArray(item?.tags) ? item.tags : []),
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedSearchTerm);
}

function formatTime(time) {
  if (!Number.isFinite(time)) {
    return '00:00';
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}

function getAudioTypeLabel(audioType) {
  if (audioType === AUDIO_TYPE_SPEECH) {
    return 'Speech';
  }

  if (audioType === AUDIO_TYPE_SOUND_EFFECT) {
    return 'Sound Effect';
  }

  return 'Music';
}

function getScopeLabel(scope) {
  return scope === LIBRARY_SCOPE_GLOBAL ? 'Global' : 'Project';
}

export default function MusicLibraryHome({
  onSelectMusic,
  hideSelectButton,
  sessionDetails,
  sessionId,
}) {
  const [globalArtifacts, setGlobalArtifacts] = useState(EMPTY_GLOBAL_ARTIFACTS);
  const [selectedScope, setSelectedScope] = useState(LIBRARY_SCOPE_PROJECT);
  const [selectedAudioType, setSelectedAudioType] = useState(AUDIO_TYPE_MUSIC);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingSongId, setPlayingSongId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGlobalLibraryLoading, setIsGlobalLibraryLoading] = useState(false);
  const [globalLibraryError, setGlobalLibraryError] = useState('');
  const [addConfigByItemId, setAddConfigByItemId] = useState({});
  const [copiedPromptId, setCopiedPromptId] = useState(null);

  const audioRef = useRef(new Audio());
  const { colorMode } = useColorMode();

  const textColor = colorMode === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const borderColor = colorMode === 'dark' ? 'border-[#1f2a3d]' : 'border-slate-200';
  const cardBg = colorMode === 'dark' ? 'bg-[#0f1629]' : 'bg-white';
  const headerBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-50';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const surfaceButton = colorMode === 'dark'
    ? 'bg-[#0b1224] hover:bg-[#0f1629]'
    : 'bg-white hover:bg-slate-100';
  const activeButton = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
  const selectButtonBg = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90';
  const tagBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-100';
  const iconColor = colorMode === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const sliderAccent = colorMode === 'dark' ? '#6366f1' : '#2563eb';
  const sliderTrack = colorMode === 'dark' ? '#1f2a3d' : '#e2e8f0';

  useEffect(() => {
    let isMounted = true;

    const fetchGlobalLibrary = async () => {
      const headers = getHeaders();
      if (!headers || !sessionId) {
        if (isMounted) {
          setGlobalArtifacts(EMPTY_GLOBAL_ARTIFACTS);
          setIsGlobalLibraryLoading(false);
        }
        return;
      }

      setIsGlobalLibraryLoading(true);
      setGlobalLibraryError('');

      try {
        const response = await axios.get(
          `${API_SERVER}/audio/user_music_library?sessionId=${encodeURIComponent(sessionId)}`,
          headers
        );

        if (!isMounted) {
          return;
        }

        setGlobalArtifacts(response.data?.globalArtifacts || EMPTY_GLOBAL_ARTIFACTS);
      } catch {
        if (!isMounted) {
          return;
        }

        setGlobalArtifacts(EMPTY_GLOBAL_ARTIFACTS);
        setGlobalLibraryError('Unable to load global audio artefacts.');
      } finally {
        if (isMounted) {
          setIsGlobalLibraryLoading(false);
        }
      }
    };

    fetchGlobalLibrary();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setPlayingSongId(null);
      setCurrentTime(0);
      setDuration(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const sessionAudioLayers = Array.isArray(sessionDetails?.audioLayers) ? sessionDetails.audioLayers : [];
  const projectItems = sessionAudioLayers
    .map((audioLayer, index) => mapSessionAudioLayerToLibraryItem(audioLayer, index, sessionDetails))
    .filter(Boolean);

  const filteredProjectItems = projectItems.filter((item) => (
    item.libraryType === selectedAudioType && matchesAudioSearch(item, searchTerm)
  ));

  const selectedGlobalGroups = selectedAudioType === AUDIO_TYPE_MUSIC
    ? globalArtifacts.music
    : selectedAudioType === AUDIO_TYPE_SPEECH
      ? globalArtifacts.speech
      : globalArtifacts.soundEffect;

  const filteredGlobalGroups = (Array.isArray(selectedGlobalGroups) ? selectedGlobalGroups : [])
    .map((group) => ({
      ...group,
      items: (Array.isArray(group.items) ? group.items : []).filter((item) => matchesAudioSearch(item, searchTerm)),
    }))
    .filter((group) => group.items.length > 0);

  const handlePlayPause = (item) => {
    const audio = audioRef.current;
    const audioUrl = resolveAudioUrl(item);
    if (!audioUrl) {
      return;
    }

    if (playingSongId === item._id) {
      audio.pause();
      setPlayingSongId(null);
      return;
    }

    if (playingSongId) {
      audio.pause();
    }

    audio.src = audioUrl;
    audio
      .play()
      .then(() => {
        setPlayingSongId(item._id);
      })
      .catch(() => {});
  };

  const handleDownload = async (item) => {
    const audioUrl = resolveAudioUrl(item);
    if (!audioUrl) {
      return;
    }

    try {
      const response = await axios.get(audioUrl, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const fileName = `${(item.title || 'audio').replace(/[^a-z0-9-_]+/gi, '_')}.mp3`;

      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {}
  };

  const getAddConfig = (item) => {
    const currentConfig = addConfigByItemId[item._id] || {};

    return {
      startTime: currentConfig.startTime ?? '0',
      duration: currentConfig.duration ?? getDefaultDurationValue(item),
    };
  };

  const getValidatedAddConfig = (item) => {
    const currentConfig = getAddConfig(item);
    const startTime = Number(currentConfig.startTime);
    const durationValue = Number(currentConfig.duration);
    const isValid = Number.isFinite(startTime)
      && startTime >= 0
      && Number.isFinite(durationValue)
      && durationValue > 0;

    return {
      ...currentConfig,
      parsedStartTime: startTime,
      parsedDuration: durationValue,
      endTime: isValid ? startTime + durationValue : null,
      isValid,
    };
  };

  const updateAddConfig = (item, field, value) => {
    setAddConfigByItemId((previousConfigByItemId) => {
      const existingItemConfig = previousConfigByItemId[item._id] || {
        startTime: '0',
        duration: getDefaultDurationValue(item),
      };

      return {
        ...previousConfigByItemId,
        [item._id]: {
          ...existingItemConfig,
          [field]: value,
        },
      };
    });
  };

  const handleAddToProject = (item) => {
    const validatedConfig = getValidatedAddConfig(item);
    if (!validatedConfig.isValid || !onSelectMusic) {
      return;
    }

    onSelectMusic(item, {
      startTime: validatedConfig.parsedStartTime,
      duration: validatedConfig.parsedDuration,
    });
  };

  const handleCopyPrompt = async (item) => {
    const promptText = getPromptText(item);
    if (!promptText || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPromptId(item._id);
      window.setTimeout(() => {
        setCopiedPromptId((currentPromptId) => (
          currentPromptId === item._id ? null : currentPromptId
        ));
      }, 1200);
    } catch {}
  };

  const handleSeekChange = (e) => {
    const nextTime = Number(e.target.value);
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const renderAudioCard = (item) => {
    const isPlaying = playingSongId === item._id;
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const promptText = getPromptText(item);
    const displayTitle = getDisplayTitle(item, item.libraryType);
    const addConfig = getAddConfig(item);
    const validatedAddConfig = getValidatedAddConfig(item);

    return (
      <div key={item._id} className={`rounded-xl border ${borderColor} ${cardBg} p-4 shadow-sm`}>
        <div className="mb-3 flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-full border ${borderColor} ${surfaceButton}`}
            onClick={() => handlePlayPause(item)}
          >
            {isPlaying ? (
              <FaPause className={iconColor} />
            ) : (
              <FaPlay className={iconColor} />
            )}
          </button>

          {isPlaying && (
            <div className="flex-1 mx-2 flex items-center gap-2">
              <span className="text-sm">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeekChange}
                className="flex-1 appearance-none h-2 rounded-full"
                style={{
                  accentColor: sliderAccent,
                  background: `linear-gradient(to right, ${sliderAccent} 0%, ${sliderAccent} ${(duration ? currentTime / duration : 0) * 100}%, ${sliderTrack} ${(duration ? currentTime / duration : 0) * 100}%, ${sliderTrack} 100%)`,
                }}
              />
              <span className="text-sm">{formatTime(duration)}</span>
            </div>
          )}

          <button
            className={`px-3 py-2 rounded-full border ${borderColor} ${surfaceButton}`}
            onClick={() => handleDownload(item)}
          >
            <FaDownload className={iconColor} />
          </button>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{displayTitle}</h2>
            <p className={`mt-1 text-xs ${mutedText}`}>
              {item.speakerCharacterName || item.projectName || getAudioTypeLabel(item.libraryType)}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tagBg}`}>
            {getAudioTypeLabel(item.libraryType)}
          </span>
        </div>

        {promptText && (
          <div className={`mt-3 rounded-lg border ${borderColor} ${headerBg} p-3`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>
                Prompt
              </span>
              <button
                type="button"
                className={`inline-flex items-center gap-1 text-xs font-semibold ${mutedText}`}
                onClick={() => handleCopyPrompt(item)}
              >
                {copiedPromptId === item._id ? (
                  <>
                    <FaCheck />
                    Copied
                  </>
                ) : (
                  <>
                    <FaCopy />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm line-clamp-2 whitespace-pre-wrap">
              {promptText}
            </p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3">
            {tags.map((tag) => (
              <span
                key={`${item._id}-${tag}`}
                className={`inline-block ${tagBg} text-sm px-2 py-1 rounded mr-1 mt-1`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!hideSelectButton && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="block">
                <span className={`mb-1 block text-xs font-semibold ${mutedText}`}>Start</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={addConfig.startTime}
                  onChange={(e) => updateAddConfig(item, 'startTime', e.target.value)}
                  className={`w-full rounded-lg border ${borderColor} ${surfaceButton} px-3 py-2 text-sm focus:outline-none`}
                />
              </label>

              <label className="block">
                <span className={`mb-1 block text-xs font-semibold ${mutedText}`}>Duration</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={addConfig.duration}
                  onChange={(e) => updateAddConfig(item, 'duration', e.target.value)}
                  className={`w-full rounded-lg border ${borderColor} ${surfaceButton} px-3 py-2 text-sm focus:outline-none`}
                />
              </label>

              <div className="block">
                <span className={`mb-1 block text-xs font-semibold ${mutedText}`}>End</span>
                <div className={`w-full rounded-lg border ${borderColor} ${headerBg} px-3 py-2 text-sm`}>
                  {formatTimelineValue(validatedAddConfig.endTime)}
                </div>
              </div>
            </div>

            <button
              className={`mt-4 w-full ${selectButtonBg} px-3 py-2 rounded-lg font-semibold shadow disabled:cursor-not-allowed disabled:opacity-60`}
              onClick={() => handleAddToProject(item)}
              disabled={!validatedAddConfig.isValid}
            >
              Add To Project
            </button>
          </>
        )}
        {hideSelectButton && (
          <p className={`mt-3 text-xs ${mutedText}`}>Click play to preview and download.</p>
        )}
      </div>
    );
  };

  const renderProjectContent = () => {
    if (filteredProjectItems.length === 0) {
      return (
        <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 text-sm ${mutedText}`}>
          No {getAudioTypeLabel(selectedAudioType).toLowerCase()} artefacts found in this project.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProjectItems.map((item) => renderAudioCard(item))}
      </div>
    );
  };

  const renderGlobalContent = () => {
    if (isGlobalLibraryLoading) {
      return (
        <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 text-sm ${mutedText}`}>
          Loading global audio artefacts...
        </div>
      );
    }

    if (globalLibraryError) {
      return (
        <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 text-sm ${mutedText}`}>
          {globalLibraryError}
        </div>
      );
    }

    if (filteredGlobalGroups.length === 0) {
      return (
        <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 text-sm ${mutedText}`}>
          No global {getAudioTypeLabel(selectedAudioType).toLowerCase()} artefacts found.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {filteredGlobalGroups.map((group) => (
          <section key={`${selectedAudioType}-${group.projectId}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{group.projectName}</h2>
                <p className={`text-xs ${mutedText}`}>
                  {group.items.length} {group.items.length === 1 ? 'track' : 'tracks'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.items.map((item) => renderAudioCard(item))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-4 pb-32 md:pb-16 ${textColor}`}>
      <div className={`rounded-2xl border ${borderColor} ${cardBg} p-4 shadow-sm space-y-4`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audio Library</h1>
            <p className={`mt-1 text-sm ${mutedText}`}>
              {getScopeLabel(selectedScope)} {getAudioTypeLabel(selectedAudioType)} artefacts
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <input
              type="text"
              placeholder="Search audio"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`min-w-[220px] xl:min-w-[280px] px-3 py-2 text-sm rounded-lg border ${borderColor} ${surfaceButton} focus:outline-none`}
            />

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                {[LIBRARY_SCOPE_PROJECT, LIBRARY_SCOPE_GLOBAL].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setSelectedScope(scope)}
                    className={`px-3 py-2 text-sm rounded-lg border ${borderColor} ${
                      selectedScope === scope ? activeButton : surfaceButton
                    }`}
                  >
                    {getScopeLabel(scope)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[AUDIO_TYPE_MUSIC, AUDIO_TYPE_SPEECH, AUDIO_TYPE_SOUND_EFFECT].map((audioType) => (
                  <button
                    key={audioType}
                    onClick={() => setSelectedAudioType(audioType)}
                    className={`px-3 py-2 text-sm rounded-lg border ${borderColor} ${
                      selectedAudioType === audioType ? activeButton : `${surfaceButton} ${headerBg}`
                    }`}
                  >
                    {getAudioTypeLabel(audioType)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedScope === LIBRARY_SCOPE_PROJECT ? renderProjectContent() : renderGlobalContent()}
    </div>
  );
}
