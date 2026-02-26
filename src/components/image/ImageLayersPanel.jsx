import React, { useMemo, useState } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaEye,
  FaEyeSlash,
  FaGripLines,
  FaLayerGroup,
  FaTrash,
} from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useColorMode } from '../../contexts/ColorMode.jsx';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const normalizeItemsAndSelection = (items, selectedId) => {
  const idMap = new Map();
  const normalizedItems = items.map((item, index) => {
    const previousId = item?.id ?? `item_${index}`;
    const nextId = `item_${index}`;
    idMap.set(previousId, nextId);
    return {
      ...item,
      id: nextId,
    };
  });

  if (!selectedId) {
    return { normalizedItems, nextSelectedId: null };
  }

  return {
    normalizedItems,
    nextSelectedId: idMap.get(selectedId) || null,
  };
};

const getLayerLabel = (item, index) => {
  if (item?.type === 'shape' && (item?.config?.fixed || item?.subType === 'background')) {
    return 'Background';
  }

  if (item?.type === 'text') {
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (text) {
      return `Text: ${text.slice(0, 26)}${text.length > 26 ? '...' : ''}`;
    }
    return `Text ${index + 1}`;
  }

  if (item?.type === 'image') {
    return `Image ${index + 1}`;
  }

  if (item?.type === 'shape') {
    const shapeType = item?.shape || 'Shape';
    return `${shapeType.charAt(0).toUpperCase()}${shapeType.slice(1)} ${index + 1}`;
  }

  return `Layer ${index + 1}`;
};

export default function ImageLayersPanel(props) {
  const {
    activeItemList,
    setActiveItemList,
    updateSessionLayerActiveItemList,
    selectedId,
    setSelectedId,
    onToggleItemVisibility,
  } = props;

  const { colorMode } = useColorMode();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const items = useMemo(
    () => (Array.isArray(activeItemList) ? activeItemList : []),
    [activeItemList]
  );

  const cardSurface =
    colorMode === 'dark'
      ? 'bg-[#10192f] border border-[#1f2a3d] text-slate-100'
      : 'bg-white border border-slate-200 text-slate-900';
  const listBackground =
    colorMode === 'dark'
      ? 'bg-[#0b1226]'
      : 'bg-slate-50';
  const rowBase =
    colorMode === 'dark'
      ? 'bg-[#0f172a] border border-[#1f2a3d] hover:bg-[#16213a]'
      : 'bg-white border border-slate-200 hover:bg-slate-100';
  const rowSelected =
    colorMode === 'dark'
      ? 'ring-1 ring-rose-400/40 border-rose-400/30'
      : 'ring-1 ring-rose-300 border-rose-300';
  const iconButton =
    colorMode === 'dark'
      ? 'text-slate-300 hover:text-rose-200'
      : 'text-slate-500 hover:text-rose-600';
  const emptyState =
    colorMode === 'dark'
      ? 'text-slate-400'
      : 'text-slate-500';
  const subtleText =
    colorMode === 'dark'
      ? 'text-slate-300'
      : 'text-slate-600';

  const applyUpdatedItems = (nextItems, nextSelectedId = null) => {
    setActiveItemList(nextItems);
    if (typeof setSelectedId === 'function') {
      setSelectedId(nextSelectedId);
    }
    updateSessionLayerActiveItemList(nextItems);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = reorder(items, result.source.index, result.destination.index);
    const { normalizedItems, nextSelectedId } = normalizeItemsAndSelection(reordered, selectedId);
    applyUpdatedItems(normalizedItems, nextSelectedId);
  };

  const handleDelete = (itemId) => {
    const filteredItems = items.filter((item) => item?.id !== itemId);
    const { normalizedItems, nextSelectedId } = normalizeItemsAndSelection(filteredItems, selectedId);
    applyUpdatedItems(normalizedItems, selectedId === itemId ? null : nextSelectedId);
  };

  return (
    <div className={`mt-4 rounded-xl p-3 ${cardSurface}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setIsCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <FaLayerGroup className="text-sm" />
          <div className="text-sm font-semibold">Layers</div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${listBackground} ${subtleText}`}>
            {items.length}
          </div>
        </div>
        <div className={iconButton}>
          {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
        </div>
      </button>

      {!isCollapsed && (
        <div className={`mt-3 rounded-lg p-2 ${listBackground}`}>
          {items.length === 0 ? (
            <div className={`text-xs text-center py-3 ${emptyState}`}>
              No layers yet.
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="image-editor-layers-panel">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 max-h-[220px] overflow-y-auto pr-1"
                  >
                    {items.map((item, index) => {
                      const currentItemId = item?.id ?? `item_${index}`;
                      const isSelected = selectedId === currentItemId;
                      const isHidden = Boolean(item?.isHidden);
                      return (
                        <Draggable
                          key={currentItemId}
                          draggableId={currentItemId.toString()}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`rounded-lg px-2 py-2 transition ${rowBase} ${
                                isSelected ? rowSelected : ''
                              } ${dragSnapshot.isDragging ? 'shadow-lg' : ''}`}
                              onClick={() => setSelectedId(currentItemId)}
                              style={dragProvided.draggableProps.style}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`cursor-grab active:cursor-grabbing ${iconButton}`}
                                  {...dragProvided.dragHandleProps}
                                  aria-label="Reorder layer"
                                >
                                  <FaGripLines />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {getLayerLabel(item, index)}
                                  </div>
                                  <div className={`text-[11px] uppercase tracking-wide ${subtleText}`}>
                                    {item?.type || 'item'}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleItemVisibility(currentItemId);
                                  }}
                                  className={iconButton}
                                  aria-label={isHidden ? 'Show layer' : 'Hide layer'}
                                  title={isHidden ? 'Show layer' : 'Hide layer'}
                                >
                                  {isHidden ? <FaEyeSlash /> : <FaEye />}
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDelete(currentItemId);
                                  }}
                                  className={iconButton}
                                  aria-label="Delete layer"
                                  title="Delete layer"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      )}
    </div>
  );
}
