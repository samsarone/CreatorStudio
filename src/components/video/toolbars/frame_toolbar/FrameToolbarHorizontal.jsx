import React, { useRef, useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ReactSlider from "react-slider";
import { FaChevronLeft, FaChevronRight, FaDownload } from "react-icons/fa";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";

const MIN_TILE_WIDTH = 72;
const MIN_PX_PER_SECOND = 70;
const MAX_PX_PER_SECOND = 160;
const TILE_GAP = 8;

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
  const safeTotalDuration = Math.max(totalDuration || 0, 0.001);

  // Scroll container
  const railRef = useRef(null);
  const layerRefs = useRef({}); // NEW: hold refs to each layer tile
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const { colorMode } = useColorMode();

  // --- helpers ----------------------------------------------------
  const measureScrollability = () => {
    const el = railRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setCanScrollLeft(left > 0);
    setCanScrollRight(right);
  };

  const updateViewportWidth = () => {
    const width = railRef.current?.clientWidth || 0;
    setViewportWidth((prev) => (prev === width ? prev : width));
  };

  useEffect(() => {
    // measure on mount & whenever content could change
    measureScrollability();
    updateViewportWidth();
  }, [layers, safeTotalDuration]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => measureScrollability();
    const onResize = () => {
      updateViewportWidth();
      measureScrollability();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onResize);
      observer.observe(el);
    }

    onResize();

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (observer) observer.disconnect();
    };
  }, []);

  const scrollByAmount = (direction) => {
    const el = railRef.current;
    if (!el) return;
    const viewport = el.clientWidth || 0;
    const step = viewport ? viewport * 0.7 : 320;
    const amount = Math.sign(direction || 1) * step;
    el.scrollBy({ left: amount, behavior: "smooth" });
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

  const shortestLayerDuration = useMemo(() => {
    if (!layers?.length) return 0;
    return layers.reduce((min, layer) => {
      const duration = Math.max(layer?.duration || 0, 0.001);
      return Math.min(min, duration);
    }, Infinity);
  }, [layers]);

  const pixelsPerSecond = useMemo(() => {
    const base = (viewportWidth || 960) / safeTotalDuration;
    const ensureVisible = shortestLayerDuration ? MIN_TILE_WIDTH / shortestLayerDuration : MIN_PX_PER_SECOND;
    return Math.min(
      MAX_PX_PER_SECOND,
      Math.max(MIN_PX_PER_SECOND, Math.max(base, ensureVisible)),
    );
  }, [viewportWidth, safeTotalDuration, shortestLayerDuration]);

  const tileWidths = useMemo(() => {
    if (!layers?.length) return [];
    return layers.map((layer) => {
      const duration = Math.max(layer?.duration || 0, 0.001);
      const width = duration * pixelsPerSecond;
      return Math.max(MIN_TILE_WIDTH, width);
    });
  }, [layers, pixelsPerSecond]);

  const trackWidth = useMemo(() => {
    if (!layers?.length) {
      return viewportWidth;
    }
    const widthSum = tileWidths.reduce((acc, width) => acc + width, 0);
    const gaps = Math.max(layers.length - 1, 0) * TILE_GAP;
    const computed = widthSum + gaps;
    return Math.max(computed, viewportWidth || computed);
  }, [layers, tileWidths, viewportWidth]);

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
          ? "bg-slate-950/85 text-slate-100 border-t border-white/5 backdrop-blur-sm"
          : "bg-white/90 text-slate-800 border-t border-slate-200 shadow-[0_-6px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm"
      } w-full overflow-hidden`}
    >
      {/* Seek */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <ReactSlider
          key="horizontal-seek-slider"
          className="modern-horizontal-slider w-full h-7 flex items-center"
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
                className={`h-[4px] rounded-full ${
                  state.index === 0
                    ? colorMode === "dark"
                      ? "bg-indigo-400/70"
                      : "bg-indigo-500/70"
                    : colorMode === "dark"
                      ? "bg-slate-800/70"
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
                ? "bg-white border border-white/40 shadow-[0_4px_14px_rgba(148,163,184,0.35)]"
                : "bg-indigo-500 border border-indigo-200 shadow-[0_4px_16px_rgba(99,102,241,0.25)]";
            return (
              <div
                key={key}
                {...thumbProps}
                className={`${className ?? ""} h-4 w-4 rounded-full ${baseClass}`}
                style={style}
              />
            );
          }}
        />
        <div className={`text-[11px] font-medium ${colorMode === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          {(currentLayerSeek / fps).toFixed(2)}s / {totalDuration.toFixed(2)}s
        </div>
      </div>

      {/* Scroll controls */}
      <div className="px-4 pb-3 flex items-center gap-3 min-w-0">
        <button
          className={`p-2.5 rounded-full transition-colors duration-150 ${
            colorMode === "dark"
              ? "bg-slate-900/80 text-slate-100 border border-white/10 hover:bg-slate-900"
              : "bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50"
          } ${canScrollLeft ? "" : "opacity-40 cursor-not-allowed"} shadow-sm`}
          onClick={() => canScrollLeft && scrollByAmount(-1)}
          aria-label="Scroll left"
        >
          <FaChevronLeft />
        </button>

        <div className="relative flex-1 min-w-0">
          <div
            className={`pointer-events-none absolute inset-y-1 left-0 w-10 bg-gradient-to-r ${
              colorMode === "dark" ? "from-slate-950/80" : "from-white"
            } to-transparent`}
          />
          <div
            className={`pointer-events-none absolute inset-y-1 right-0 w-10 bg-gradient-to-l ${
              colorMode === "dark" ? "from-slate-950/80" : "from-white"
            } to-transparent`}
          />
          {/* IMPORTANT: Make the Droppable be the scroll container so RBD can auto-scroll it */}
          <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
            <Droppable droppableId="rail" direction="horizontal">
              {(provided) => (
                <div
                  className="flex-1 overflow-x-auto no-scrollbar min-w-0"
                  ref={(node) => {
                    // attach both droppable ref and our local railRef
                    provided.innerRef(node);
                    railRef.current = node;
                  }}
                  {...provided.droppableProps}
                >
                  {/* the wide track inside the scroll container */}
                  <div className="relative h-10" style={{ width: trackWidth }}>
                    <div className="absolute inset-0 flex items-stretch gap-2">
                      {layers.map((layer, i) => {
                        const widthPx = tileWidths[i] ?? MIN_TILE_WIDTH;
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
                                className={`rounded-lg border transition-colors duration-150 ${
                                  isSelected
                                    ? colorMode === "dark"
                                      ? "border-indigo-400/70 bg-indigo-500/25 shadow-[0_8px_20px_rgba(79,70,229,0.25)]"
                                      : "border-indigo-300 bg-indigo-100 shadow-[0_8px_24px_rgba(99,102,241,0.18)]"
                                    : colorMode === "dark"
                                      ? "border-white/5 bg-slate-900/70 hover:border-white/10"
                                      : "border-slate-200 bg-slate-100 hover:border-slate-300"
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
                                  <div className={colorMode === "dark" ? "text-slate-200/90" : "text-slate-600"}>
                                    {layer.duration?.toFixed(1)}s
                                  </div>
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
                      layers={layers}
                      tileWidths={tileWidths}
                      gap={TILE_GAP}
                    />
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <button
          className={`p-2.5 rounded-full transition-colors duration-150 ${
            colorMode === "dark"
              ? "bg-slate-900/80 text-slate-100 border border-white/10 hover:bg-slate-900"
              : "bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50"
          } ${canScrollRight ? "" : "opacity-40 cursor-not-allowed"} shadow-sm`}
          onClick={() => canScrollRight && scrollByAmount(1)}
          aria-label="Scroll right"
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}

function Playhead({ fps, currentFrame, layers, tileWidths, gap }) {
  const safeLayers = layers || [];
  const seconds = currentFrame / fps;
  let cursor = 0;
  let accumulated = 0;

  for (let i = 0; i < safeLayers.length; i++) {
    const duration = Math.max(safeLayers[i]?.duration || 0, 0.001);
    const nextAccumulated = accumulated + duration;
    const width = tileWidths[i] ?? 0;

    if (seconds >= nextAccumulated) {
      cursor += width + (i < safeLayers.length - 1 ? gap : 0);
      accumulated = nextAccumulated;
      continue;
    }

    const ratio = duration > 0 ? (seconds - accumulated) / duration : 0;
    cursor += width * Math.max(0, Math.min(1, ratio));
    break;
  }

  return (
    <div
      className="absolute top-0 h-full w-px bg-emerald-400 pointer-events-none shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
      style={{ transform: `translateX(${cursor}px)` }}
    />
  );
}
