import React, { useEffect, useState } from 'react';
import ace from 'ace-builds';
import AceEditor from 'react-ace';
import TextareaAutosize from 'react-textarea-autosize';
import { useColorMode } from '../../../contexts/ColorMode.js';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import CommonButton from '../../common/CommonButton.tsx';
import { cleanJsonTheme } from '../../../utils/web.js';
import { MdExpand } from "react-icons/md";
import { FaRedo } from 'react-icons/fa';
import DefaultsUIEditor from './defaults/DefaultsUIEditor.js'; // Ensure this is the correct import path

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-beautify';

ace.config.set('useWorker', false);

export default function VideoEditorDefaultsViewer(props) {
  const {
    parentJsonTheme,
    basicTextTheme,
    derivedJsonTheme,
    submitUpdateSessionDefaults,
    isUpdateDefaultsPending,
    defaultSceneDuration,
    setAdvancedSessionTheme,
    isExpandedView
  } = props;

  const { colorMode } = useColorMode();

  const [themeType, setThemeType] = useState('basic');
  const [themeJson, setThemeJson] = useState('');
  const [editorData, setEditorData] = useState(null);

  // Load user preference for UI or JSON mode from localStorage
  const savedMode = typeof window !== 'undefined' ? localStorage.getItem('defaultUserThemeUIVideoMode') : null;
  const [uiViewMode, setUiViewMode] = useState(savedMode ? savedMode : 'ui');

  // Utility function to pretty format JSON
  const formatJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2); 
    } catch (e) {
      console.error('Invalid JSON:', e);
      return jsonString; 
    }
  };

  const handleReset = () => {
    setThemeType('basic');
    setThemeJson('');
    setEditorData(null);
    setUiViewMode('ui'); 
  };

  useEffect(() => {
    if (derivedJsonTheme) {
      setThemeType('derivedJson');
      const formatted = formatJson(derivedJsonTheme);
      setThemeJson(formatted);
    } else if (parentJsonTheme) {
      setThemeType('parentJson');
      const formatted = formatJson(parentJsonTheme);
      setThemeJson(formatted);
    } else if (basicTextTheme) {
      setThemeType('basic');
      setThemeJson('');
      setEditorData(null);
    }
  }, [derivedJsonTheme, parentJsonTheme, basicTextTheme]);

  // Whenever themeType or themeJson changes, if we're in UI mode, parse it
  useEffect(() => {
    if ((themeType === 'derivedJson' || themeType === 'parentJson') && uiViewMode === 'ui') {
      try {


        if (themeJson.trim()) {
          const parsed = JSON.parse(themeJson);
          setEditorData(parsed);
        } else {
          // If no content, just set empty object or null
          setEditorData({});
        }
      } catch (e) {
        console.error("Invalid JSON when switching to UI mode:", e);
        alert("Unable to parse JSON for UI view. Reverting to JSON view.");
        setUiViewMode('json');
      }
    }
  }, [themeJson, themeType, uiViewMode]);

  const bgColor =
    colorMode === 'light'
      ? 'bg-neutral-50 text-neutral-900'
      : 'bg-cyber-black border-neutral-800';
  const buttonBgcolor =
    colorMode === 'light'
      ? 'bg-stone-200 text-neutral-900'
      : 'bg-gray-900 text-white';
  const text2Color =
    colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';

  const handleJsonThemeChange = (value) => {
    setThemeJson(value);
    if (uiViewMode === 'ui') {
      try {
        const parsed = JSON.parse(value);
        setEditorData(parsed);
      } catch (e) {
        // do nothing, invalid json will be handled on mode switch
      }
    }
  };

  const submitUpdateSessionDefaultsWithType = (evt) => {
    evt.preventDefault();
    let payload = {};

    let finalJson = themeJson;
    if ((themeType === 'derivedJson' || themeType === 'parentJson') && uiViewMode === 'ui' && editorData) {
      finalJson = JSON.stringify(editorData, null, 2);
      setThemeJson(finalJson);
    }

    if (themeType === 'advanced') {
      payload = {
        customTheme: evt.target.advancedTextTheme.value,
      };
      setAdvancedSessionTheme(payload);
    } else if (themeType === 'derivedJson') {
      payload = {
        derivedJsonTheme: cleanJsonTheme(finalJson),
        defaultSceneDuration: evt.target.defaultSceneDuration.value,
      };
      submitUpdateSessionDefaults(payload);
    } else if (themeType === 'parentJson') {
      payload = {
        parentJsonTheme: cleanJsonTheme(finalJson),
        defaultSceneDuration: evt.target.defaultSceneDuration.value,
      };
      submitUpdateSessionDefaults(payload);
    } else if (themeType === 'basic') {
      payload = {
        basicTextTheme: evt.target.basicTextTheme.value,
        defaultSceneDuration: evt.target.defaultSceneDuration.value,
      };
      submitUpdateSessionDefaults(payload);
    }
  };

  const [ isEditorPanelExpanded, setIsEditorPanelExpanded ] = useState(false);

  const toggleExpandPanel = () => {
    const panel = document.querySelector('.ace_editor');
    if (panel && panel.style.height === '200px') {
      panel.style.height = '600px';
      setIsEditorPanelExpanded(true);
    } else if (panel) {
      panel.style.height = '200px';
      setIsEditorPanelExpanded(false);
    }
  }

  const handleViewToggle = () => {
    if (uiViewMode === 'json') {
      // User switching to UI mode
      try {
        const parsed = JSON.parse(themeJson);
        setEditorData(parsed);
        setUiViewMode('ui');
        localStorage.setItem('defaultUserThemeUIVideoMode', 'ui');
      } catch (e) {
        console.error("Invalid JSON, cannot switch to UI mode:", e);
        alert("JSON is invalid, please fix before switching to UI mode.");
      }
    } else {
      // User switching to JSON mode
      if (editorData) {
        const serialized = JSON.stringify(editorData, null, 2);
        setThemeJson(serialized);
      }
      setUiViewMode('json');
      localStorage.setItem('defaultUserThemeUIVideoMode', 'json');
    }
  };

  let themeDisplayBody = <span />;

  if (themeType === 'advanced') {
    // Advanced mode: show autoresize text box without duration box
    themeDisplayBody = (
      <TextareaAutosize
        placeholder="Add custom theme text here..."
        name="advancedTextTheme"
        minRows={3}
        className={`w-full mt-2 ${bgColor} ${text2Color} p-2`}
        defaultValue={''}
      />
    );
  } else if (themeType === 'derivedJson' || themeType === 'parentJson') {
    let expandPanelButton = <span />;
    if (isExpandedView) {
      let toggleExpandPanelLabel = isEditorPanelExpanded ? 'Collapse' : 'Expand';
      expandPanelButton = (
        <div className='inline-flex text-white pl-2 pr-2 cursor-pointer bg-neutral-900 rounded m-auto text-center ' onClick={toggleExpandPanel}>
          <MdExpand className='m-auto mt-1 mb-1 mr-1'/> {toggleExpandPanelLabel}
        </div>
      );
    }

    const title = themeType === 'parentJson' ? 'Parent Theme' : 'Derived Theme';
    themeDisplayBody = (
      <>
        <div className="flex justify-between items-center mt-1 mb-1">
          <h2 className={`text-lg font-semibold ${text2Color}`}>
            {title}
          </h2>
          {expandPanelButton}

          <div className="flex items-center space-x-2">
            <div
              className='flex text-white pl-2 pr-2 cursor-pointer bg-neutral-900 rounded text-center' 
              type="button"
              onClick={handleReset}
            >
              <FaRedo className='inline-flex mr-1 mt-1 pt-1 text-xs'/> Reset
            </div>
            <button
              type="button"
              className={`px-2 py-1 rounded ${buttonBgcolor}`}
              onClick={handleViewToggle}
            >
              {uiViewMode === 'json' ? 'UI View' : 'JSON View'}
            </button>
          </div>
        </div>

        {uiViewMode === 'ui' && editorData ? (
          <DefaultsUIEditor
            editorData={editorData}

            setEditorData={setEditorData}  


            bgColor={bgColor}
            text2Color={text2Color}
            colorMode={colorMode}
          />
        ) : uiViewMode === 'ui' && !editorData ? (
          <div className={`${text2Color} p-2 text-sm`}>
            No data available for UI editing.
          </div>
        ) : (
          <AceEditor
            mode="json"
            theme="monokai"
            name={`${themeType}Theme`}
            value={themeJson}
            onChange={handleJsonThemeChange}
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
            editorProps={{ $blockScrolling: true }}
            width="100%"
            height="200px"
            className="rounded"
          />
        )}
      </>
    );
  } else {
    // 'basic' themeType
    themeDisplayBody = (
      <>
        <TextareaAutosize
          placeholder="Project theme"
          name="basicTextTheme"
          minRows={3}
          className={`w-full mt-2 ${bgColor} ${text2Color} p-2`}
          defaultValue={basicTextTheme}
        />
        <div className={`text-xs ${text2Color} mb-2 ml-2`}>
          Theme keywords
        </div>
      </>
    );
  }

  return (
    <div>
      <form onSubmit={submitUpdateSessionDefaultsWithType}>
        {(themeType === 'basic' || themeType === 'advanced') && (
          <div className="button-group flex mb-2">
            <button
              type="button"
              className={`mr-2 px-4 py-2 rounded ${themeType === 'basic'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-gradient-to-r from-gray-900 to-gray-800 text-gray-200 rounded'
                }`}
              onClick={() => setThemeType('basic')}
            >
              Basic
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded ${themeType === 'advanced'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-gradient-to-r from-gray-900 to-gray-800 text-gray-200 rounded'
                }`}
              onClick={() => setThemeType('advanced')}
            >
              Advanced
            </button>
          </div>
        )}
        {themeDisplayBody}
        {themeType !== 'advanced' && (
          <>
            <input
              type="text"
              placeholder="Scene duration"
              name="defaultSceneDuration"
              className={`w-full mt-2 ${bgColor} ${text2Color} p-1 pl-2 h-[30px]`}
              defaultValue={defaultSceneDuration}
              required
            />
            <div className={`text-xs ${text2Color} mb-2 ml-2`}>
              Default scene duration
            </div>
          </>
        )}
        <div className={`${isExpandedView ? 'm-auto text-center mb-4' : ''}`}>
          <CommonButton type="submit" className={buttonBgcolor} 
          isPending={isUpdateDefaultsPending} >
            Save
          </CommonButton>
        </div>
      </form>
    </div>
  );
}
