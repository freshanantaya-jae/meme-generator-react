import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Upload, ImagePlus, Type, Smile, Layers3, SlidersHorizontal,
  Undo2, Redo2, Download, Save, Trash2, Copy, ChevronUp, ChevronDown,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, RotateCcw, Sparkles
} from "lucide-react";
import "./styles.css";

const TEMPLATES = [
  { id: "blank", name: "Blank", src: null, bg: "#e9edf2" },
  { id: "sunset", name: "Sunset", src: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000", bg: "#111827" },
  { id: "office", name: "Office", src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000", bg: "#111827" },
  { id: "mountain", name: "Mountain", src: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000", bg: "#111827" }
];

const EMOJIS = ["😂","🤣","😎","🔥","❤️","👍","💯","😭","🤔","😱","⭐","✨","🎉","🚀","💥"];

const defaultText = (id = 1) => ({
  id, type: "text", text: "YOUR TEXT", x: 50, y: 12,
  fontSize: 44, color: "#ffffff", opacity: 1,
  fontFamily: "Impact", bold: true, italic: false,
  align: "center", outline: "#000000", outlineWidth: 4, rotation: 0
});

function App() {
  const [image, setImage] = useState(null);
  const [background, setBackground] = useState("#e9edf2");
  const [layers, setLayers] = useState([defaultText()]);
  const [selectedId, setSelectedId] = useState(1);
  const [activeTab, setActiveTab] = useState("templates");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [filter, setFilter] = useState({ grayscale: 0, brightness: 100, contrast: 100, blur: 0 });
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const nextId = useRef(2);

  const selected = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

  const snapshot = () => ({
    image, background, layers: JSON.parse(JSON.stringify(layers)), filter
  });

  const applyState = (s) => {
    setImage(s.image); setBackground(s.background);
    setLayers(s.layers); setFilter(s.filter);
    setSelectedId(s.layers[0]?.id ?? null);
  };

  const commit = (updater) => {
    setHistory(h => [...h.slice(-30), snapshot()]);
    setFuture([]);
    updater();
  };

  const undo = () => {
    if (!history.length) return;
    const current = snapshot();
    const previous = history[history.length - 1];
    setFuture(f => [current, ...f.slice(0, 29)]);
    setHistory(h => h.slice(0, -1));
    applyState(previous);
  };

  const redo = () => {
    if (!future.length) return;
    const current = snapshot();
    const next = future[0];
    setHistory(h => [...h.slice(-30), current]);
    setFuture(f => f.slice(1));
    applyState(next);
  };

  const updateLayer = (id, patch) => {
    commit(() => setLayers(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l)));
  };

  const addText = () => {
    const id = nextId.current++;
    commit(() => setLayers(ls => [...ls, { ...defaultText(id), y: 50, text: "NEW TEXT" }]));
    setSelectedId(id);
    setActiveTab("layers");
  };

  const addEmoji = (emoji) => {
    const id = nextId.current++;
    commit(() => setLayers(ls => [...ls, {
      id, type: "emoji", text: emoji, x: 50, y: 50,
      fontSize: 72, rotation: 0, opacity: 1
    }]));
    setSelectedId(id);
    setActiveTab("layers");
  };

  const removeSelected = () => {
    if (!selected) return;
    commit(() => setLayers(ls => ls.filter(l => l.id !== selectedId)));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const id = nextId.current++;
    commit(() => setLayers(ls => [...ls, { ...selected, id, x: Math.min(90, selected.x + 4), y: Math.min(90, selected.y + 4) }]));
    setSelectedId(id);
  };

  const moveLayer = (dir) => {
    const index = layers.findIndex(l => l.id === selectedId);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= layers.length) return;
    commit(() => {
      setLayers(ls => {
        const a = [...ls];
        [a[index], a[target]] = [a[target], a[index]];
        return a;
      });
    });
  };

  const uploadImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      commit(() => setImage(e.target.result));
      setActiveTab("layers");
    };
    reader.readAsDataURL(file);
  };

  const chooseTemplate = (t) => {
    commit(() => {
      setImage(t.src);
      setBackground(t.bg);
      setLayers([]);
    });
    setSelectedId(null);
  };

  const reset = () => {
    commit(() => {
      setImage(null);
      setBackground("#e9edf2");
      setLayers([defaultText()]);
      setFilter({ grayscale: 0, brightness: 100, contrast: 100, blur: 0 });
    });
    setSelectedId(1);
  };

  const saveLocal = async () => {
    const state = snapshot();
    localStorage.setItem("meme-studio-project", JSON.stringify(state));
    alert("Project saved to local storage.");
  };

  const loadLocal = () => {
    const raw = localStorage.getItem("meme-studio-project");
    if (!raw) return;
    const state = JSON.parse(raw);
    applyState(state);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 50));
    const canvas = await html2canvas(canvasRef.current, { useCORS: true, backgroundColor: background, scale: 2 });
    const link = document.createElement("a");
    link.download = "meme-studio.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    setSelectedId(selected?.id ?? null);
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 50));
    const canvas = await html2canvas(canvasRef.current, { useCORS: true, backgroundColor: background, scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("meme-studio.pdf");
    setSelectedId(selected?.id ?? null);
  };

  const pointerDown = (e, layer) => {
    e.stopPropagation();
    setSelectedId(layer.id);
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = { id: layer.id, rect };
  };

  const pointerMove = (e) => {
    if (!dragRef.current) return;
    const { id, rect } = dragRef.current;
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
    setLayers(ls => ls.map(l => l.id === id ? { ...l, x, y } : l));
  };

  const pointerUp = () => {
    if (dragRef.current) {
      setHistory(h => [...h.slice(-30), snapshot()]);
      setFuture([]);
    }
    dragRef.current = null;
  };

  useEffect(() => {
    const move = e => pointerMove(e);
    const up = () => pointerUp();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><div className="logo">M</div><span>Meme Studio</span></div>
        <div className="top-actions">
          <button onClick={undo} disabled={!history.length}><Undo2 size={17}/> Undo</button>
          <button onClick={redo} disabled={!future.length}><Redo2 size={17}/> Redo</button>
          <button className="ghost" onClick={loadLocal}><Save size={17}/> Load</button>
          <button className="primary" onClick={saveLocal}><Save size={17}/> Save</button>
          <button className="download" onClick={exportPNG}><Download size={17}/> Download</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="tabs">
            {[
              ["templates","Templates",ImagePlus],
              ["text","Text",Type],
              ["stickers","Stickers",Smile],
              ["layers","Layers",Layers3],
              ["effects","Effects",SlidersHorizontal]
            ].map(([id,label,Icon]) => (
              <button className={activeTab===id ? "tab active" : "tab"} key={id} onClick={() => setActiveTab(id)}>
                <Icon size={18}/><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="panel">
            {activeTab === "templates" && <>
              <h3>Choose a template</h3>
              <label className="upload">
                <Upload size={19}/>
                <span>Upload image</span>
                <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files[0])}/>
              </label>
              <div className="template-grid">
                {TEMPLATES.map(t => (
                  <button className="template" key={t.id} onClick={() => chooseTemplate(t)}>
                    {t.src ? <img src={t.src} crossOrigin="anonymous"/> : <div className="blank-template">Blank</div>}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
              <div className="mini-card">
                <strong>Quick start</strong>
                <p>Upload your own photo, then add text, emojis and effects.</p>
              </div>
            </>}

            {activeTab === "text" && <>
              <h3>Add text</h3>
              <button className="big-action" onClick={addText}><Type size={19}/> Add Text Layer</button>
              {selected?.type === "text" && <TextControls selected={selected} updateLayer={updateLayer}/>}
            </>}

            {activeTab === "stickers" && <>
              <h3>Emoji & stickers</h3>
              <div className="emoji-grid">{EMOJIS.map(e => <button key={e} onClick={() => addEmoji(e)}>{e}</button>)}</div>
              <p className="hint">Click an emoji to add it to the canvas. Drag it to reposition.</p>
            </>}

            {activeTab === "layers" && <>
              <div className="panel-title-row"><h3>Layers</h3><button className="icon-btn" onClick={addText}><Type size={17}/></button></div>
              {layers.length === 0 && <p className="hint">No layers yet.</p>}
              <div className="layer-list">
                {[...layers].reverse().map(l => (
                  <button key={l.id} className={selectedId===l.id ? "layer selected" : "layer"} onClick={() => setSelectedId(l.id)}>
                    <span className="layer-thumb">{l.type==="emoji" ? l.text : "T"}</span>
                    <span className="layer-name">{l.type==="emoji" ? "Emoji " + l.text : l.text}</span>
                    <span className="layer-actions">
                      <ChevronUp size={14} onClick={(e)=>{e.stopPropagation(); setSelectedId(l.id); moveLayer(1)}}/>
                      <ChevronDown size={14} onClick={(e)=>{e.stopPropagation(); setSelectedId(l.id); moveLayer(-1)}}/>
                    </span>
                  </button>
                ))}
              </div>
              {selected && <div className="selected-actions">
                <button onClick={duplicateSelected}><Copy size={16}/> Duplicate</button>
                <button className="danger" onClick={removeSelected}><Trash2 size={16}/> Delete</button>
              </div>}
            </>}

            {activeTab === "effects" && <>
              <h3>Image effects</h3>
              <EffectSlider label="Grayscale" value={filter.grayscale} min={0} max={100} suffix="%" onChange={v => {setHistory(h=>[...h.slice(-30),snapshot()]);setFuture([]);setFilter(f=>({...f,grayscale:v}))}}/>
              <EffectSlider label="Brightness" value={filter.brightness} min={50} max={150} suffix="%" onChange={v => {setHistory(h=>[...h.slice(-30),snapshot()]);setFuture([]);setFilter(f=>({...f,brightness:v}))}}/>
              <EffectSlider label="Contrast" value={filter.contrast} min={50} max={150} suffix="%" onChange={v => {setHistory(h=>[...h.slice(-30),snapshot()]);setFuture([]);setFilter(f=>({...f,contrast:v}))}}/>
              <EffectSlider label="Blur" value={filter.blur} min={0} max={10} suffix="px" onChange={v => {setHistory(h=>[...h.slice(-30),snapshot()]);setFuture([]);setFilter(f=>({...f,blur:v}))}}/>
              <button className="reset-effect" onClick={() => {commit(()=>setFilter({grayscale:0,brightness:100,contrast:100,blur:0}))}}><RotateCcw size={16}/> Reset effects</button>
            </>}
          </div>
        </aside>

        <section className="editor">
          <div className="editor-toolbar">
            <div className="format-group">
              <span>Canvas</span>
              <button onClick={() => setBackground("#ffffff")}>White</button>
              <button onClick={() => setBackground("#e9edf2")}>Light</button>
              <button onClick={() => setBackground("#111827")}>Dark</button>
            </div>
            <div className="format-group">
              <button onClick={reset}><RotateCcw size={16}/> Reset</button>
              <button onClick={exportPDF}><Download size={16}/> PDF</button>
            </div>
          </div>

          <div className="canvas-wrap">
            <div
              ref={canvasRef}
              className="meme-canvas"
              style={{backgroundColor: background}}
              onPointerDown={() => setSelectedId(null)}
            >
              {image && <img
                className="base-image"
                src={image}
                crossOrigin="anonymous"
                style={{filter:`grayscale(${filter.grayscale}%) brightness(${filter.brightness}%) contrast(${filter.contrast}%) blur(${filter.blur}px)`}}
                onPointerDown={e => e.stopPropagation()}
              />}
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={`canvas-layer ${selectedId===layer.id ? "selected-layer":""}`}
                  style={{
                    left:`${layer.x}%`, top:`${layer.y}%`,
                    transform:`translate(-50%,-50%) rotate(${layer.rotation || 0}deg)`,
                    opacity: layer.opacity ?? 1,
                    fontSize: `${layer.fontSize}px`,
                    fontFamily: layer.fontFamily,
                    fontWeight: layer.bold ? 900 : 400,
                    fontStyle: layer.italic ? "italic" : "normal",
                    color: layer.color,
                    textAlign: layer.align,
                    textShadow: layer.type==="text"
                      ? `${layer.outlineWidth}px ${layer.outlineWidth}px 0 ${layer.outline}, -${layer.outlineWidth}px -${layer.outlineWidth}px 0 ${layer.outline}, ${layer.outlineWidth}px -${layer.outlineWidth}px 0 ${layer.outline}, -${layer.outlineWidth}px ${layer.outlineWidth}px 0 ${layer.outline}`
                      : "none"
                  }}
                  onPointerDown={e => pointerDown(e, layer)}
                >
                  {layer.text}
                </div>
              ))}
              {!image && layers.length===0 && <div className="empty-canvas"><Sparkles size={28}/><span>Upload an image to start</span></div>}
            </div>
          </div>

          <div className="bottom-help">
            <span><b>Tip:</b> Select a layer and drag it around the canvas.</span>
            <span>{layers.length} layer{layers.length!==1 ? "s":""}</span>
          </div>
        </section>

        <aside className="inspector">
          <h3>Quick controls</h3>
          {selected?.type === "text" ? <TextControls selected={selected} updateLayer={updateLayer}/> :
           selected?.type === "emoji" ? <EmojiControls selected={selected} updateLayer={updateLayer}/> :
           <div className="empty-inspector"><Layers3 size={30}/><p>Select a text or sticker layer to edit it.</p></div>}
          <div className="export-card">
            <div><strong>Ready to share?</strong><span>Export your meme when you're done.</span></div>
            <button onClick={exportPNG}><Download size={17}/> PNG</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function TextControls({selected, updateLayer}) {
  return <div className="controls">
    <label>Text</label>
    <textarea value={selected.text} onChange={e=>updateLayer(selected.id,{text:e.target.value})}/>
    <div className="two">
      <div><label>Font</label><select value={selected.fontFamily} onChange={e=>updateLayer(selected.id,{fontFamily:e.target.value})}>
        {["Impact","Arial","Verdana","Georgia","Courier New","Trebuchet MS"].map(f=><option key={f}>{f}</option>)}
      </select></div>
      <div><label>Size</label><input type="number" min="8" max="180" value={selected.fontSize} onChange={e=>updateLayer(selected.id,{fontSize:+e.target.value})}/></div>
    </div>
    <div className="control-row">
      <button className={selected.bold ? "toggle on":"toggle"} onClick={()=>updateLayer(selected.id,{bold:!selected.bold})}><Bold size={16}/></button>
      <button className={selected.italic ? "toggle on":"toggle"} onClick={()=>updateLayer(selected.id,{italic:!selected.italic})}><Italic size={16}/></button>
      <button className={selected.align==="left" ? "toggle on":"toggle"} onClick={()=>updateLayer(selected.id,{align:"left"})}><AlignLeft size={16}/></button>
      <button className={selected.align==="center" ? "toggle on":"toggle"} onClick={()=>updateLayer(selected.id,{align:"center"})}><AlignCenter size={16}/></button>
      <button className={selected.align==="right" ? "toggle on":"toggle"} onClick={()=>updateLayer(selected.id,{align:"right"})}><AlignRight size={16}/></button>
    </div>
    <div className="two">
      <div><label>Text color</label><input className="color" type="color" value={selected.color} onChange={e=>updateLayer(selected.id,{color:e.target.value})}/></div>
      <div><label>Outline</label><input className="color" type="color" value={selected.outline} onChange={e=>updateLayer(selected.id,{outline:e.target.value})}/></div>
    </div>
    <EffectSlider label="Opacity" value={Math.round(selected.opacity*100)} min={10} max={100} suffix="%" onChange={v=>updateLayer(selected.id,{opacity:v/100})}/>
    <EffectSlider label="Outline" value={selected.outlineWidth} min={0} max={10} suffix="px" onChange={v=>updateLayer(selected.id,{outlineWidth:v})}/>
  </div>
}

function EmojiControls({selected, updateLayer}) {
  return <div className="controls">
    <label>Sticker</label><div className="emoji-preview">{selected.text}</div>
    <EffectSlider label="Size" value={selected.fontSize} min={20} max={180} suffix="px" onChange={v=>updateLayer(selected.id,{fontSize:v})}/>
    <EffectSlider label="Opacity" value={Math.round(selected.opacity*100)} min={10} max={100} suffix="%" onChange={v=>updateLayer(selected.id,{opacity:v/100})}/>
    <EffectSlider label="Rotation" value={selected.rotation} min={-180} max={180} suffix="°" onChange={v=>updateLayer(selected.id,{rotation:v})}/>
  </div>
}

function EffectSlider({label,value,min,max,suffix,onChange}) {
  return <div className="slider-control">
    <div><label>{label}</label><span>{value}{suffix}</span></div>
    <input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)}/>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
