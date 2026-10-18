import React, { useState } from 'react';
import LiveVisualizer from '../components/LiveVisualizer';
import PostEditor from '../components/PostEditor';
import { Sparkles } from 'lucide-react';

const PRESETS = [
  "🚀 Built a Multi-Agent AI system with LangGraph",
  "💻 Remote Full-Stack Internship at CodeAlpha",
  "📊 Solved 100+ LeetCode problems in C++",
  "🤖 Python history myth-buster (Tavily test)"
];

export default function Dashboard() {
  const [request, setRequest] = useState("");
  const [tone, setTone] = useState("Professional and authentic");
  const [audience, setAudience] = useState("General LinkedIn audience");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError("");
    setGenerationResult(null);
    setCompletedNodes(new Set());
    setActiveNode("writer");

    const careerProfile = localStorage.getItem('career_profile') || "";

    try {
      // Connect to FastAPI SSE streaming endpoint
      const response = await fetch("https://linkedin-copilot-backend.onrender.com/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, tone, audience, career_profile: careerProfile })
      });

      if (!response.ok) {
        throw new Error("Failed to connect to backend generation server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.node === "DONE") {
              setIsGenerating(false);
              setActiveNode(null);
              break;
            }

            if (data.node === "Error") {
              setGenerationError(data.detail || "Generation failed.");
              setIsGenerating(false);
              setActiveNode(null);
              break;
            }

            // Update node visualizer state
            setActiveNode(data.node);
            setCompletedNodes(prev => new Set([...prev, data.node]));

            if (data.draft || data.scorecard) {
              setGenerationResult(data);
            }
          }
        }
      }
    } catch (error) {
      setGenerationError("Could not connect to the generation service. Make sure Uvicorn is running on port 8000.");
      setIsGenerating(false);
      setActiveNode(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Sparkles className="text-indigo-400 w-8 h-8" /> VeritasAI
        </h1>
        <p className="text-slate-400 text-sm mt-1">Autonomous multi-agent LinkedIn content copilot with factual verification loops.</p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-300">What would you like to create?</label>
          </div>
          
          {/* Quick Preset Chips for Presentation */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs text-slate-400 self-center mr-1">Quick Presets:</span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRequest(preset)}
                className="text-xs bg-slate-800 hover:bg-indigo-950/60 hover:border-indigo-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

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
              <option>Storytelling and reflective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100">
              <option>General LinkedIn audience</option>
              <option>Recruiters and talent acquisition</option>
              <option>AI/ML engineers and developers</option>
              <option>Founders and startup leaders</option>
              <option>Students and early-career professionals</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !request.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all shadow-lg text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          {isGenerating ? "Agents Running Workflow..." : "Generate and Review Content"}
        </button>
      </div>

      {generationError && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-200 text-sm">
          {generationError}
        </div>
      )}

      {/* Live Agent Visualizer */}
      {isGenerating && <LiveVisualizer activeNode={activeNode} completedNodes={completedNodes} />}

      {/* Post Editor & Results Dashboard */}
      {generationResult && (
        <PostEditor 
          result={generationResult} 
          requestText={request} 
          tone={tone} 
          audience={audience} 
        />
      )}
    </div>
  );
}