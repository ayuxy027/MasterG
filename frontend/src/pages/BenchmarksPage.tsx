import React from 'react';

interface BarChartProps {
  data: { label: string; value: number; max: number; color: string; unit?: string };
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const percentage = (data.value / data.max) * 100;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs sm:text-sm font-medium text-gray-700">{data.label}</span>
        <span className="text-xs sm:text-sm font-semibold text-gray-900">
          {data.value}{data.unit || ''}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${data.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface ModelCardProps {
  model: {
    name: string;
    variant: string;
    diskSize: string;
    ramUsage: string;
    reasoningScore: string;
    inferenceSpeed: string;
    architecture: string;
    status: 'winner' | 'good' | 'warning' | 'poor';
    analysis: string;
  };
}

const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const statusColors = {
    winner: 'border-green-400 bg-green-50/30',
    good: 'border-blue-300 bg-blue-50/30',
    warning: 'border-yellow-300 bg-yellow-50/30',
    poor: 'border-red-300 bg-red-50/30',
  };

  const statusIcons = {
    winner: '✓',
    good: '•',
    warning: '⚠',
    poor: '✗',
  };

  return (
    <div className={`rounded-xl border-2 p-5 sm:p-6 ${statusColors[model.status]}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{model.name}</h3>
          <p className="text-xs sm:text-sm text-gray-600">{model.variant}</p>
        </div>
        <span className="text-xl sm:text-2xl">{statusIcons[model.status]}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Disk Size</p>
          <p className="text-sm font-semibold text-gray-900">{model.diskSize}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">RAM Usage</p>
          <p className="text-sm font-semibold text-gray-900">{model.ramUsage}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Reasoning Score</p>
          <p className="text-sm font-semibold text-gray-900">{model.reasoningScore}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Inference Speed</p>
          <p className="text-sm font-semibold text-gray-900">{model.inferenceSpeed}</p>
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Architecture</p>
        <p className="text-xs sm:text-sm font-medium text-gray-800">{model.architecture}</p>
      </div>
      
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{model.analysis}</p>
      </div>
    </div>
  );
};

interface TranslationModelCardProps {
  model: {
    name: string;
    languages: number;
    indicLanguages: number;
    modelSize: string;
    diskUsage: string;
    stability: 'excellent' | 'good' | 'moderate' | 'poor';
    educationalSafety: 'high' | 'medium' | 'low';
    notes: string;
  };
}

const TranslationModelCard: React.FC<TranslationModelCardProps> = ({ model }) => {
  const stabilityColors = {
    excellent: 'text-green-600 bg-green-100',
    good: 'text-blue-600 bg-blue-100',
    moderate: 'text-yellow-600 bg-yellow-100',
    poor: 'text-red-600 bg-red-100',
  };

  const safetyColors = {
    high: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    low: 'text-red-600 bg-red-100',
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl border-2 border-orange-200/60 p-5 sm:p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{model.name}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${stabilityColors[model.stability]}`}>
              {model.stability.charAt(0).toUpperCase() + model.stability.slice(1)} Stability
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${safetyColors[model.educationalSafety]}`}>
              {model.educationalSafety.charAt(0).toUpperCase() + model.educationalSafety.slice(1)} Safety
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Languages</p>
          <p className="text-sm font-semibold text-gray-900">{model.languages}</p>
          <p className="text-xs text-gray-600 mt-1">{model.indicLanguages} Indic</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Model Size</p>
          <p className="text-sm font-semibold text-gray-900">{model.modelSize}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Disk Usage</p>
          <p className="text-sm font-semibold text-gray-900">{model.diskUsage}</p>
        </div>
      </div>
      
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{model.notes}</p>
      </div>
    </div>
  );
};

const BenchmarksPage: React.FC = () => {
  const llmModels = [
    {
      name: 'DeepSeek-R1',
      variant: 'Distill-Qwen-1.5B',
      diskSize: '~1.1 GB',
      ramUsage: '~2.2 GB',
      reasoningScore: 'High (~78%)',
      inferenceSpeed: '35-45 t/s',
      architecture: 'Reasoning (CoT)',
      status: 'winner' as const,
      analysis: 'Specialized reasoning model with auditable Chain-of-Thought processing. Achieves reasoning parity with ~7B parameter models using only 1.5B parameters. High resistance to prompt drift during long-context educational tasks.',
    },
    {
      name: 'Llama 3.2',
      variant: '3B Instruct',
      diskSize: '~2.4 GB',
      ramUsage: '~4.1 GB',
      reasoningScore: 'Med-High (~72%)',
      inferenceSpeed: '15-25 t/s',
      architecture: 'General Purpose',
      status: 'good' as const,
      analysis: 'Robust general-purpose model with excellent language fluency and instruction following. Lacks dedicated internal monologue training. Impractical for this constraint due to size and slower CPU inference.',
    },
    {
      name: 'Gemma 2',
      variant: '2B Instruct',
      diskSize: '~1.6 GB',
      ramUsage: '~3.0 GB',
      reasoningScore: 'Moderate (~55%)',
      inferenceSpeed: '25-30 t/s',
      architecture: 'General Purpose',
      status: 'warning' as const,
      analysis: 'Lightweight general LLM highly capable for creative writing. Struggles with strict logical adherence in educational contexts. Exhibits high "confidence-to-accuracy" gap (hallucinates confidently).',
    },
    {
      name: 'Qwen 2.5',
      variant: '0.5B Instruct',
      diskSize: '~0.4 GB',
      ramUsage: '~0.8 GB',
      reasoningScore: 'Low (<40%)',
      inferenceSpeed: '60+ t/s',
      architecture: 'General Purpose',
      status: 'poor' as const,
      analysis: 'Nano LLM with exceptional size efficiency. Parameter count too low to sustain consistent factual accuracy for educational content. Insufficient for complex reasoning tasks.',
    },
  ];

  const translationModels = [
    {
      name: 'NLLB-200',
      variant: '600M Distilled',
      languages: 200,
      indicLanguages: 22,
      modelSize: '~600 MB',
      diskUsage: '~1.2 GB',
      stability: 'excellent' as const,
      educationalSafety: 'high' as const,
      notes: 'State-of-the-art for low-resource languages. Stable paragraph-level translation with preserved sentence boundaries. Preserves technical terms accurately (ATP, NADPH, Calvin cycle). Best quality-to-size ratio.',
    },
    {
      name: 'IndicTrans2',
      variant: '1.1B',
      languages: 22,
      indicLanguages: 22,
      modelSize: '~1.1 GB',
      diskUsage: '~5 GB',
      stability: 'good' as const,
      educationalSafety: 'medium' as const,
      notes: 'Improved sentence and clause handling over 200M variant. More stable for educational text. High memory and latency cost on CPU-only setups. Quality gain but heavy resource footprint.',
    },
    {
      name: 'IndicTrans2',
      variant: '200M Distilled',
      languages: 15,
      indicLanguages: 15,
      modelSize: '~200 MB',
      diskUsage: '~3 GB',
      stability: 'moderate' as const,
      educationalSafety: 'low' as const,
      notes: 'Works reliably only for short, single sentences. Collapses on paragraph-level input. Merges sentences and flips subjects under context load. Drops or corrupts scientific terminology.',
    },
    {
      name: 'DeepSeek-R1',
      variant: 'SLM',
      languages: 2,
      indicLanguages: 2,
      modelSize: '~1.3 GB',
      diskUsage: '~3 GB',
      stability: 'poor' as const,
      educationalSafety: 'low' as const,
      notes: 'Designed for reasoning, not translation. Produces paraphrases instead of faithful translations. Hallucinates corrections in educational content. Heavy and not optimized for MT.',
    },
    {
      name: 'Gemma',
      variant: '270M',
      languages: 1,
      indicLanguages: 1,
      modelSize: '~270 MB',
      diskUsage: '~2 GB',
      stability: 'poor' as const,
      educationalSafety: 'low' as const,
      notes: 'Not a translation model. Fails on sentence-level fidelity. Unsuitable for multilingual education. Often modifies or corrects scientific facts unintentionally.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            Technical <span className="text-orange-400">Benchmarks</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive evaluation metrics for on-device reasoning and multilingual translation models
          </p>
        </div>

        {/* LLM Benchmarks Section */}
        <section className="mb-12">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Small Language Models (SLM) Evaluation
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
              Evaluation of four Small Language Models for local content generation and reasoning systems.
              Prioritizes <strong>reasoning capability (Chain of Thought)</strong>, <strong>factual adherence</strong>, and 
              <strong> auditable logic</strong> over raw inference speed. All models evaluated under constrained offline 
              environment (CPU Inference) with 4-bit (Q4_K_M) quantization via GGUF format.
            </p>
            
            {/* Key Metrics Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Reasoning Efficacy</p>
                <p className="text-sm font-semibold text-gray-900">Zero-shot CoT</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Memory Footprint</p>
                <p className="text-sm font-semibold text-gray-900">VRAM/RAM Usage</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Auditability</p>
                <p className="text-sm font-semibold text-gray-900">CoT Traces</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Production Model</p>
                <p className="text-sm font-semibold text-green-600">DeepSeek-R1</p>
              </div>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {llmModels.map((model, index) => (
                <ModelCard key={index} model={model} />
              ))}
            </div>

            {/* Performance Charts */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">Reasoning Score (Est. GSM8K)</h3>
                {llmModels.map((model, index) => {
                  let score = 0;
                  if (model.reasoningScore.includes('High')) {
                    score = parseFloat(model.reasoningScore.match(/~?(\d+)/)?.[1] || '78');
                  } else if (model.reasoningScore.includes('Med-High')) {
                    score = parseFloat(model.reasoningScore.match(/~?(\d+)/)?.[1] || '72');
                  } else if (model.reasoningScore.includes('Moderate')) {
                    score = parseFloat(model.reasoningScore.match(/~?(\d+)/)?.[1] || '55');
                  } else if (model.reasoningScore.includes('Low')) {
                    score = parseFloat(model.reasoningScore.match(/(\d+)/)?.[1] || '35');
                  }
                  const maxScore = 100;
                  return (
                    <BarChart
                      key={index}
                      data={{
                        label: model.name,
                        value: score,
                        max: maxScore,
                        color: model.status === 'winner' ? 'bg-green-500' : 
                               model.status === 'good' ? 'bg-blue-500' :
                               model.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500',
                        unit: '%',
                      }}
                    />
                  );
                })}
              </div>
              
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">Inference Speed (CPU, tokens/sec)</h3>
                {llmModels.map((model, index) => {
                  const speed = parseFloat(model.inferenceSpeed.match(/\d+/)?.[0] || '0');
                  const maxSpeed = 70;
                  return (
                    <BarChart
                      key={index}
                      data={{
                        label: model.name,
                        value: speed,
                        max: maxSpeed,
                        color: model.status === 'winner' ? 'bg-green-500' : 
                               model.status === 'good' ? 'bg-blue-500' :
                               model.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500',
                        unit: ' t/s',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Decision Matrix */}
            <div className="mt-8 bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Reasoning-to-RAM Ratio Decision Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 font-semibold text-gray-900">Feature Requirement</th>
                      <th className="text-center py-2 font-semibold text-gray-900">DeepSeek-R1 (1.5B)</th>
                      <th className="text-center py-2 font-semibold text-gray-900">Llama 3.2 (3B)</th>
                      <th className="text-center py-2 font-semibold text-gray-900">Gemma 2 (2B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 font-medium text-gray-800">Strict Logical Reasoning</td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Best</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Good</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Weak</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-800">Traceable "Thinking" Logs</td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-800">Low RAM (&lt;3GB)</td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">No</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Yes</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-800">Hallucination Resistance</td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">High</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Medium</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Low</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusion */}
            <div className="mt-6 bg-green-50/50 border-2 border-green-200 rounded-xl p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Final Recommendation</h3>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
                <strong>DeepSeek-R1-Distill-Qwen-1.5B</strong> is selected as the production model. It demonstrates 
                a superior balance of reasoning density and memory efficiency, outperforming larger general-purpose 
                models in logical consistency while maintaining a sub-1.5GB footprint. The model's ability to 
                self-correct via Chain-of-Thought (CoT) processing makes it uniquely suited for content generation, 
                minimizing the risk of unverified hallucinations common in standard small language models.
              </p>
            </div>
          </div>
        </section>

        {/* Translation Benchmarks Section */}
        <section className="mb-12">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Translation & Multilingual Model Evaluation
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
              Comprehensive benchmarking of translation and multilingual language models for educational content 
              pipeline. Evaluation focuses on <strong>translation quality</strong>, <strong>language coverage</strong>, 
              <strong> model size</strong>, <strong>disk footprint</strong>, and <strong>suitability under offline/CPU constraints</strong>. 
              Models evaluated across language coverage, translation stability, scientific fidelity, context handling, 
              and offline viability.
            </p>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Language Coverage</p>
                <p className="text-sm font-semibold text-gray-900">22+ Indic</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Translation Stability</p>
                <p className="text-sm font-semibold text-gray-900">Paragraph-level</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Scientific Fidelity</p>
                <p className="text-sm font-semibold text-gray-900">Term Preservation</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Offline Viability</p>
                <p className="text-sm font-semibold text-gray-900">CPU-only</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Production Model</p>
                <p className="text-sm font-semibold text-green-600">NLLB-200</p>
              </div>
            </div>

            {/* Translation Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {translationModels.map((model, index) => (
                <TranslationModelCard key={index} model={model} />
              ))}
            </div>

            {/* Language Coverage Chart */}
            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Language Coverage Analysis</h3>
              {translationModels.map((model, index) => {
                const maxLanguages = 200;
                return (
                  <BarChart
                    key={index}
                    data={{
                      label: `${model.name} ${model.variant}`,
                      value: model.languages,
                      max: maxLanguages,
                      color: model.stability === 'excellent' ? 'bg-green-500' :
                             model.stability === 'good' ? 'bg-blue-500' :
                             model.stability === 'moderate' ? 'bg-yellow-500' : 'bg-red-500',
                      unit: ` (${model.indicLanguages} Indic)`,
                    }}
                  />
                );
              })}
              <p className="text-xs sm:text-sm text-gray-600 mt-4 italic">
                ➡️ NLLB-200 provides the widest language coverage by a large margin, supporting 200+ global languages 
                including all major and regional Indian languages (Bhojpuri, Santali, etc.).
              </p>
            </div>

            {/* Resource Efficiency Table */}
            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Resource Efficiency (CPU & Offline)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 font-semibold text-gray-900">Model</th>
                      <th className="text-center py-2 font-semibold text-gray-900">CPU Feasibility</th>
                      <th className="text-center py-2 font-semibold text-gray-900">Offline Use</th>
                      <th className="text-left py-2 font-semibold text-gray-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { name: 'DeepSeek-R1', cpu: '⚠️', offline: '❌', notes: 'Heavy, not optimized for MT' },
                      { name: 'Gemma 270M', cpu: '⚠️', offline: '❌', notes: 'Not translation-focused' },
                      { name: 'IndicTrans2 200M', cpu: '✅', offline: '✅', notes: 'Lightweight but fragile' },
                      { name: 'IndicTrans2 1.1B', cpu: '⚠️', offline: '⚠️', notes: 'Quality gain but heavy' },
                      { name: 'NLLB-200 600M', cpu: '✅', offline: '✅', notes: 'Best quality-to-size ratio' },
                    ].map((row, index) => (
                      <tr key={index}>
                        <td className="py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="text-center py-3 text-lg">{row.cpu}</td>
                        <td className="text-center py-3 text-lg">{row.offline}</td>
                        <td className="py-3 text-gray-700">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOTA Positioning */}
            <div className="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-5 sm:p-6 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">State-of-the-Art (SOTA) Positioning</h3>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-3">
                <strong>NLLB-200 is considered SOTA</strong> among open-source translation models for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-800 ml-2">
                <li>Low-resource languages</li>
                <li>Indic language coverage</li>
                <li>Faithful machine translation</li>
              </ul>
              <p className="text-sm sm:text-base text-gray-700 mt-3">
                It consistently outperforms smaller distilled MT models while remaining deployable on CPU systems.
              </p>
            </div>

            {/* Final Conclusion */}
            <div className="bg-green-50/50 border-2 border-green-200 rounded-xl p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Final Recommendation</h3>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-3">
                <strong>NLLB-200 (distilled 600M)</strong> provides the best balance of:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-800 ml-2 mb-3">
                <li>Translation quality and stability</li>
                <li>Language coverage (200+ languages, 22+ Indic)</li>
                <li>Disk efficiency (~1.2 GB)</li>
                <li>Offline CPU viability</li>
              </ul>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
                Stable paragraph-level translation with preserved sentence boundaries. Preserves technical terms 
                accurately (ATP, NADPH, Calvin cycle, chloroplast). Best quality-to-size ratio for production deployment.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BenchmarksPage;

