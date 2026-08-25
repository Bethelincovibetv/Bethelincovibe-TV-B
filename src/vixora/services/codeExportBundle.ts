export const codeExportBundle = {
  getStandAloneReactSnippet(): string {
    return `import React, { useState } from 'react';
import { vixora } from './vixoraClient';

export function VixoraVideoStudioWidget() {
  const [topic, setTopic] = useState('3 Habits for High Performance');
  const [script, setScript] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsRendering(true);
    try {
      const res = await vixora.createAndRenderVideo({
        topic,
        script: script || undefined,
        duration: '30s',
        aspectRatio: 'vertical',
        voice: 'Kore',
        onProgress: (p) => setProgress(p.progress),
      });
      setVideoUrl(res.videoUrl);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Vixora AI Video Creator</h2>
      <form onSubmit={handleGenerate}>
        <input 
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)} 
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ccc' }}
          placeholder="Video topic..." 
          required 
        />
        <button 
          type="submit" 
          disabled={isRendering}
          style={{ width: '100%', padding: 14, background: '#ff5500', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isRendering ? \`Rendering (\${progress}%)... \` : 'Generate Video'}
        </button>
      </form>
      {videoUrl && (
        <div style={{ marginTop: 20 }}>
          <video src={videoUrl} controls autoPlay playsInline style={{ width: '100%', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}`;
  },

  downloadBundleAsZipOrJson() {
    const data = {
      name: "vixora-studio-native-bundle",
      version: "3.1.0",
      targetApi: "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app",
      files: {
        "VixoraClient.ts": "Universal API client for TypeScript/JavaScript",
        "App.tsx": "Full Studio React UI",
        "sfxLibrary.ts": "Web Audio Procedural Sound Effects Engine",
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vixora_studio_integration_bundle.json";
    a.click();
    URL.revokeObjectURL(url);
  },
};
