import React from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

export default function DefaultsUIEditor(props) {
  const {
    editorData,
    setEditorData,
    bgColor,
    text2Color,
    colorMode
  } = props;

  if (!editorData) {
    return <div className={`${text2Color}`}>No data available</div>;
  }

  // Helpers for arrays of strings
  const addStringItem = (key) => {
    setEditorData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), ""]
    }));
  };

  const updateStringItem = (key, index, value) => {
    setEditorData(prev => {
      const updatedArray = [...prev[key]];
      updatedArray[index] = value;
      return { ...prev, [key]: updatedArray };
    });
  };

  const removeStringItem = (key, index) => {
    setEditorData(prev => {
      const updatedArray = [...prev[key]];
      updatedArray.splice(index, 1);
      return { ...prev, [key]: updatedArray };
    });
  };

  // Helpers for arrays of objects (like actors and places)
  const addObjectItem = (key) => {
    setEditorData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { name: "", keywords: [] }]
    }));
  };

  const updateObjectName = (key, index, value) => {
    setEditorData(prev => {
      const updated = [...prev[key]];
      updated[index].name = value;
      return { ...prev, [key]: updated };
    });
  };

  const removeObjectItem = (key, index) => {
    setEditorData(prev => {
      const updated = [...prev[key]];
      updated.splice(index, 1);
      return { ...prev, [key]: updated };
    });
  };

  const addKeywordToObject = (key, index) => {
    setEditorData(prev => {
      const updated = [...prev[key]];
      updated[index].keywords.push("");
      return { ...prev, [key]: updated };
    });
  };

  const updateObjectKeyword = (key, objIndex, kwIndex, value) => {
    setEditorData(prev => {
      const updated = [...prev[key]];
      updated[objIndex].keywords[kwIndex] = value;
      return { ...prev, [key]: updated };
    });
  };

  const removeObjectKeyword = (key, objIndex, kwIndex) => {
    setEditorData(prev => {
      const updated = [...prev[key]];
      updated[objIndex].keywords.splice(kwIndex, 1);
      return { ...prev, [key]: updated };
    });
  };

  const renderStringList = (key) => {
    if (!editorData[key]) return null;
    return (
      <div className="mb-4">
        <h3 className={`font-semibold ${text2Color} mb-2 capitalize`}>{key}</h3>
        <div className="flex flex-wrap gap-2">
          {editorData[key].map((item, idx) => (
            <div key={idx} className="flex items-center bg-neutral-800 text-white px-2 py-1 rounded">
              <input
                type="text"
                value={item}
                onChange={(e) => updateStringItem(key, idx, e.target.value)}
                className={`bg-transparent border-none outline-none text-white`}
              />
              <FaTimes
                className="ml-2 text-red-300 cursor-pointer"
                onClick={() => removeStringItem(key, idx)}
              />
            </div>
          ))}
          <button
            type="button"
            className="flex items-center px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            onClick={() => addStringItem(key)}
          >
            <FaPlus className="mr-1" /> Add
          </button>
        </div>
      </div>
    );
  };

  const renderObjectList = (key) => {
    if (!editorData[key]) return null;
    return (
      <div className="mb-4">
        <h3 className={`font-semibold ${text2Color} mb-2 capitalize`}>{key}</h3>
        {editorData[key].map((obj, i) => (
          <div key={i} className={`p-2 mb-2 rounded ${bgColor} border border-neutral-700`}>
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                className={`bg-neutral-800 text-white p-1 rounded w-full`}
                placeholder="Name"
                value={obj.name}
                onChange={(e) => updateObjectName(key, i, e.target.value)}
              />
              <FaTrash
                className="ml-2 text-red-400 cursor-pointer"
                onClick={() => removeObjectItem(key, i)}
              />
            </div>
            <div className="mb-2">
              <div className="font-semibold text-sm text-neutral-300 mb-1">Keywords:</div>
              <div className="flex flex-wrap gap-2">
                {obj.keywords.map((kw, kwIndex) => (
                  <div key={kwIndex} className="flex items-center bg-neutral-800 text-white px-2 py-1 rounded">
                    <input
                      type="text"
                      value={kw}
                      onChange={(e) => updateObjectKeyword(key, i, kwIndex, e.target.value)}
                      className={`bg-transparent border-none outline-none text-white`}
                    />
                    <FaTimes
                      className="ml-2 text-red-300 cursor-pointer"
                      onClick={() => removeObjectKeyword(key, i, kwIndex)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="flex items-center px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                  onClick={() => addKeywordToObject(key, i)}
                >
                  <FaPlus className="mr-1" /> Add Keyword
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="flex items-center px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          onClick={() => addObjectItem(key)}
        >
          <FaPlus className="mr-1" /> Add {key.slice(0, -1)}
        </button>
      </div>
    );
  };

  return (
    <div className={`text-sm bg-gray-950`}>
      {renderStringList("subject")}
      {renderObjectList("actors")}
      {renderObjectList("places")}
      {renderStringList("setting")}
      {renderStringList("style")}
      {renderStringList("general")}
    </div>
  );
}
