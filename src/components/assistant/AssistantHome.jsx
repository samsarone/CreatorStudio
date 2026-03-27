import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import TextareaAutosize from 'react-textarea-autosize';
import {
  MdChatBubbleOutline,
  MdCloseFullscreen,
  MdDeleteOutline,
  MdMinimize,
  MdOpenInFull,
  MdRefresh,
} from 'react-icons/md';
import { FaCopy } from 'react-icons/fa';

import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useUser } from "../../contexts/UserContext.jsx";
import CommonButton from '../common/CommonButton.tsx';
import SingleSelect from "../common/SingleSelect.jsx";
import { ASSISTANT_MODEL_TYPES } from "../../constants/Types.ts";
import { getHeaders } from "../../utils/web.jsx";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

function normalizeMessageText(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => normalizeMessageText(item))
      .filter(Boolean)
      .join('\n\n');
  }

  if (content && typeof content === 'object') {
    if (content.type === 'input_image' || content.type === 'image_url') {
      return '';
    }
    if (content.type === 'input_text' && typeof content.text === 'string') {
      return content.text;
    }
    if (content.type === 'output_text' && typeof content.text === 'string') {
      return content.text;
    }
    if (typeof content.text === 'string') {
      return content.text;
    }
    if (typeof content.text?.value === 'string') {
      return content.text.value;
    }
    if (typeof content.content === 'string') {
      return content.content;
    }
    if (Array.isArray(content.content)) {
      return normalizeMessageText(content.content);
    }
    if (typeof content.output_text === 'string') {
      return content.output_text;
    }
  }

  return '';
}

function hasMessageImageAttachment(content) {
  if (Array.isArray(content)) {
    return content.some((item) => hasMessageImageAttachment(item));
  }

  if (!content || typeof content !== 'object') {
    return false;
  }

  if (content.type === 'input_image' || content.type === 'image_url') {
    return true;
  }

  if (Array.isArray(content.content)) {
    return hasMessageImageAttachment(content.content);
  }

  return false;
}

function renderMessageContent(messageText) {
  return messageText.split('\n').map((line, lineIndex) => {
    const parts = [];
    const boldPattern = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    if (parts.length === 0) {
      parts.push('');
    }

    return (
      <span key={`line-${lineIndex}`} className="block">
        {parts}
      </span>
    );
  });
}

