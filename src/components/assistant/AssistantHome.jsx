import React, { useState, useRef, useEffect } from 'react';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import CommonButton from '../common/CommonButton.tsx';
import { FaCopy } from 'react-icons/fa';
import { MdMinimize } from 'react-icons/md';
import dayjs from 'dayjs';
import TextareaAutosize from 'react-textarea-autosize';
import { ASSISTANT_MODEL_TYPES } from "../../constants/Types.ts";

// Additional imports for user logic & SingleSelect:
import { useUser } from "../../contexts/UserContext.jsx";
import SingleSelect from "../common/SingleSelect.jsx";
import axios from "axios";
import { getHeaders } from "../../utils/web.jsx";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function AssistantHome(props) {
  const { submitAssistantQuery, sessionMessages, isAssistantQueryGenerating } = props;

  
  const { colorMode } = useColorMode();
  const messagesEndRef = useRef(null);

  // Grab user from context
  const { user, getUserAPI } = useUser();

  // Chat panel open/close
  const [isOpen, setIsOpen] = useState(false);

  // Form input
  const [userInput, setUserInput] = useState('');

  // Local state for the user’s assistant model
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODEL_TYPES[0]);

  // On component mount or whenever `user` changes, synchronize the local assistantModel
  useEffect(() => {
    if (user) {
      // If user.selectedAssistantModel not set, default to "GPT4O"
      const userAssistantModel = user.selectedAssistantModel || "GPT4O";
      const userAssistantModelOption = ASSISTANT_MODEL_TYPES.find(
        (model) => model.value === userAssistantModel
      );
      if (userAssistantModelOption) {
        setAssistantModel(userAssistantModelOption);
      }
    }
  }, [user]);

  // Helper: Update user’s assistant model on the server
  const updateUserAssistantModel = async (newModelValue) => {
    try {
      const headers = getHeaders(); // or however you form your headers
      const payload = { selectedAssistantModel: newModelValue };
      await axios.post(`${PROCESSOR_SERVER}/users/update`, payload, headers);
      // Optionally re-fetch user if you want updated context
      getUserAPI();
    } catch (error) {
      
    }
  };

  // SingleSelect change handler
  const handleAssistantModelChange = (newVal) => {
    setAssistantModel(newVal);
    updateUserAssistantModel(newVal.value);
  };

  // Toggle assistant open/close
  const toggleAssistant = () => {
    setIsOpen(!isOpen);
  };

  // Input change
  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  // Send chat on Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    submitAssistantQuery(userInput);
    setUserInput('');
  };

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      
    }).catch(err => {
      
    });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Whenever isOpen changes or messages change, scroll
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen]);
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [sessionMessages]);

  // Theming
  const backgroundColor = colorMode === 'dark' ? '#1a202c' : '#f5f5f5';
  const textColor = colorMode === 'dark' ? '#f5f5f5' : '#1a202c';

  // Chat bubble colors
  const getBGColorMode = (role) => {
    if (role === 'user') {
      return '#1e293b';
    } else if (role === 'assistant') {
      return '#020617';
    }
    return '#e2e8f0';
  };

  // Simple markdown-like bold parsing
  const parseMessageContent = (content) => {
    return content.split('\n').map((line, i) => {
      const boldText = /\*\*(.*?)\*\*/g;
      const parts = line.split(boldText).map((part, index) =>
        boldText.test(part) ? (
          <strong key={index} className="block">
            {part.replace(/\*\*/g, '')}
          </strong>
        ) : (
          part
        )
      );
      return (
        <span key={i} className="block">
          {parts}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-8 md:bottom-4 right-4 z-30">
      <button 
        onClick={toggleAssistant} 
        style={{ backgroundColor, color: textColor }}
        className="p-3 rounded-full shadow-lg focus:outline-none border-2 border-gray-400 pl-6 pr-6"
      >
        Assistant
      </button>
      {isOpen && (
        <div 
          className="fixed bottom-16 right-4 p-4 rounded-lg shadow-lg border-2 border-gray-600"
          style={{ backgroundColor, color: textColor }}
        >
          {/* Header row with text + SingleSelect + minimize button */}
          <div className="flex justify-between items-center mb-2 font-bold">
            <div className="flex items-center">
              <span>Creative Assistant</span>
              <div className="ml-4 w-40">
                <SingleSelect
                  options={ASSISTANT_MODEL_TYPES}
                  value={assistantModel}
                  onChange={handleAssistantModelChange}
                />
              </div>
            </div>
            <button 
              onClick={toggleAssistant} 
              className="p-1 rounded-full shadow-lg focus:outline-none ml-2"
            >
              <MdMinimize />
            </button>
          </div>

          {/* Message list */}
          <div className="mb-4 space-y-2 md:w-[512px] max-h-[400px] overflow-y-scroll">
            {sessionMessages && sessionMessages.length > 0 ? (
              sessionMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded whitespace-pre-wrap relative ${
                    message.role === 'user' ? 'text-left' : 'text-right'
                  }`} 
                  style={{ 
                    backgroundColor: colorMode === 'dark' 
                      ? getBGColorMode(message.role) 
                      : '#e2e8f0', 
                    color: textColor 
                  }}
                >
                  <div className="flex justify-between items-center text-sm mb-1">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="text-xs p-1 rounded-full shadow-lg focus:outline-none flex items-center"
                      title="Copy full content to clipboard"
                    >
                      <FaCopy className="mr-1" /> Copy
                    </button>
                    <span>{dayjs(message.timestamp).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                  <div>{parseMessageContent(message.content)}</div>
                </div>
              ))
            ) : (
              <div className="h-62 bg-slate-800 pt-4 pb-4 text-center">
                Chats for the session will appear here.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt input and submit */}
          <form onSubmit={handleSubmit}>
            <TextareaAutosize 
              value={userInput} 
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full p-2 rounded border focus:outline-none mb-2 resize-none"
              minRows={1}
              maxRows={10}
              style={{ 
                backgroundColor: colorMode === 'dark' ? '#2d3748' : '#e2e8f0', 
                color: textColor 
              }}
              placeholder="type your prompt text here"
            />
            <CommonButton type="submit" isPending={isAssistantQueryGenerating}>
              Submit
            </CommonButton>
          </form>
        </div>
      )}
    </div>
  );
}
