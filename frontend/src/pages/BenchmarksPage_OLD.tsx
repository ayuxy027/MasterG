import React, { useState } from 'react';
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
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ChevronRight,
} from 'lucide-react';

const BenchmarksPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'llm' | 'translation'>('llm');

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

  const Badge = ({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'warning' | 'error' }) => {
    const variants = {
      default: 'bg-gray-100 text-gray-700',
      success: 'bg-orange-50 text-orange-700',
      warning: 'bg-orange-100 text-orange-800',
      error: 'bg-gray-100 text-gray-600',
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${variants[variant]}`}>
        {variant === 'success' && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
        {variant === 'warning' && <AlertTriangle className="w-3 h-3 mr-1.5" />}
        {variant === 'error' && <XCircle className="w-3 h-3 mr-1.5" />}
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 via-transparent to-orange-50/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-6">
              <BarChart3 className="w-4 h-4" />
              Technical Documentation
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
              Performance{' '}
              <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                  Benchmarks
                </span>
                <span className="absolute bottom-2 left-0 right-0 h-3 bg-orange-200/50 -z-0" />
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Comprehensive evaluation metrics for on-device reasoning and multilingual translation models.
              Built for offline-first, privacy-preserving AI experiences.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1.5 rounded-2xl bg-gray-100 shadow-inner">
              <button
                onClick={() => setActiveSection('llm')}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeSection === 'llm'
                    ? 'bg-white text-gray-900 shadow-lg shadow-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Language Models
                </span>
              </button>
              <button
                onClick={() => setActiveSection('translation')}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeSection === 'translation'
                    ? 'bg-white text-gray-900 shadow-lg shadow-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Translation Models
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* LLM Section */}
        {activeSection === 'llm' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Section Header */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold shadow-lg shadow-orange-200">
                  1
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Small Language Models (SLM)
                  </h2>
                  <p className="text-gray-600">Technical Evaluation Report</p>
                </div>
              </div>
            </div>

            {/* Executive Summary Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white shadow-2xl shadow-emerald-200">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-6 h-6" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Executive Summary</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  DeepSeek-R1 1.5B
                </h3>
                <p className="text-white/90 leading-relaxed max-w-3xl">
                  Selected as the production model. Demonstrates superior balance of reasoning density and memory efficiency,
                  outperforming larger general-purpose models in logical consistency while maintaining a sub-1.5GB footprint.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <Target className="w-4 h-4" /> 78% Reasoning Score
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <HardDrive className="w-4 h-4" /> 1.1 GB Disk
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <Zap className="w-4 h-4" /> 40 tokens/sec
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Brain} label="Reasoning Score" value="78%" subtext="GSM8K Benchmark" color="orange" />
              <StatCard icon={Zap} label="Inference Speed" value="40 t/s" subtext="CPU @ 4-bit Quant" color="green" />
              <StatCard icon={HardDrive} label="Disk Size" value="1.1 GB" subtext="Q4_K_M Format" color="blue" />
              <StatCard icon={MemoryStick} label="RAM Usage" value="2.2 GB" subtext="Runtime Memory" color="purple" />
            </div>

            {/* Model Cards */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="w-5 h-5 text-orange-600" />
                <h3 className="text-xl font-bold text-gray-900">Model Comparison</h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModelCard
                  name="DeepSeek-R1"
                  variant="1.5B"
                  isRecommended
                  stats={{ reasoning: '~78%', speed: '35-45 t/s', ram: '~2.2 GB', disk: '~1.1 GB' }}
                  features={[
                    { label: 'CoT Reasoning', variant: 'success' },
                    { label: 'Low RAM', variant: 'success' },
                  ]}
                />
                <ModelCard
                  name="Llama 3.2"
                  variant="3B Instruct"
                  stats={{ reasoning: '~72%', speed: '15-25 t/s', ram: '~4.1 GB', disk: '~2.4 GB' }}
                  features={[
                    { label: 'Good Quality', variant: 'success' },
                    { label: 'High RAM', variant: 'warning' },
                  ]}
                />
                <ModelCard
                  name="Gemma 2"
                  variant="2B Instruct"
                  stats={{ reasoning: '~55%', speed: '25-30 t/s', ram: '~3.0 GB', disk: '~1.6 GB' }}
                  features={[
                    { label: 'Moderate', variant: 'warning' },
                    { label: 'General Purpose', variant: 'warning' },
                  ]}
                />
                <ModelCard
                  name="Qwen 2.5"
                  variant="0.5B Instruct"
                  stats={{ reasoning: '<40%', speed: '60+ t/s', ram: '~0.8 GB', disk: '~0.4 GB' }}
                  features={[
                    { label: 'Ultra Fast', variant: 'success' },
                    { label: 'Low Accuracy', variant: 'error' },
                  ]}
                />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartContainer title="Reasoning Score" subtitle="Est. GSM8K Benchmark" icon={Brain}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={llmReasoningData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <defs>
                      <linearGradient id="reasoningGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Reasoning Score']}
                      cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }}
                    />
                    <Bar dataKey="score" fill="url(#reasoningGradient)" radius={[8, 8, 0, 0]}>
                      {llmReasoningData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Inference Speed" subtitle="CPU Performance (tokens/sec)" icon={Zap}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={llmInferenceSpeedData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value} t/s`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                      }}
                      formatter={(value: number) => [`${value} t/s`, 'Inference Speed']}
                      cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }}
                    />
                    <Bar dataKey="speed" radius={[8, 8, 0, 0]}>
                      {llmInferenceSpeedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Full Width Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartContainer title="Memory Footprint" subtitle="Disk Size vs RAM Usage (GB)" icon={HardDrive}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={llmMemoryData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value} GB`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                      }}
                      formatter={(value: number, name: string) => [`${value} GB`, name === 'disk' ? 'Disk Size' : 'RAM Usage']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="disk" fill="#3b82f6" name="Disk Size (Quantized)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="ram" fill="#8b5cf6" name="RAM Usage" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Capability Radar" subtitle="Multi-dimensional Comparison" icon={Target}>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={llmRadarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="feature" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="DeepSeek-R1" dataKey="DeepSeek" stroke="#f97316" fill="#f97316" fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Llama 3.2" dataKey="Llama" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Gemma 2" dataKey="Gemma" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Decision Matrix */}
            <div className="rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-100">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Decision Matrix</h3>
                    <p className="text-sm text-gray-500">Reasoning-to-RAM Ratio Analysis</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm">Feature Requirement</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-orange-500" />
                          DeepSeek-R1 (1.5B)
                        </span>
                      </th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Llama 3.2 (3B)</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Gemma 2 (2B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Strict Logical Reasoning</td>
                      <td className="p-4 text-center"><FeatureTag label="Best" variant="success" /></td>
                      <td className="p-4 text-center"><FeatureTag label="Good" variant="warning" /></td>
                      <td className="p-4 text-center"><FeatureTag label="Weak" variant="error" /></td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Traceable "Thinking" Logs</td>
                      <td className="p-4 text-center"><FeatureTag label="Yes" variant="success" /></td>
                      <td className="p-4 text-center"><FeatureTag label="No" variant="error" /></td>
                      <td className="p-4 text-center"><FeatureTag label="No" variant="error" /></td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Low RAM (&lt;3GB)</td>
                      <td className="p-4 text-center"><FeatureTag label="Yes" variant="success" /></td>
                      <td className="p-4 text-center"><FeatureTag label="No" variant="error" /></td>
                      <td className="p-4 text-center"><FeatureTag label="Yes" variant="success" /></td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Hallucination Resistance</td>
                      <td className="p-4 text-center"><FeatureTag label="High" variant="success" /></td>
                      <td className="p-4 text-center"><FeatureTag label="Medium" variant="warning" /></td>
                      <td className="p-4 text-center"><FeatureTag label="Low" variant="error" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusion */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                  <Lightbulb className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Conclusion</h3>
                  <p className="text-gray-300 leading-relaxed max-w-3xl">
                    <strong className="text-white">DeepSeek-R1 1.5B</strong> is the only model that satisfies the project's requirement for
                    auditable reasoning within hardware constraints. Its ability to self-correct via Chain-of-Thought (CoT)
                    processing makes it uniquely suited for the content generation layer, minimizing the risk of unverified
                    hallucinations common in standard small language models.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Translation Section */}
        {activeSection === 'translation' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Section Header */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold shadow-lg shadow-orange-200">
                  2
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Translation & Multilingual Models
                  </h2>
                  <p className="text-gray-600">Translation Benchmark Report</p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white shadow-2xl shadow-blue-200">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-6 h-6" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Recommended Model</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  NLLB-200 (Distilled 600M)
                </h3>
                <p className="text-white/90 leading-relaxed max-w-3xl">
                  Provides the best balance of translation quality, language coverage (200+ languages, 22+ Indic),
                  disk efficiency (~1.2 GB), and offline CPU viability. Preserves technical terms accurately.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <Globe className="w-4 h-4" /> 200+ Languages
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <Languages className="w-4 h-4" /> 22+ Indic Languages
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium">
                    <HardDrive className="w-4 h-4" /> 1.2 GB Disk
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Globe} label="Total Languages" value="200+" subtext="Global Coverage" color="blue" />
              <StatCard icon={Languages} label="Indic Languages" value="22+" subtext="Regional Support" color="orange" />
              <StatCard icon={HardDrive} label="Model Size" value="600 MB" subtext="Distilled Version" color="green" />
              <StatCard icon={Cpu} label="Disk Usage" value="1.2 GB" subtext="Full Installation" color="purple" />
            </div>

            {/* Model Comparison Table */}
            <div className="rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Model Comparison</h3>
                    <p className="text-sm text-gray-500">Translation & Multilingual Model Specifications</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm">Model</th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm">Primary Purpose</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Languages</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Indic Languages</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Model Size</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Disk Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-green-50/50 hover:bg-green-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-gray-900">NLLB-200</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">MT (Global)</td>
                      <td className="p-4 text-center"><span className="font-bold text-emerald-600">200+</span></td>
                      <td className="p-4 text-center"><span className="font-bold text-emerald-600">22+</span></td>
                      <td className="p-4 text-center text-gray-600">~600 MB</td>
                      <td className="p-4 text-center text-gray-600">~1.2 GB</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">IndicTrans2</td>
                      <td className="p-4 text-gray-600">MT (English ↔ Indic)</td>
                      <td className="p-4 text-center text-gray-600">22</td>
                      <td className="p-4 text-center text-gray-600">22</td>
                      <td className="p-4 text-center text-gray-600">~1.1 GB</td>
                      <td className="p-4 text-center text-gray-600">~5 GB</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">IndicTrans2</td>
                      <td className="p-4 text-gray-600">MT (English ↔ Indic)</td>
                      <td className="p-4 text-center text-gray-600">~15</td>
                      <td className="p-4 text-center text-gray-600">15</td>
                      <td className="p-4 text-center text-gray-600">~200 MB</td>
                      <td className="p-4 text-center text-gray-600">~3 GB</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">DeepSeek-R1</td>
                      <td className="p-4 text-gray-600">Reasoning + Generation</td>
                      <td className="p-4 text-center text-gray-600">~2</td>
                      <td className="p-4 text-center text-gray-600">0</td>
                      <td className="p-4 text-center text-gray-600">~1.3 GB</td>
                      <td className="p-4 text-center text-gray-600">~3 GB</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Gemma</td>
                      <td className="p-4 text-gray-600">General LLM</td>
                      <td className="p-4 text-center text-gray-600">~1</td>
                      <td className="p-4 text-center text-gray-600">0</td>
                      <td className="p-4 text-center text-gray-600">~270 MB</td>
                      <td className="p-4 text-center text-gray-600">~2 GB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartContainer title="Language Coverage" subtitle="Total Supported Languages" icon={Globe}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={translationLanguageData} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                      }}
                      formatter={(value: number) => [`${value} languages`, 'Total Languages']}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    />
                    <Bar dataKey="languages" name="Total Languages" radius={[8, 8, 0, 0]}>
                      {translationLanguageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Model Size vs Disk Usage" subtitle="Storage Requirements (GB)" icon={HardDrive}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={translationSizeData} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value} GB`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                      }}
                      formatter={(value: number, name: string) => [`${value} GB`, name === 'modelSize' ? 'Model Size' : 'Disk Usage']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="modelSize" fill="#f97316" name="Model Size" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="diskUsage" fill="#fb923c" name="Disk Usage" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Resource Efficiency Table */}
            <div className="rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-100">
                    <Cpu className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Resource Efficiency</h3>
                    <p className="text-sm text-gray-500">CPU & Offline Capability Analysis</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm">Model</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">CPU Feasibility</th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm">Offline Use</th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-green-50/50 hover:bg-green-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-gray-900">NLLB-200 600M</span>
                        </div>
                      </td>
                      <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                      <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                      <td className="p-4 text-gray-600">Best quality-to-size ratio</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">IndicTrans2 200M</td>
                      <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                      <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                      <td className="p-4 text-gray-600">Lightweight but fragile</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">IndicTrans2 1.1B</td>
                      <td className="p-4 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                      <td className="p-4 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                      <td className="p-4 text-gray-600">Quality gain but heavy</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">DeepSeek-R1</td>
                      <td className="p-4 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                      <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                      <td className="p-4 text-gray-600">Heavy, not optimized for MT</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">Gemma 270M</td>
                      <td className="p-4 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                      <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                      <td className="p-4 text-gray-600">Not translation-focused</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOTA Info Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-100">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">State-of-the-Art (SOTA) Positioning</h3>
                  <p className="text-gray-700 mb-4">
                    <strong>NLLB-200 is considered SOTA</strong> among open-source translation models for:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-200 text-sm font-medium text-gray-700">
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                      Low-resource languages
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-200 text-sm font-medium text-gray-700">
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                      Indic language coverage
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-200 text-sm font-medium text-gray-700">
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                      Faithful machine translation
                    </span>
                  </div>
                  <p className="text-gray-600 mt-4 text-sm">
                    It consistently outperforms smaller distilled MT models while remaining deployable on CPU systems.
                  </p>
                </div>
              </div>
            </div>

            {/* Final Conclusion */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                    <Lightbulb className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold">Final Recommendation</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  <strong className="text-white">NLLB-200 (distilled 600M)</strong> provides the best balance of:
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                    <p className="text-sm text-gray-300">Translation quality and stability</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <Globe className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-sm text-gray-300">200+ languages, 22+ Indic</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <HardDrive className="w-5 h-5 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-300">Disk efficiency (~1.2 GB)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <Cpu className="w-5 h-5 text-orange-400 mb-2" />
                    <p className="text-sm text-gray-300">Offline CPU viability</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Preserves technical terms accurately (ATP, NADPH, Calvin cycle, chloroplast). Best quality-to-size ratio for production deployment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarksPage;
