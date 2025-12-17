import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CheckCircle2, XCircle, AlertTriangle, Check, X } from 'lucide-react';

const BenchmarksPage: React.FC = () => {
  // LLM Benchmark Data
  const llmReasoningData = [
    { name: 'DeepSeek-R1\n1.5B', score: 78, fill: '#f97316' },
    { name: 'Llama 3.2\n3B', score: 72, fill: '#fb923c' },
    { name: 'Gemma 2\n2B', score: 55, fill: '#fdba74' },
    { name: 'Qwen 2.5\n0.5B', score: 35, fill: '#fed7aa' },
  ];

  const llmInferenceSpeedData = [
    { name: 'DeepSeek-R1', speed: 40, fill: '#f97316' },
    { name: 'Llama 3.2', speed: 20, fill: '#fb923c' },
    { name: 'Gemma 2', speed: 27, fill: '#fdba74' },
    { name: 'Qwen 2.5', speed: 65, fill: '#fed7aa' },
  ];

  const llmMemoryData = [
    { name: 'DeepSeek-R1', disk: 1.1, ram: 2.2 },
    { name: 'Llama 3.2', disk: 2.4, ram: 4.1 },
    { name: 'Gemma 2', disk: 1.6, ram: 3.0 },
    { name: 'Qwen 2.5', disk: 0.4, ram: 0.8 },
  ];

  // Translation Benchmark Data
  const translationLanguageData = [
    { name: 'NLLB-200\n600M', languages: 200, indic: 22, fill: '#f97316' },
    { name: 'IndicTrans2\n1.1B', languages: 22, indic: 22, fill: '#fb923c' },
    { name: 'IndicTrans2\n200M', languages: 15, indic: 15, fill: '#fdba74' },
    { name: 'DeepSeek-R1', languages: 2, indic: 0, fill: '#fed7aa' },
    { name: 'Gemma\n270M', languages: 1, indic: 0, fill: '#fed7aa' },
  ];

  const translationSizeData = [
    { name: 'NLLB-200', modelSize: 0.6, diskUsage: 1.2 },
    { name: 'IndicTrans2 1.1B', modelSize: 1.1, diskUsage: 5.0 },
    { name: 'IndicTrans2 200M', modelSize: 0.2, diskUsage: 3.0 },
    { name: 'DeepSeek-R1', modelSize: 1.3, diskUsage: 3.0 },
    { name: 'Gemma', modelSize: 0.27, diskUsage: 2.0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            Technical <span className="text-orange-400">Benchmarks</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive evaluation metrics for on-device reasoning and multilingual translation models
          </p>
        </div>

        {/* LLM Benchmarks Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              1. Small Language Models (SLM) Evaluation
            </h2>
            <p className="text-sm text-gray-600 mb-2">Technical Evaluation Report</p>
            <div className="border-t border-gray-300 pt-4">
              <p className="text-sm text-gray-700 leading-relaxed mb-6">
                This report benchmarks four Small Language Models (SLMs) to determine the optimal engine for a local 
                content generation and reasoning system. The evaluation prioritizes <strong>reasoning capability (Chain of Thought)</strong>, 
                <strong> factual adherence</strong>, and <strong>auditable logic</strong> over raw inference speed. All models were 
                evaluated in a constrained offline environment (CPU Inference) with 4-bit (Q4_K_M) quantization via GGUF format.
              </p>
            </div>

            {/* Executive Summary */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <h3 className="font-bold text-gray-900 mb-2">Executive Summary</h3>
              <p className="text-sm text-gray-800">
                <strong>Final Recommendation:</strong> <strong className="text-green-700">DeepSeek-R1-Distill-Qwen-1.5B</strong> is 
                selected as the production model. It demonstrates a superior balance of reasoning density and memory efficiency, 
                outperforming larger general-purpose models in logical consistency while maintaining a sub-1.5GB footprint.
              </p>
            </div>

            {/* Comparative Data Table */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Comparative Benchmark Data</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Model</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Variant</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Disk Size (Quantized)</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Est. RAM Usage</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Reasoning Score (Est. GSM8K)</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Inference Speed (CPU)</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Primary Architecture</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-green-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">DeepSeek-R1</td>
                      <td className="p-3 border border-gray-300 text-gray-700">Distill-Qwen-1.5B</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~1.1 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~2.2 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700 font-semibold">High (~78%)</td>
                      <td className="p-3 border border-gray-300 text-gray-700">35-45 t/s</td>
                      <td className="p-3 border border-gray-300 text-gray-700 font-medium">Reasoning (CoT)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Llama 3.2</td>
                      <td className="p-3 border border-gray-300 text-gray-700">3B Instruct</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~2.4 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~4.1 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">Med-High (~72%)</td>
                      <td className="p-3 border border-gray-300 text-gray-700">15-25 t/s</td>
                      <td className="p-3 border border-gray-300 text-gray-700">General Purpose</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Gemma 2</td>
                      <td className="p-3 border border-gray-300 text-gray-700">2B Instruct</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~1.6 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~3.0 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">Moderate (~55%)</td>
                      <td className="p-3 border border-gray-300 text-gray-700">25-30 t/s</td>
                      <td className="p-3 border border-gray-300 text-gray-700">General Purpose</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Qwen 2.5</td>
                      <td className="p-3 border border-gray-300 text-gray-700">0.5B Instruct</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~0.4 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">~0.8 GB</td>
                      <td className="p-3 border border-gray-300 text-gray-700">Low (&lt;40%)</td>
                      <td className="p-3 border border-gray-300 text-gray-700 font-semibold">60+ t/s</td>
                      <td className="p-3 border border-gray-300 text-gray-700">General Purpose</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Reasoning Score Chart */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Reasoning Score (Est. GSM8K)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={llmReasoningData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#374151' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                      tick={{ fontSize: 11, fill: '#374151' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      formatter={(value: number) => [`${value}%`, 'Reasoning Score']}
                    />
                    <Bar dataKey="score" fill="#f97316" radius={[4, 4, 0, 0]}>
                      {llmReasoningData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Inference Speed Chart */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Inference Speed (CPU, tokens/sec)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={llmInferenceSpeedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#374151' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Speed (tokens/sec)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      formatter={(value: number) => [`${value} t/s`, 'Inference Speed']}
                    />
                    <Bar dataKey="speed" fill="#f97316" radius={[4, 4, 0, 0]}>
                      {llmInferenceSpeedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Memory Footprint Chart */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 lg:col-span-2 mb-4">
                <h4 className="text-base font-bold text-gray-900 mb-4">Memory Footprint: Disk Size vs RAM Usage (GB)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={llmMemoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <YAxis 
                      label={{ value: 'Size (GB)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      formatter={(value: number, name: string) => [`${value} GB`, name === 'disk' ? 'Disk Size (Quantized)' : 'RAM Usage']}
                    />
                    <Legend />
                    <Bar dataKey="disk" fill="#3b82f6" name="Disk Size (Quantized)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ram" fill="#8b5cf6" name="RAM Usage" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Decision Matrix */}
            <div className="mb-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Decision Matrix: Reasoning-to-RAM Ratio</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Feature Requirement</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">DeepSeek-R1 (1.5B)</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Llama 3.2 (3B)</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Gemma 2 (2B)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Strict Logical Reasoning</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Best</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Good</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Weak</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Traceable "Thinking" Logs</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Low RAM (&lt;3GB)</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Hallucination Resistance</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">High</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Medium</span>
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Low</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusion */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h3 className="font-bold text-gray-900 mb-2">Conclusion</h3>
              <p className="text-sm text-gray-800 leading-relaxed">
                <strong>DeepSeek-R1-Distill-Qwen-1.5B</strong> is the only model that satisfies the project's requirement for 
                auditable reasoning within the hardware constraints. Its ability to self-correct via Chain-of-Thought (CoT) 
                processing makes it uniquely suited for the content generation layer, minimizing the risk of unverified 
                hallucinations common in standard small language models.
              </p>
            </div>
          </div>
        </section>

        {/* Translation Benchmarks Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              2. Translation & Multilingual Model Evaluation
            </h2>
            <p className="text-sm text-gray-600 mb-2">Translation Benchmark Report</p>
            <div className="border-t border-gray-300 pt-4">
              <p className="text-sm text-gray-700 leading-relaxed mb-6">
                This document benchmarks multiple translation and multilingual language models evaluated during development 
                of the multilingual educational content pipeline. The focus is on <strong>translation quality</strong>, 
                <strong> language coverage</strong>, <strong>model size</strong>, <strong>disk footprint</strong>, and 
                <strong> suitability under offline / CPU constraints</strong>. Models evaluated across language coverage, 
                translation stability, scientific fidelity, context handling, and offline viability.
              </p>
            </div>

            {/* Model Comparison Table */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Model Comparison Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Model</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Primary Purpose</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Languages</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Indic Languages</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Model Size</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Disk Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-green-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">NLLB-200</td>
                      <td className="p-3 border border-gray-300 text-gray-700">MT (Global)</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700 font-semibold">200+</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700 font-semibold">22+</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~600 MB</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~1.2 GB</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">IndicTrans2</td>
                      <td className="p-3 border border-gray-300 text-gray-700">MT (English ↔ Indic)</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">22</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">22</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~1.1 GB</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~5 GB</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">IndicTrans2</td>
                      <td className="p-3 border border-gray-300 text-gray-700">MT (English ↔ Indic)</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~15</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">15</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~200 MB</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~3 GB</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">DeepSeek-R1</td>
                      <td className="p-3 border border-gray-300 text-gray-700">Reasoning + Generation</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~2</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">0</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~1.3 GB</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~3 GB</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Gemma</td>
                      <td className="p-3 border border-gray-300 text-gray-700">General LLM</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~1</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">0</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~270 MB</td>
                      <td className="p-3 border border-gray-300 text-center text-gray-700">~2 GB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Language Coverage Chart */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Language Coverage</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translationLanguageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#374151' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      label={{ value: 'Languages', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      formatter={(value: number) => [`${value} languages`, 'Total Languages']}
                    />
                    <Bar dataKey="languages" fill="#f97316" name="Total Languages" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Model Size Chart */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Model Size vs Disk Usage (GB)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={translationSizeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#374151' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      label={{ value: 'Size (GB)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      formatter={(value: number, name: string) => [`${value} GB`, name === 'modelSize' ? 'Model Size' : 'Disk Usage']}
                    />
                    <Legend />
                    <Bar dataKey="modelSize" fill="#f97316" name="Model Size" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="diskUsage" fill="#fb923c" name="Disk Usage" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resource Efficiency */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Resource Efficiency (CPU & Offline)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Model</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">CPU Feasibility</th>
                      <th className="text-center p-3 font-semibold text-gray-900 border border-gray-300">Offline Use</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border border-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-green-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">NLLB-200 600M</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-gray-700">Best quality-to-size ratio</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">IndicTrans2 200M</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-gray-700">Lightweight but fragile</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">IndicTrans2 1.1B</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-gray-700">Quality gain but heavy</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">DeepSeek-R1</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-gray-700">Heavy, not optimized for MT</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-300 font-medium text-gray-900">Gemma 270M</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      </td>
                      <td className="p-3 border border-gray-300 text-gray-700">Not translation-focused</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOTA Positioning */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h3 className="font-bold text-gray-900 mb-2">State-of-the-Art (SOTA) Positioning</h3>
              <p className="text-sm text-gray-800 leading-relaxed mb-2">
                <strong>NLLB-200 is considered SOTA</strong> among open-source translation models for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 ml-2">
                <li>Low-resource languages</li>
                <li>Indic language coverage</li>
                <li>Faithful machine translation</li>
              </ul>
              <p className="text-sm text-gray-700 mt-2">
                It consistently outperforms smaller distilled MT models while remaining deployable on CPU systems.
              </p>
            </div>

            {/* Final Conclusion */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h3 className="font-bold text-gray-900 mb-2">Final Recommendation</h3>
              <p className="text-sm text-gray-800 leading-relaxed mb-2">
                <strong>NLLB-200 (distilled 600M)</strong> provides the best balance of:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 ml-2 mb-2">
                <li>Translation quality and stability (stable paragraph-level translation)</li>
                <li>Language coverage (200+ languages, 22+ Indic)</li>
                <li>Disk efficiency (~1.2 GB)</li>
                <li>Offline CPU viability</li>
              </ul>
              <p className="text-sm text-gray-800 leading-relaxed">
                Preserves technical terms accurately (ATP, NADPH, Calvin cycle, chloroplast). Best quality-to-size ratio 
                for production deployment.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BenchmarksPage;
