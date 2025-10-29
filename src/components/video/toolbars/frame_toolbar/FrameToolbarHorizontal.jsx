import React, { useRef, useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ReactSlider from "react-slider";
import { FaChevronLeft, FaChevronRight, FaDownload } from "react-icons/fa";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";

export default function FrameToolbarHorizontal({
  layers,
  selectedLayerIndex,
  setSelectedLayerIndex,
  setSelectedLayer,
  totalDuration,
  currentLayerSeek,
  setCurrentLayerSeek,
  onLayersOrderChange,
  downloadLink,
}) {
  const fps = 30;
  const totalFrames = Math.max(1, Math.floor(totalDuration * fps));

  // Scroll container
  const railRef = useRef(null);
  const layerRefs = useRef({}); // NEW: hold refs to each layer tile
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { colorMode } = useColorMode();

  // Fixed virtual width so the rail is always wider than the viewport on load
  const railPixelWidth = 2400;
  const pixelsPerSecond = totalDuration > 0 ? railPixelWidth / totalDuration : 0;

  // --- helpers ----------------------------------------------------
  const measureScrollability = () => {
    const el = railRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setCanScrollLeft(left > 0);
    setCanScrollRight(right);
  };

  useEffect(() => {
    // measure on mount & whenever content could change
    measureScrollability();
  }, [layers, totalDuration]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => measureScrollability();
    const onResize = () => measureScrollability();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scrollByAmount = (delta) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  // NEW: ensure a given layer index is visible inside the rail
  const ensureLayerIndexVisible = (index) => {
    const scroller = railRef.current;
    if (!scroller || !layers || !layers[index]) return;

    const key = layers[index]._id;
    const tile = layerRefs.current[key];
    if (!tile) return;

    const scRect = scroller.getBoundingClientRect();
    const elRect = tile.getBoundingClientRect();

    // A bit of padding so it doesn't hug the edge
    const PAD = 16;

    // If tile is to the right of the visible area
    if (elRect.right > scRect.right - PAD) {
      const dx = elRect.right - scRect.right + PAD;
      scroller.scrollBy({ left: dx, behavior: "smooth" });
      return;
    }
    // If tile is to the left of the visible area
    if (elRect.left < scRect.left + PAD) {
      const dx = elRect.left - scRect.left - PAD;
      scroller.scrollBy({ left: dx, behavior: "smooth" });
    }
  };

  // Keep selected tile visible whenever selectedLayerIndex changes externally
  useEffect(() => {
    ensureLayerIndexVisible(selectedLayerIndex);
  }, [selectedLayerIndex, layers]);

  // --- seek -------------------------------------------------------
  const handleSeek = (frame) => {
    const clamped = Math.max(0, Math.min(frame, totalFrames));
    setCurrentLayerSeek(clamped);

    let acc = 0;
    let idx = layers.length - 1;
    for (let i = 0; i < layers.length; i++) {
      const start = acc * fps;
      const end = (acc + layers[i].duration) * fps;
      if (clamped >= start && clamped < end) {
        idx = i;
        break;
      }
      acc += layers[i].duration;
    }

    // Update selection
    setSelectedLayerIndex(idx);
    setSelectedLayer(layers[idx]);

    // Keep the newly-selected tile in view while scrubbing
    ensureLayerIndexVisible(idx); // NEW
  };

  // --- dnd --------------------------------------------------------
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const newOrder = Array.from(layers);
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(destIndex, 0, removed);
    onLayersOrderChange && onLayersOrderChange(newOrder, removed._id);

    // After reorder, make sure the moved tile is visible
    ensureLayerIndexVisible(destIndex); // NEW
  };

  // Optional: as you drag, nudge the rail when the destination index is off-screen
  const onDragUpdate = (update) => {
    if (update?.destination) {
      ensureLayerIndexVisible(update.destination.index); // NEW (safety net)
    }
  };

  const renderDownload = () => {
    if (!downloadLink) return null;
    const onDownload = () => {
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = `Rendition_${new Date().toISOString()}.mp4`;
      a.click();
    };
    return (
      <button
        onClick={onDownload}
        className={`px-3 py-2 rounded-lg text-xs inline-flex items-center gap-2 transition-colors duration-150 ${
          colorMode === "dark"
            ? "bg-slate-900/80 text-slate-100 border border-white/10 hover:bg-slate-900"
            : "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-100"
        }`}
      >
        <FaDownload />
        Download
      </button>
    );
  };

  return (
    <div
      className={`${
        colorMode === "dark"
          ? "bg-slate-950 text-slate-100 border-t border-white/10"
          : "bg-white text-slate-800 border-t border-slate-200 shadow-sm"
      }`}
    >
      {/* Seek */}
      <div className="px-3 pb-2">
        <ReactSlider
          key="horizontal-seek-slider"
          className="modern-horizontal-slider w-full h-6 flex items-center"
          min={0}
          max={totalFrames}
          value={currentLayerSeek}
          onChange={handleSeek}
          renderTrack={(props, state) => {
            const { key, className, style, ...trackProps } = props;
            return (
              <div
                key={key}
                {...trackProps}
                className={`h-[3px] rounded-full ${
                  state.index === 0
                    ? colorMode === "dark"
                      ? "bg-indigo-500/40"
                      : "bg-indigo-500/30"
                    : colorMode === "dark"
                      ? "bg-slate-900/60"
                      : "bg-slate-200"
                } ${className ?? ""}`}
                style={style}
              />
            );
          }}
          renderThumb={(props) => {
            const { key, className, style, ...thumbProps } = props;
            const baseClass =
              colorMode === "dark"
                ? "bg-white border border-white/40"
                : "bg-indigo-500 border border-indigo-200";
            return (
              <div
                key={key}
                {...thumbProps}
                className={`${className ?? ""} h-4 w-4 rounded-full shadow ${baseClass}`}
                style={style}
              />
            );
          }}
        />
        <div className={`text-[10px] mt-1 ${colorMode === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          {(currentLayerSeek / fps).toFixed(2)}s / {totalDuration.toFixed(2)}s
        </div>
      </div>

      {/* Scroll controls */}
      <div className="px-3 flex items-center gap-2">
        <button
          className={`p-2 rounded-md transition-colors duration-150 ${
            colorMode === "dark"
              ? "bg-slate-900/80 text-slate-100 border border-white/10"
              : "bg-white text-slate-600 border border-slate-200 shadow-sm"
          } ${canScrollLeft ? "" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => canScrollLeft && scrollByAmount(-400)}
          aria-label="Scroll left"
        >
          <FaChevronLeft />
        </button>

        {/* IMPORTANT: Make the Droppable be the scroll container so RBD can auto-scroll it */}
        <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
          <Droppable droppableId="rail" direction="horizontal">
            {(provided) => (
              <div
        className="flex-1 overflow-x-auto" // CHANGED: this is now the Droppable itself
                ref={(node) => {
                  // attach both droppable ref and our local railRef
                  provided.innerRef(node);
                  railRef.current = node;
                }}
                {...provided.droppableProps}
              >
                {/* the wide track inside the scroll container */}
                <div className="relative h-8" style={{ width: railPixelWidth }}>
                  <div className="absolute top-0 left-0 h-full flex items-stretch">
                    {layers.map((layer, i) => {
                      const widthPx = Math.max(40, layer.duration * pixelsPerSecond);
                      const isSelected = i === selectedLayerIndex;
                      return (
                        <Draggable draggableId={layer._id.toString()} index={i} key={layer._id}>
                          {(drag) => (
                            <div
                              ref={(el) => {
                                // IMPORTANT: set both the draggable ref and our own ref for visibility checks
                                drag.innerRef(el);
                                layerRefs.current[layer._id] = el; // NEW
                              }}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className={`mx-1 rounded-xl shadow-sm border ${
                                isSelected
                                  ? colorMode === "dark"
                                    ? "border-indigo-400/80 bg-indigo-500/30"
                                    : "border-indigo-300 bg-indigo-100"
                                  : colorMode === "dark"
                                    ? "border-slate-800 bg-slate-900/70"
                                    : "border-slate-200 bg-slate-100"
                              } cursor-pointer flex items-center justify-center select-none`}
                              style={{
                                width: widthPx,
                                // RBD requires applying its style for animations / transforms
                                ...drag.draggableProps.style,
                              }}
                              onClick={() => {
                                setSelectedLayerIndex(i);
                                setSelectedLayer(layer);
                                ensureLayerIndexVisible(i); // NEW: clicking also ensures visibility
                              }}
                              data-layer-id={layer._id} // helpful for debugging
                            >
                              <div className="text-[11px] leading-tight text-center px-2">
                                <div className="font-semibold">{i + 1}</div>
                                <div>{layer.duration?.toFixed(1)}s</div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>

                  <Playhead
                    fps={fps}
                    currentFrame={currentLayerSeek}
                    totalDuration={totalDuration}
                    railPixelWidth={railPixelWidth}
                  />
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          className={`p-2 rounded-md transition-colors duration-150 ${
            colorMode === "dark"
              ? "bg-slate-900/80 text-slate-100 border border-white/10"
              : "bg-white text-slate-600 border border-slate-200 shadow-sm"
          } ${canScrollRight ? "" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => canScrollRight && scrollByAmount(400)}
          aria-label="Scroll right"
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}

function Playhead({ fps, currentFrame, totalDuration, railPixelWidth }) {
  const totalFrames = Math.max(1, Math.floor(totalDuration * fps));
  const x = (currentFrame / totalFrames) * railPixelWidth;
  return (
    <div
      className="absolute top-0 h-full w-px bg-red-400 pointer-events-none"
      style={{ left: x }}
    />
  );
}
