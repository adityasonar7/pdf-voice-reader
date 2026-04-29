import React, { useState, useEffect } from "react";
import axios from "axios";
import { UploadCloud, Play, Square, Pause, FileText, Headphones, Upload, Sun, ZoomIn, ZoomOut, Bookmark, Trash2 } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import "./App.css";

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [text, setText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  
  // PDF Viewer State
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [speed, setSpeed] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const handleEnd = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const indianVoices = availableVoices.filter(v => v.lang.includes('-IN') || v.name.includes('India') || v.name.toLowerCase().includes('hi-in'));
      setVoices(indianVoices);
      if (indianVoices.length > 0) {
        setSelectedVoiceIndex(0);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    window.speechSynthesis.addEventListener('end', handleEnd);
    
    return () => {
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.onvoiceschanged = null;
    }
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setPdfFile(file);
    setPageNumber(1);
    setIsLoading(true);
    setText("");
    
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setText(res.data.text);
    } catch (error) {
      console.error("Upload error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    if (isSpeaking) return;

    const speechText = selectedText || text;
    if (!speechText) return;

    const speech = new SpeechSynthesisUtterance(speechText);
    if (voices.length > 0) {
      speech.voice = voices[selectedVoiceIndex];
    }
    speech.rate = speed;
    speech.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    window.speechSynthesis.speak(speech);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const pauseText = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopText = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleSelect = () => {
    const selection = window.getSelection().toString();
    setSelectedText(selection);
  };

  const handleVoiceChange = (e) => {
    const newIndex = e.target.value;
    setSelectedVoiceIndex(newIndex);

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const speechText = selectedText || text;
        if (!speechText) return;

        const speech = new SpeechSynthesisUtterance(speechText);
        if (voices.length > 0) {
          speech.voice = voices[newIndex];
        }
        speech.rate = speed;
        speech.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
        };
        
        window.speechSynthesis.speak(speech);
        setIsSpeaking(true);
        setIsPaused(false);
      }, 50);
    }
  };

  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const speechText = selectedText || text;
        if (!speechText) return;
        const speech = new SpeechSynthesisUtterance(speechText);
        if (voices.length > 0) speech.voice = voices[selectedVoiceIndex];
        speech.rate = newSpeed;
        speech.onend = () => { setIsSpeaking(false); setIsPaused(false); };
        window.speechSynthesis.speak(speech);
        setIsSpeaking(true);
        setIsPaused(false);
      }, 50);
    }
  };

  const addBookmark = () => {
    if (selectedText && !bookmarks.includes(selectedText)) {
      setBookmarks([...bookmarks, selectedText]);
    }
  };

  const removeBookmark = (index) => {
    setBookmarks(bookmarks.filter((_, i) => i !== index));
  };

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-left">
          <div className="logo-box">
            <Headphones size={24} />
          </div>
          <div className="nav-title">
            <h1>PDF Voice Reader</h1>
            <p>Listen to any PDF, instantly</p>
          </div>
        </div>
        <div className="nav-right">
          <div className="btn-upload">
            <Upload size={18} />
            <span>Upload PDF</span>
            <input type="file" accept="application/pdf" onChange={handleUpload} />
          </div>
          <button className="btn-icon">
            <Sun size={20} />
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Left Pane: PDF Viewer */}
        <div className="viewer-pane">
          {!pdfFile && !isLoading ? (
            <div className="empty-state">
              <h2>No PDF loaded</h2>
              <p>Upload a PDF to view it here and start listening</p>
            </div>
          ) : isLoading ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p>Extracting text from {fileName}...</p>
            </div>
          ) : (
            <div className="pdf-viewer-wrapper" onMouseUp={handleSelect}>
              <Document
                file={pdfFile}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<div className="spinner"></div>}
                className="pdf-document"
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page 
                    key={`page_${index + 1}`}
                    pageNumber={index + 1} 
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    className="pdf-page"
                    scale={scale}
                  />
                ))}
              </Document>
            </div>
          )}
        </div>

        {/* Right Pane: Sidebar Controls */}
        <div className="sidebar-pane">
          
          <div className="sidebar-card">
            <div className="card-label">Playback</div>
            <button className="btn-primary-full" onClick={speakText}>
              <Play size={18} /> {isPaused ? "Resume Speaking" : "Speak Selection"}
            </button>
            <div className="playback-sub">
              <button className="btn-secondary-half" onClick={pauseText} disabled={!isSpeaking || isPaused}>
                <Pause size={16} /> Pause
              </button>
              <button className="btn-secondary-half" onClick={stopText} disabled={!isSpeaking && !isPaused}>
                <Square size={16} /> Stop
              </button>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="card-label">Voice</div>
            <select 
              className="voice-select-full"
              value={selectedVoiceIndex}
              onChange={handleVoiceChange}
            >
              {voices.map((voice, index) => (
                <option key={index} value={index}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
              {voices.length === 0 && <option>No Indian voices found</option>}
            </select>
          </div>

          <div className="sidebar-card">
            <div className="card-label">Speed</div>
            <div className="slider-container">
              <input 
                type="range" 
                min="0.5" max="2" step="0.1" 
                value={speed} 
                onChange={handleSpeedChange} 
              />
              <span className="slider-val">{speed.toFixed(1)}x</span>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="card-label">Zoom</div>
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                <ZoomOut size={16} />
              </button>
              <span className="zoom-val">{Math.round(scale * 100)}%</span>
              <button className="zoom-btn" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
                <ZoomIn size={16} />
              </button>
            </div>
            <button className="btn-outline-full" onClick={addBookmark} disabled={!selectedText}>
              <Bookmark size={16} /> Bookmark Selection
            </button>
          </div>

          <div className="sidebar-card">
            <div className="card-label">Selection</div>
            {selectedText ? (
              <div className="selection-text">{selectedText}</div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Highlight text in the PDF to see it here.
              </div>
            )}
          </div>

          <div className="sidebar-card">
            <div className="card-label">Bookmarks</div>
            {bookmarks.length > 0 ? (
              bookmarks.map((bm, idx) => (
                <div key={idx} className="bookmark-item">
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85%" }}>
                    "{bm}"
                  </div>
                  <button onClick={() => removeBookmark(idx)}><Trash2 size={16} /></button>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                No bookmarks yet.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;