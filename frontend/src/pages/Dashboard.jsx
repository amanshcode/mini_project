import { useState } from 'react';
import LiveVisualizer from '../components/LiveVisualizer';
import PostEditor from '../components/PostEditor';
import { Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [request, setRequest] = useState("");
  const [tone, setTone] = useState("Professional and authentic");
  const [audience, setAudience] = useState("General LinkedIn audience");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState("");

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationError("");
    setGenerationResult(null);
    setCompletedNodes(new Set());
    setActiveNode("Writer Agent");

    // Connect to FastAPI WebSocket backend
    const ws = new WebSocket("ws://localhost:8000/ws/generate");
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ request, tone, audience }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.node === "Error") {
        setGenerationError(data.detail || "Generation failed.");
        setIsGenerating(false);
        ws.close();
        return;
      }

      setActiveNode(data.node);
      setCompletedNodes(prev => new Set([...prev, data.node]));
      if (data.draft || data.node === "Final Approval") {
        setGenerationResult(data);
      }
    };

    ws.onerror = () => {
      setGenerationError("Could not connect to the generation service. Make sure the backend is running on port 8000.");
      setIsGenerating(false);
    };

    ws.onclose = () => {
      setIsGenerating(false);
      setActiveNode(null);
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Sparkles className="text-indigo-400 w-8 h-8" /> LinkedIn Content Copilot
        </h1>
        <p className="text-slate-400 text-sm mt-1">Multi-agent writing, career memory integration, and claim verification in React.</p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">What would you like to create?</label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            placeholder="Example: I completed LangGraph and built a multi-agent AI project..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100">
              <option>Professional and authentic</option>
              <option>Conversational and friendly</option>
              <option>Technical and educational</option>
              <option>Thought-leadership</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100">
              <option>General LinkedIn audience</option>
              <option>Recruiters and talent acquisition</option>
              <option>AI/ML engineers and developers</option>
              <option>Founders and startup leaders</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !request.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all shadow-lg text-sm"
        >
          {isGenerating ? "Agents Running Workflow..." : "Generate and Review Content"}
        </button>
      </div>

      {generationError && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-200 text-sm">
          {generationError}
        </div>
      )}

      {/* Visualizer & Editor Sections */}
      {isGenerating && <LiveVisualizer activeNode={activeNode} completedNodes={completedNodes} />}
      {generationResult && <PostEditor result={generationResult} onSave={() => alert("Saved post to history!")} />}
    </div>
  );
}