export default function AssistantHome(props) {
  const {
    submitAssistantQuery,
    sessionMessages = [],
    isAssistantQueryGenerating = false,
    sessionId,
    onSessionMessagesChange,
    onAssistantQueryGeneratingChange,
    onDeleteMessage,
    onResetMessages,
    getFrameImageData,
  } = props;

  const { colorMode } = useColorMode();
  const { user, getUserAPI } = useUser();
  const messagesEndRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [assistantModel, setAssistantModel] = useState(
    ASSISTANT_MODEL_TYPES.find((model) => model.value === 'GPT5.4') || ASSISTANT_MODEL_TYPES[0]
  );
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [includeFrameImage, setIncludeFrameImage] = useState(false);
  const [isPreparingFrameImage, setIsPreparingFrameImage] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userAssistantModel = user.selectedAssistantModel || 'GPT5.4';
    const userAssistantModelOption = ASSISTANT_MODEL_TYPES.find(
      (model) => model.value === userAssistantModel
    );
    if (userAssistantModelOption) {
      setAssistantModel(userAssistantModelOption);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, sessionMessages, isExpanded]);

  const updateUserAssistantModel = async (newModelValue) => {
    try {
      const headers = getHeaders();
      await axios.post(`${PROCESSOR_SERVER}/users/update`, { selectedAssistantModel: newModelValue }, headers);
      getUserAPI();
    } catch (error) {
    }
  };

  const handleAssistantModelChange = (newValue) => {
    setAssistantModel(newValue);
    updateUserAssistantModel(newValue.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedInput = userInput.trim();
    if (!normalizedInput || isAssistantQueryGenerating || isPreparingFrameImage) return;

    let requestOptions;
    if (includeFrameImage && typeof getFrameImageData === 'function') {
      try {
        setIsPreparingFrameImage(true);
        const frameImage = await getFrameImageData();
        if (!frameImage?.dataUrl) {
          window.alert('Unable to capture the current frame image.');
          return;
        }
        requestOptions = { frameImage };
      } catch (error) {
        window.alert('Unable to capture the current frame image.');
        return;
      } finally {
        setIsPreparingFrameImage(false);
      }
    }

    submitAssistantQuery(normalizedInput, requestOptions);
    setUserInput('');
    setIsOpen(true);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    const confirmed = window.confirm('Delete this assistant exchange from the current session?');
    if (!confirmed) return;

    try {
      setDeletingMessageId(messageId);
      if (onDeleteMessage) {
        await onDeleteMessage(messageId);
        return;
      }

      if (!sessionId) return;

      const headers = getHeaders();
      if (!headers) return;
      const response = await axios.post(
        `${PROCESSOR_SERVER}/assistants/delete_session_message`,
        { id: sessionId, messageId },
        headers
      );
      onSessionMessagesChange?.(response?.data?.sessionDetails?.sessionMessages || []);
      onAssistantQueryGeneratingChange?.(Boolean(response?.data?.sessionDetails?.sessionMessageGenerationPending));
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleResetMessages = async () => {
    if (!onResetMessages && !sessionId) return;
    const confirmed = window.confirm('Reset the assistant conversation and start a new session?');
    if (!confirmed) return;

    try {
      setIsResetting(true);
      if (onResetMessages) {
        await onResetMessages();
        return;
      }

      const headers = getHeaders();
      if (!headers) return;
      const response = await axios.post(
        `${PROCESSOR_SERVER}/assistants/reset_session_messages`,
        { id: sessionId },
        headers
      );
      onSessionMessagesChange?.(response?.data?.sessionDetails?.sessionMessages || []);
      onAssistantQueryGeneratingChange?.(false);
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
    }
  };

  const messageList = useMemo(
    () =>
      (sessionMessages || []).map((message, index) => ({
        ...message,
        clientKey: `${message?.id || 'message'}-${message?.role || 'unknown'}-${index}`,
        normalizedText: normalizeMessageText(message?.content),
        hasImageAttachment: hasMessageImageAttachment(message?.content),
      })),
    [sessionMessages]
  );

  const hasConversationActivity =
    messageList.length > 0 || isAssistantQueryGenerating || isPreparingFrameImage;
  const shouldShowConversationArea = isExpanded || hasConversationActivity;

  const launcherShell =
    colorMode === 'dark'
      ? 'border border-slate-700 bg-[#10192f] text-slate-100 shadow-[0_18px_38px_rgba(2,6,23,0.5)]'
      : 'border border-slate-200 bg-white text-slate-900 shadow-[0_16px_34px_rgba(15,23,42,0.18)]';
  const panelShell =
    colorMode === 'dark'
      ? 'border border-slate-700 bg-[#0f172a] text-slate-100'
      : 'border border-slate-200 bg-white text-slate-900';
  const subtleText = colorMode === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const headerButtonShell =
    colorMode === 'dark'
      ? 'border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900'
      : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200';
  const inputShell =
    colorMode === 'dark'
      ? 'border border-slate-700 bg-slate-950 text-slate-100'
      : 'border border-slate-200 bg-slate-50 text-slate-900';
  const emptyStateShell =
    colorMode === 'dark'
      ? 'border border-dashed border-slate-700 bg-slate-950/50 text-slate-400'
      : 'border border-dashed border-slate-200 bg-slate-50 text-slate-500';
  const panelDimensions = isExpanded
    ? 'fixed inset-4 md:inset-6'
    : hasConversationActivity
    ? 'fixed bottom-20 right-4 w-[min(92vw,420px)] h-[min(72vh,680px)]'
    : 'fixed bottom-20 right-4 w-[min(92vw,420px)]';
  const canIncludeFrameImage = typeof getFrameImageData === 'function';

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`group inline-flex items-center gap-3 rounded-full px-4 py-3 transition ${launcherShell}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#46bfff] to-[#39d881] text-[#041420] shadow-[0_10px_24px_rgba(70,191,255,0.28)]">
          <MdChatBubbleOutline className="text-[22px]" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-sm font-semibold">Assistant</span>
        </span>
      </button>

      {isOpen ? (
        <div className={`${panelDimensions} ${isExpanded ? 'right-4 bottom-4' : ''}`}>
          <div
            className={`flex ${isExpanded || hasConversationActivity ? 'h-full' : ''} flex-col overflow-hidden rounded-3xl shadow-[0_28px_80px_rgba(15,23,42,0.3)] ${panelShell}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/10 px-4 py-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Assistant</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden w-40 md:block">
                  <SingleSelect
                    options={ASSISTANT_MODEL_TYPES}
                    value={assistantModel}
                    onChange={handleAssistantModelChange}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetMessages}
                  disabled={(!onResetMessages && !sessionId) || isResetting}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50 ${headerButtonShell}`}
                  title="Start a new assistant session"
                >
                  <MdRefresh className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${headerButtonShell}`}
                  title={isExpanded ? 'Switch to condensed view' : 'Expand assistant'}
                >
                  {isExpanded ? (
                    <MdCloseFullscreen className="text-[18px]" />
                  ) : (
                    <MdOpenInFull className="text-[18px]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${headerButtonShell}`}
                  title="Collapse assistant"
                >
                  <MdMinimize className="text-[18px]" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 md:hidden">
              <SingleSelect
                options={ASSISTANT_MODEL_TYPES}
                value={assistantModel}
                onChange={handleAssistantModelChange}
              />
            </div>

            {shouldShowConversationArea ? (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messageList.length > 0 ? (
                <div className="space-y-3">
                  {messageList.map((message) => {
                    const isUserMessage = message.role === 'user';
                    const bubbleShell = isUserMessage
                      ? colorMode === 'dark'
                        ? 'border border-slate-700 bg-[#111c32]'
                        : 'border border-slate-200 bg-slate-50'
                      : colorMode === 'dark'
                      ? 'border border-slate-700 bg-slate-950'
                      : 'border border-slate-200 bg-white';

                    return (
                      <div
                        key={message.clientKey}
                        className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`w-full max-w-[92%] rounded-2xl px-3 py-3 ${bubbleShell}`}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                            <div className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                              {isUserMessage ? 'User' : 'Assistant'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={subtleText}>
                                {message.timestamp ? dayjs(message.timestamp).format('MMM D, h:mm A') : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(message.normalizedText)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${headerButtonShell}`}
                                title="Copy message"
                              >
                                <FaCopy className="text-[11px]" />
                                <span>Copy</span>
                              </button>
                              {onDeleteMessage || sessionId ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(message.id)}
                                  disabled={deletingMessageId === message.id}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition disabled:opacity-50 ${headerButtonShell}`}
                                  title="Delete this exchange"
                                >
                                  <MdDeleteOutline className="text-[14px]" />
                                  <span>Delete</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {isUserMessage && message.hasImageAttachment ? (
                            <div className="mb-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                  colorMode === 'dark'
                                    ? 'border-slate-600 bg-slate-900 text-slate-300'
                                    : 'border-slate-200 bg-white text-slate-500'
                                }`}
                              >
                                Frame image
                              </span>
                            </div>
                          ) : null}
                          <div className="text-sm leading-6 break-words whitespace-pre-wrap">
                            {renderMessageContent(message.normalizedText)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                  <div className={`flex h-full min-h-[88px] items-center justify-center rounded-2xl ${emptyStateShell}`}>
                    {isAssistantQueryGenerating || isPreparingFrameImage ? (
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#46bfff]" />
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#39d881] [animation-delay:120ms]" />
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f97316] [animation-delay:240ms]" />
                      </div>
                    ) : (
                      <MdChatBubbleOutline className="text-[24px] opacity-40" />
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="border-t border-slate-200/10 px-4 py-4">
              <TextareaAutosize
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                className={`mb-3 w-full resize-none rounded-2xl px-3 py-3 focus:outline-none ${inputShell}`}
                minRows={2}
                maxRows={10}
                placeholder="Ask the assistant about this session..."
              />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {canIncludeFrameImage ? (
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        colorMode === 'dark'
                          ? 'border-slate-700 bg-slate-950 text-slate-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includeFrameImage}
                        onChange={(event) => setIncludeFrameImage(event.target.checked)}
                        disabled={isAssistantQueryGenerating || isPreparingFrameImage}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-[#46bfff]"
                      />
                      <span>Include frame image</span>
                    </label>
                  ) : null}
                </div>
                <CommonButton
                  isPending={isAssistantQueryGenerating || isPreparingFrameImage}
                  extraClasses="min-w-[120px]"
                >
                  Send
                </CommonButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
