import React, { useState } from 'react';
import axios from 'axios';
import { FaCopy, FaDownload, FaSpinner, FaTimes } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { getHeaders } from '../../../utils/web.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

function normalizeSessionId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Unable to complete this advanced action.'
  );
}

function toFiniteNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function formatTimestamp(value) {
  const totalMilliseconds = Math.max(0, Math.round(toFiniteNumber(value) * 1000));
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (input, length = 2) => String(input).padStart(length, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
}

function getAudioLayerId(audioLayer) {
  return audioLayer?._id?.toString?.() || audioLayer?._id || audioLayer?.id || null;
}

function getAudioLayerSpeaker(audioLayer = {}) {
  return (
    audioLayer.speakerCharacterName ||
    audioLayer.speaker ||
    audioLayer.actor ||
    ''
  );
}

function getSubtitleText(item = {}) {
  return (
    item.text ||
    item.normalizedText ||
    item.config?.text ||
    ''
  ).toString().replace(/\s+/g, ' ').trim();
}

function isSubtitleItem(item = {}) {
  return item?.type === 'text' && item?.subType === 'subtitle';
}

function mergeTranscriptRows(rows = [], frameDurationSeconds = 1 / 16) {
  const sortedRows = [...rows].sort((left, right) => left.startTime - right.startTime);
  const mergedRows = [];

  sortedRows.forEach((row) => {
    const previousRow = mergedRows[mergedRows.length - 1];
    const canMerge = previousRow &&
      previousRow.text === row.text &&
      previousRow.audioLayerId === row.audioLayerId &&
      row.startTime - previousRow.endTime <= Math.max(0.12, frameDurationSeconds * 2);

    if (canMerge) {
      previousRow.endTime = Math.max(previousRow.endTime, row.endTime);
      return;
    }

    mergedRows.push({ ...row });
  });

  return mergedRows;
}

function buildSubtitleTranscriptRows(sessionDetails = {}) {
  const framesPerSecond = Math.max(1, toFiniteNumber(sessionDetails.framesPerSecond, 16));
  const audioLayerMap = new Map();
  const audioLayers = Array.isArray(sessionDetails.audioLayers) ? sessionDetails.audioLayers : [];

  audioLayers.forEach((audioLayer) => {
    const id = getAudioLayerId(audioLayer);
    if (id) {
      audioLayerMap.set(id.toString(), audioLayer);
    }
  });

  const rows = [];
  const layers = Array.isArray(sessionDetails.layers) ? sessionDetails.layers : [];

  layers.forEach((layer) => {
    const layerStartTime = toFiniteNumber(layer?.durationOffset ?? layer?.startTime, 0);
    const activeItemList = Array.isArray(layer?.imageSession?.activeItemList)
      ? layer.imageSession.activeItemList
      : [];

    activeItemList.forEach((item) => {
      if (!isSubtitleItem(item)) {
        return;
      }

      const text = getSubtitleText(item);
      if (!text) {
        return;
      }

      const frameOffset = toFiniteNumber(item?.config?.frameOffset, 0);
      const frameDuration = Math.max(1, toFiniteNumber(item?.config?.frameDuration, 1));
      const startTime = layerStartTime + frameOffset / framesPerSecond;
      const endTime = startTime + frameDuration / framesPerSecond;
      const audioLayerId = item.audioLayerId?.toString?.() || item.audioLayerId || null;
      const audioLayer = audioLayerId ? audioLayerMap.get(audioLayerId.toString()) : null;

      rows.push({
        startTime,
        endTime,
        text,
        audioLayerId,
        speaker: item.speaker || getAudioLayerSpeaker(audioLayer),
      });
    });
  });

  return mergeTranscriptRows(rows, 1 / framesPerSecond);
}

function buildAudioPromptTranscriptRows(sessionDetails = {}) {
  const audioLayers = Array.isArray(sessionDetails.audioLayers) ? sessionDetails.audioLayers : [];

  return audioLayers
    .filter((audioLayer) => {
      const generationType = typeof audioLayer?.generationType === 'string'
        ? audioLayer.generationType.toLowerCase()
        : '';
      return generationType === 'speech' && typeof audioLayer?.prompt === 'string' && audioLayer.prompt.trim();
    })
    .map((audioLayer) => {
      const startTime = Math.max(0, toFiniteNumber(audioLayer.startTime, 0));
      const explicitEndTime = toFiniteNumber(audioLayer.endTime, NaN);
      const duration = toFiniteNumber(audioLayer.duration, 0);
      const endTime = Number.isFinite(explicitEndTime) && explicitEndTime > startTime
        ? explicitEndTime
        : startTime + Math.max(0, duration);

      return {
        startTime,
        endTime,
        text: audioLayer.prompt.replace(/\s+/g, ' ').trim(),
        audioLayerId: getAudioLayerId(audioLayer),
        speaker: getAudioLayerSpeaker(audioLayer),
      };
    })
    .sort((left, right) => left.startTime - right.startTime);
}

function buildTranscriptText(sessionDetails = {}) {
  const sessionId = normalizeSessionId(sessionDetails?._id || sessionDetails?.id);
  const subtitleRows = buildSubtitleTranscriptRows(sessionDetails);
  const rows = subtitleRows.length ? subtitleRows : buildAudioPromptTranscriptRows(sessionDetails);

  if (!rows.length) {
    return null;
  }

  const lines = [
    'Samsar session transcript',
    `Session: ${sessionId || '-'}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  rows.forEach((row) => {
    const speaker = row.speaker ? `${row.speaker}: ` : '';
    lines.push(`[${formatTimestamp(row.startTime)} - ${formatTimestamp(row.endTime)}] ${speaker}${row.text}`);
  });

  return `${lines.join('\n')}\n`;
}

function downloadTextFile({ fileName, text }) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function VideoEditAdvancedDialog({
  sessionId,
  currentSession = null,
  onClose,
  onRequestAccepted,
}) {
  const { colorMode } = useColorMode();
  const resolvedSessionId = normalizeSessionId(sessionId || currentSession?._id || currentSession?.id);
  const [pendingAction, setPendingAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const isCopyingSession = pendingAction === 'copy_session';
  const isDownloadingTranscript = pendingAction === 'download_transcript';

  const surfaceClass = colorMode === 'dark'
    ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d]'
    : 'bg-white text-slate-900 border border-slate-200';
  const mutedClass = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const cardClass = colorMode === 'dark'
    ? 'border-[#24324a] bg-[#0b1226]'
    : 'border-slate-200 bg-slate-50';
  const iconClass = colorMode === 'dark'
    ? 'bg-cyan-400/10 text-cyan-200'
    : 'bg-sky-100 text-sky-700';
  const secondaryButtonClass = colorMode === 'dark'
    ? 'border border-[#273956] bg-[#111a2f] text-slate-100 hover:bg-[#172642]'
    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const primaryButtonClass = colorMode === 'dark'
    ? 'bg-cyan-400 text-[#06101d] hover:bg-cyan-300'
    : 'bg-blue-600 text-white hover:bg-blue-700';
  const optionButtonClass = colorMode === 'dark'
    ? 'border border-[#273956] bg-[#111a2f] text-slate-100 hover:bg-[#172642]'
    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

  const getLatestSessionDetails = async () => {
    if (!resolvedSessionId) {
      return currentSession;
    }

    try {
      const headers = getHeaders();
      const response = await axios.get(
        `${PROCESSOR_API_URL}/video_sessions/session_details?id=${resolvedSessionId}`,
        headers
      );
      return response?.data || currentSession;
    } catch {
      return currentSession;
    }
  };

  const submitCopySession = async () => {
    const headers = getHeaders();
    if (!headers) {
      setErrorMessage('Sign in before copying this session.');
      return;
    }

    if (!resolvedSessionId) {
      setErrorMessage('Session id is required.');
      return;
    }

    setPendingAction('copy_session');
    setErrorMessage('');

    try {
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/_copy_session`,
        { sessionId: resolvedSessionId },
        headers
      );
      const responseData = response?.data || {};
      const nextSessionId = normalizeSessionId(
        responseData.session_id ||
        responseData.sessionId ||
        responseData.session?._id ||
        responseData.session?.id
      );

      if (!nextSessionId) {
        throw new Error('Copy completed without a new session id.');
      }

      if (typeof onRequestAccepted === 'function') {
        onRequestAccepted({
          operation: 'copy_session',
          requestId: nextSessionId,
          sessionId: nextSessionId,
          status: 'COMPLETED',
          response: responseData,
        });
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const downloadTranscript = async () => {
    if (!resolvedSessionId && !currentSession) {
      setErrorMessage('Session details are not available.');
      return;
    }

    setPendingAction('download_transcript');
    setErrorMessage('');

    try {
      const sessionDetails = await getLatestSessionDetails();
      const transcriptText = buildTranscriptText(sessionDetails);

      if (!transcriptText) {
        setErrorMessage('No subtitle transcript is available for this session.');
        return;
      }

      const fileSessionId = normalizeSessionId(sessionDetails?._id || sessionDetails?.id || resolvedSessionId) || 'session';
      downloadTextFile({
        fileName: `samsar-transcript-${fileSessionId}.txt`,
        text: transcriptText,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const renderOption = ({ icon, title, description, buttonLabel, onClick, isPending, primary = false }) => (
    <div className={`rounded-xl border p-3 ${cardClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className={`mt-1 text-xs leading-5 ${mutedClass}`}>
            {description}
          </div>
        </div>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto ${primary ? primaryButtonClass : optionButtonClass}`}
          onClick={onClick}
          disabled={Boolean(pendingAction)}
        >
          {isPending ? <FaSpinner className="animate-spin" /> : null}
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`relative w-[min(92vw,520px)] rounded-2xl p-5 text-left shadow-2xl ${surfaceClass}`}>
      <button
        type="button"
        className={`absolute right-4 top-4 rounded-full p-2 ${secondaryButtonClass}`}
        onClick={onClose}
        aria-label="Close"
      >
        <FaTimes />
      </button>

      <div className="pr-12">
        <h2 className="text-lg font-semibold">Advanced options</h2>
        <div className={`mt-1 truncate text-xs ${mutedClass}`}>Session {resolvedSessionId || '-'}</div>
      </div>

      <div className="mt-5 grid gap-3">
        {renderOption({
          icon: <FaCopy />,
          title: 'Deep clone session',
          description: 'Creates a new editable session with copied timeline data and assets.',
          buttonLabel: 'Clone',
          onClick: submitCopySession,
          isPending: isCopyingSession,
          primary: true,
        })}
        {renderOption({
          icon: <FaDownload />,
          title: 'Download transcripts',
          description: 'Downloads the available subtitle transcript with timeline timestamps.',
          buttonLabel: 'Download',
          onClick: downloadTranscript,
          isPending: isDownloadingTranscript,
        })}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${secondaryButtonClass}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
