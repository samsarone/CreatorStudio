import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';
import SingleSelect from '../../common/SingleSelect.jsx';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { SUPPORTED_LANGUAGES } from '../../../constants/supportedLanguages.js';
import { getHeaders } from '../../../utils/web.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
const VIDEO_API_BASE = `${PROCESSOR_API_URL}/v1/video`;

const OPERATION_OPTIONS = [
  { value: 'translate_video', label: 'Retranslate' },
  { value: 'remove_subtitles', label: 'Remove subtitles' },
  { value: 'add_outro_image', label: 'Add outro image' },
  { value: 'update_outro_image', label: 'Update outro image' },
  { value: 'join_videos', label: 'Join videos' },
  { value: 'cancel_render', label: 'Cancel render' },
];

function normalizeSessionId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitSessionIds(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\s,]+/)
    .map(normalizeSessionId)
    .filter(Boolean);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Unable to request the selected video edit.'
  );
}

export default function VideoEditAdvancedDialog({
  sessionId,
  currentSession = null,
  onClose,
  onRequestAccepted,
}) {
  const { colorMode } = useColorMode();
  const resolvedSessionId = normalizeSessionId(sessionId || currentSession?._id || currentSession?.id);
  const [operationOption, setOperationOption] = useState(OPERATION_OPTIONS[0]);
  const [languageOption, setLanguageOption] = useState(
    SUPPORTED_LANGUAGES.find((language) => language.code === 'es') || SUPPORTED_LANGUAGES[0]
  );
  const [outroImageUrl, setOutroImageUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [addOutroAnimation, setAddOutroAnimation] = useState(false);
  const [addOutroFocusArea, setAddOutroFocusArea] = useState(false);
  const [outroFocusArea, setOutroFocusArea] = useState({
    x: '',
    y: '',
    width: '',
    height: '',
  });
  const [blendScenes, setBlendScenes] = useState(false);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState(() => (
    resolvedSessionId ? [resolvedSessionId] : []
  ));
  const [manualSessionIds, setManualSessionIds] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedRequest, setAcceptedRequest] = useState(null);

  useEffect(() => {
    setSelectedSessionIds((previousIds) => {
      if (!resolvedSessionId || previousIds.includes(resolvedSessionId)) {
        return previousIds;
      }
      return [resolvedSessionId, ...previousIds];
    });
  }, [resolvedSessionId]);

  useEffect(() => {
    const headers = getHeaders();
    if (!headers) {
      return undefined;
    }

    let cancelled = false;
    setIsLoadingSessions(true);
    axios
      .get(`${VIDEO_API_BASE}/list_completed_video_sessions?limit=100`, headers)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const sessions = Array.isArray(response?.data) ? response.data : [];
        setCompletedSessions(sessions);
      })
      .catch(() => {
        if (!cancelled) {
          setCompletedSessions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const languageOptions = useMemo(() => (
    SUPPORTED_LANGUAGES.map((language) => ({
      label: language.name,
      value: language.code,
    }))
  ), []);

  const selectedLanguageOption = useMemo(() => {
    const languageCode = typeof languageOption === 'string'
      ? languageOption
      : languageOption?.value || languageOption?.code;
    return languageOptions.find((option) => option.value === languageCode) || languageOptions[0];
  }, [languageOption, languageOptions]);

  const joinSessionRows = useMemo(() => {
    const rowsById = new Map();
    if (resolvedSessionId) {
      rowsById.set(resolvedSessionId, {
        session_id: resolvedSessionId,
        langauge: currentSession?.sessionLanguage || currentSession?.language || null,
      });
    }

    completedSessions.forEach((session) => {
      const id = normalizeSessionId(session?.session_id || session?.sessionId);
      if (!id || rowsById.has(id)) {
        return;
      }
      rowsById.set(id, session);
    });

    return Array.from(rowsById.values());
  }, [completedSessions, currentSession, resolvedSessionId]);

  const selectedOperation = operationOption?.value || 'translate_video';
  const isOutroOperation = selectedOperation === 'add_outro_image' || selectedOperation === 'update_outro_image';
  const isJoinOperation = selectedOperation === 'join_videos';
  const isTranslateOperation = selectedOperation === 'translate_video';
  const isCancelOperation = selectedOperation === 'cancel_render';

  const surfaceClass = colorMode === 'dark'
    ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d]'
    : 'bg-white text-slate-900 border border-slate-200';
  const mutedClass = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const fieldClass = colorMode === 'dark'
    ? 'bg-[#0b1226] border-[#1f2a3d] text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';
  const secondaryButtonClass = colorMode === 'dark'
    ? 'border border-[#273956] bg-[#111a2f] text-slate-100 hover:bg-[#172642]'
    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const primaryButtonClass = colorMode === 'dark'
    ? 'bg-cyan-400 text-[#06101d] hover:bg-cyan-300'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  const updateFocusAreaField = (key, value) => {
    setOutroFocusArea((previousArea) => ({
      ...previousArea,
      [key]: value,
    }));
  };

  const toggleJoinSession = (nextSessionId) => {
    const normalizedId = normalizeSessionId(nextSessionId);
    if (!normalizedId) {
      return;
    }

    setSelectedSessionIds((previousIds) => {
      if (previousIds.includes(normalizedId)) {
        return previousIds.filter((id) => id !== normalizedId);
      }
      return [...previousIds, normalizedId];
    });
  };

  const buildRequestInput = () => {
    if (!resolvedSessionId && !isJoinOperation) {
      throw new Error('Session id is required.');
    }

    if (isTranslateOperation) {
      const language = selectedLanguageOption?.value;
      if (!language) {
        throw new Error('Select a translation language.');
      }
      return {
        video_session_id: resolvedSessionId,
        language,
        ...(outroImageUrl.trim() ? { outro_image_url: outroImageUrl.trim() } : {}),
      };
    }

    if (selectedOperation === 'remove_subtitles') {
      return {
        video_session_id: resolvedSessionId,
      };
    }

    if (selectedOperation === 'add_outro_image') {
      const trimmedOutroUrl = outroImageUrl.trim();
      if (!trimmedOutroUrl) {
        throw new Error('Outro image URL is required.');
      }

      const input = {
        video_session_id: resolvedSessionId,
        outro_image_url: trimmedOutroUrl,
        add_outro_animation: addOutroAnimation,
        add_outro_focus_area: addOutroFocusArea,
      };

      if (addOutroFocusArea) {
        if (!addOutroAnimation) {
          throw new Error('Outro focus area requires outro animation.');
        }

        const focusAreaValues = {
          x: Number(outroFocusArea.x),
          y: Number(outroFocusArea.y),
          width: Number(outroFocusArea.width),
          height: Number(outroFocusArea.height),
        };
        const hasInvalidFocusArea = Object.values(focusAreaValues).some((value) => (
          !Number.isFinite(value)
        ));
        if (hasInvalidFocusArea) {
          throw new Error('Outro focus area requires numeric x, y, width, and height.');
        }
        input.outro_focust_area = focusAreaValues;
      }

      return input;
    }

    if (selectedOperation === 'update_outro_image') {
      const trimmedOutroUrl = outroImageUrl.trim();
      if (!trimmedOutroUrl) {
        throw new Error('Outro image URL is required.');
      }
      return {
        video_session_id: resolvedSessionId,
        outro_image_url: trimmedOutroUrl,
      };
    }

    if (isJoinOperation) {
      const uniqueIds = Array.from(new Set([
        ...selectedSessionIds.map(normalizeSessionId).filter(Boolean),
        ...splitSessionIds(manualSessionIds),
      ]));

      if (uniqueIds.length < 2) {
        throw new Error('Select or enter at least two session ids to join.');
      }

      return {
        session_ids: uniqueIds,
        blend_scenes: blendScenes,
      };
    }

    if (isCancelOperation) {
      return {
        video_session_id: resolvedSessionId,
      };
    }

    throw new Error('Select a video edit operation.');
  };

  const submitAdvancedEdit = async () => {
    const headers = getHeaders();
    if (!headers) {
      setErrorMessage('Sign in before requesting a video edit.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setAcceptedRequest(null);

    try {
      const input = buildRequestInput();
      const trimmedWebhookUrl = isCancelOperation ? '' : webhookUrl.trim();
      const payload = {
        input,
        ...(trimmedWebhookUrl ? { webhookUrl: trimmedWebhookUrl } : {}),
      };

      const response = await axios.post(`${VIDEO_API_BASE}/${selectedOperation}`, payload, headers);
      const responseData = response?.data || {};
      const nextRequest = {
        operation: selectedOperation,
        requestId: responseData.request_id || responseData.requestId || responseData.session_id || responseData.sessionId,
        sessionId: responseData.session_id || responseData.sessionId || responseData.request_id || responseData.requestId,
        status: responseData.status || 'PENDING',
        response: responseData,
      };

      setAcceptedRequest(nextRequest);
      if (typeof onRequestAccepted === 'function') {
        onRequestAccepted(nextRequest);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative w-[min(92vw,760px)] max-h-[82vh] overflow-y-auto rounded-2xl p-5 text-left shadow-2xl ${surfaceClass}`}>
      <button
        type="button"
        className={`absolute right-4 top-4 rounded-full p-2 ${secondaryButtonClass}`}
        onClick={onClose}
        aria-label="Close"
      >
        <FaTimes />
      </button>

      <div className="pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Advanced video edit</h2>
          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-300">
            Express
          </span>
        </div>
        <div className={`mt-1 text-xs ${mutedClass}`}>Session {resolvedSessionId || '-'}</div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">Route</label>
          <SingleSelect
            value={operationOption}
            onChange={(option) => setOperationOption(option || OPERATION_OPTIONS[0])}
            options={OPERATION_OPTIONS}
            className="w-full"
            isSearchable={false}
          />
        </div>

        {isTranslateOperation && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">Language</label>
              <SingleSelect
                value={selectedLanguageOption}
                onChange={(option) => setLanguageOption(option || languageOptions[0])}
                options={languageOptions}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">New outro image URL</label>
              <input
                value={outroImageUrl}
                onChange={(event) => setOutroImageUrl(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldClass}`}
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {isOutroOperation && (
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">Outro image URL</label>
              <input
                value={outroImageUrl}
                onChange={(event) => setOutroImageUrl(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldClass}`}
                placeholder="https://..."
              />
            </div>

            {selectedOperation === 'add_outro_image' && (
              <>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addOutroAnimation}
                      onChange={(event) => {
                        setAddOutroAnimation(event.target.checked);
                        if (!event.target.checked) {
                          setAddOutroFocusArea(false);
                        }
                      }}
                    />
                    Add outro animation
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addOutroFocusArea}
                      onChange={(event) => {
                        setAddOutroFocusArea(event.target.checked);
                        if (event.target.checked) {
                          setAddOutroAnimation(true);
                        }
                      }}
                    />
                    Add focus area
                  </label>
                </div>

                {addOutroFocusArea && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {['x', 'y', 'width', 'height'].map((key) => (
                      <div key={key}>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">{key}</label>
                        <input
                          type="number"
                          value={outroFocusArea[key]}
                          onChange={(event) => updateFocusAreaField(key, event.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldClass}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isJoinOperation && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide">Completed sessions</label>
              {isLoadingSessions && (
                <span className={`inline-flex items-center gap-2 text-xs ${mutedClass}`}>
                  <FaSpinner className="animate-spin" /> Loading
                </span>
              )}
            </div>
            <div className={`max-h-48 overflow-y-auto rounded-xl border p-2 ${colorMode === 'dark' ? 'border-[#1f2a3d]' : 'border-slate-200'}`}>
              {joinSessionRows.length ? (
                <div className="grid gap-2">
                  {joinSessionRows.map((session) => {
                    const rowSessionId = normalizeSessionId(session.session_id || session.sessionId);
                    const checked = selectedSessionIds.includes(rowSessionId);
                    return (
                      <label
                        key={rowSessionId}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${checked ? 'bg-cyan-500/10' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleJoinSession(rowSessionId)}
                        />
                        <span className="min-w-0 flex-1 truncate">{rowSessionId}</span>
                        {session.langauge && (
                          <span className={`text-xs uppercase ${mutedClass}`}>{session.langauge}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className={`px-3 py-6 text-center text-sm ${mutedClass}`}>No completed sessions found.</div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">Additional session ids</label>
              <textarea
                value={manualSessionIds}
                onChange={(event) => setManualSessionIds(event.target.value)}
                className={`min-h-[82px] w-full resize-y rounded-lg border px-3 py-2 text-sm ${fieldClass}`}
                placeholder="session_id_1, session_id_2"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={blendScenes}
                onChange={(event) => setBlendScenes(event.target.checked)}
              />
              Blend scenes
            </label>
          </div>
        )}

        {!isCancelOperation && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">Webhook URL</label>
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldClass}`}
              placeholder="https://..."
            />
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </div>
        )}

        {acceptedRequest && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <FaCheck />
            <span className="min-w-0 truncate">Request accepted: {acceptedRequest.sessionId || acceptedRequest.requestId}</span>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${secondaryButtonClass}`}
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${primaryButtonClass}`}
            onClick={submitAdvancedEdit}
            disabled={isSubmitting}
          >
            {isSubmitting && <FaSpinner className="animate-spin" />}
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
