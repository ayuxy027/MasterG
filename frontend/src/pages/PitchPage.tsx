import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Benchmark {
  name: string;
  metric: string;
  target: string;
}

const benchmarks: Benchmark[] = [
  {
    name: 'Machine Translation Quality',
    metric: 'BLEU, METEOR, chrF/chrF++',
    target: '≥95% accuracy across 15+ languages'
  },
  {
    name: 'Summarization Quality',
    metric: 'ROUGE-1/2/L',
    target: '≥0.8 vs expert summaries'
  },
  {
    name: 'Symbol & Notation Accuracy',
    metric: 'Symbol Accuracy Rate (SAR)',
    target: '≥98%'
  },
  {
    name: 'Script Fidelity',
    metric: 'CER, WER',
    target: '≥95% (CER ≤1–2% for complex scripts)'
  },
  {
    name: 'Code-Mixing Robustness',
    metric: 'Accuracy Drop Ratio',
    target: '≤10%'
  },
  {
    name: 'Cultural Relevance',
    metric: 'Cultural Adequacy Score (Likert)',
    target: '≥4/5, κ ≥0.6'
  },
  {
    name: 'Reasoning Quality (SLM)',
    metric: 'GSM8K-style reasoning score',
    target: '≥70% on primary curriculum reasoning tasks'
  },
  {
    name: 'Inference Speed (On-Device)',
    metric: 'Tokens/second on CPU-only 4–8 GB RAM devices',
    target: '≥25 t/s for generation workloads'
  },
  {
    name: 'Memory Footprint',
    metric: 'Quantized model size and peak RAM usage',
    target: '≤1.5 GB disk, ≤3 GB RAM for core reasoning model'
  },
  {
    name: 'Translation Coverage & Quality (MT)',
    metric: 'Number of supported languages and Indic languages, plus BLEU/chrF',
    target: '200+ total languages with 22+ Indic at state-of-the-art quality'
  }
];

const PitchPage = () => {
  const [visibleBenchmarks, setVisibleBenchmarks] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showJourney, setShowJourney] = useState(true);
  const problemRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);
  const benchmarksRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === requirementsRef.current) {
              // Stagger benchmark appearance
              benchmarks.forEach((_, index) => {
                setTimeout(() => {
                  setVisibleBenchmarks((prev) => [...prev, index]);
                }, index * 200);
              });
            } else if (entry.target === resultsRef.current) {
              setShowResults(true);
            } else if (entry.target === journeyRef.current) {
              setShowJourney(true);
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    if (problemRef.current) observer.observe(problemRef.current);
    if (requirementsRef.current) observer.observe(requirementsRef.current);
    if (benchmarksRef.current) observer.observe(benchmarksRef.current);
    if (resultsRef.current) observer.observe(resultsRef.current);
    if (solutionRef.current) observer.observe(solutionRef.current);
    if (journeyRef.current) observer.observe(journeyRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-orange-50/40">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
          <div className="mb-8">
            <img
              src="/pitch/pitch.png"
              alt="MasterG Team"
              className="mx-auto rounded-2xl shadow-2xl max-w-2xl w-full h-auto object-cover"
            />
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
            Hello Judges!
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-500/80 leading-tight">
            We are the Creators of MasterG
          </h2>
        </div>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-orange-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section ref={problemRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white" >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-12 text-center">
            The Challenge
          </h2>
          <div className="prose prose-lg max-w-none">
            <div className="bg-orange-50/60 border-l-4 border-orange-400/60 p-6 rounded-r-lg mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Multilingual Content Generation Crisis
              </h3>
              <p className="text-gray-700 mb-4">
                Design a lightweight, multilingual AI system to generate educational content across all 22 scheduled Indian languages, including key regional dialects like Bhojpuri and Santali.
              </p>
              <p className="text-gray-700 mb-4">
                Rural Indian students face significant barriers in accessing quality educational content in their native languages. Current educational AI systems are predominantly English-focused and fail to serve the linguistic diversity of India's student population.
              </p>
            </div>

            <div className="space-y-4 text-gray-700">
              <h4 className="text-xl font-bold text-gray-900">Core Requirements:</h4>
              <ul className="space-y-3 list-disc list-inside">
                <li><strong>Script Accuracy Assurance</strong> - Guarantee correct usage of characters, numbers, and symbols for complex subjects such as mathematics and science across all supported scripts</li>
                <li><strong>Age-Appropriate Scaling</strong> - Adapt curriculum topics (e.g., Photosynthesis) to different grade levels (Class 3, 8, 12) with appropriate depth, vocabulary, and examples</li>
                <li><strong>Cultural Relevance Embedding</strong> - Integrate region-specific festivals, stories, and local references while maintaining a pan-Indian educational perspective</li>
                <li><strong>Code-Mixing Fluency</strong> - Seamlessly handle mixed-language content (e.g., Hindi-English, Punjabi-English) without losing readability or comprehension</li>
                <li><strong>Curriculum Alignment</strong> - Strictly adhere to NCERT, CBSE, and state board standards with factual accuracy above 95%</li>
                <li><strong>Accessibility Support</strong> - Provide learning-friendly outputs for students with dyslexia, visual impairments, or other learning challenges</li>
                <li><strong>Offline Optimization</strong> - Run efficiently on low-resource devices (4–8 GB RAM), ensuring smooth operation in low-connectivity or offline rural settings</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Were Tough Section */}
      <section ref={requirementsRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-orange-50/40" >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 text-center">
            You Know That...
          </h2>
          <p className="text-3xl sm:text-4xl font-semibold text-center text-gray-700 mb-16">
            Requirements Were Tough
          </p>

          <div ref={benchmarksRef} className="space-y-6">
            {benchmarks.map((benchmark, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-400/60 transform transition-all duration-500 ${visibleBenchmarks.includes(index)
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-10'
                  }`}
                style={{
                  transitionDelay: visibleBenchmarks.includes(index) ? '0ms' : '0ms'
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {benchmark.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {benchmark.metric}
                    </p>
                    <p className="text-orange-600/80 font-semibold">
                      Target: {benchmark.target}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section ref={resultsRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-orange-50/40 to-white" >
        <div className="max-w-6xl mx-auto text-center">
          <div className={`transform transition-all duration-1000 ${showResults ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-orange-500/80 mb-8">
              And Guess What,
            </h2>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-16">
              We Beat Them All!!
            </h2>
          </div>
        </div>
      </section>

      {/* Solution Introduction */}
      <section ref={solutionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white" >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8">
              Introducing MasterG
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-4">
              Your Lightweight Growth Companion
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-orange-50/60 to-orange-100/60 rounded-2xl p-8 shadow-xl border border-orange-200/50 hover:shadow-2xl transition-shadow duration-300">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Astonishing Performance
              </h3>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                Works on a <strong className="text-orange-600/80">1.3 GB RAM</strong> memory and <strong className="text-orange-600/80">4 GB</strong> of disc space
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                Works <strong className="text-orange-600/80">completely offline!</strong>
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-2xl p-8 shadow-xl border border-orange-200/50 hover:shadow-2xl transition-shadow duration-300">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Built with Open Source
              </h3>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                Built using <strong className="text-orange-600/80">open source</strong> and <strong className="text-orange-600/80">minimal external tooling</strong>
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                We leveraged <strong className="text-orange-600/80">open weight models</strong> from proprietary providers like <strong className="text-orange-600/80">DeepSeek</strong> and <strong className="text-orange-600/80">Meta</strong>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-400/80 to-orange-500/80 rounded-2xl p-8 shadow-2xl text-center border-4 border-orange-300/60">
            <h3 className="text-3xl font-bold text-white mb-6">
              DeepSeek R1 1.5B and NLLB 600M
            </h3>
            <p className="text-xl text-orange-50/90">
              To be precise ;)
            </p>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section ref={journeyRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-orange-50/40" >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8">
              The Journey
            </h2>
            <p className="text-xl sm:text-2xl text-gray-700 italic">
              It was not easy...
            </p>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 transform transition-all duration-1000 ${showJourney ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border-t-4 border-orange-400/60 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl font-bold text-orange-600/80 mb-2">5</div>
              <div className="text-gray-700 font-semibold">Features</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border-t-4 border-orange-300/60 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl font-bold text-orange-500/80 mb-2">200+</div>
              <div className="text-gray-700 font-semibold">Commits</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border-t-4 border-orange-500/60 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl font-bold text-orange-600/80 mb-2">11</div>
              <div className="text-gray-700 font-semibold">Days of R&D</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center border-t-4 border-orange-400/60 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl font-bold text-orange-600/80 mb-2">18</div>
              <div className="text-gray-700 font-semibold">Branches</div>
            </div>
          </div>

          {/* Progress Timeline Graph */}
          <div className={`mb-16 transform transition-all duration-1000 delay-200 ${showJourney ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-orange-100/50">
              <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">
                Development Progress
              </h3>
              <p className="text-xl text-gray-700 text-center mb-8 italic">
                So here's how our 8 weeks of development went by
              </p>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-200/60 via-orange-300/70 to-orange-400/80"></div>

                {/* Timeline Items */}
                <div className="space-y-12 relative z-10">
                  {[
                    { phase: 'Phase 1', milestone: 'Relied on cloud APIs and external libraries', progress: 25 },
                    { phase: 'Phase 2', milestone: 'Completion of MVP in hybrid model where we had offline/online fixture', progress: 50 },
                    { phase: 'Phase 3', milestone: 'Migrated all cloud services to offline', progress: 75 },
                    { phase: 'Phase 4', milestone: 'Aggressive optimization - saw state of art changes and responses from our architectures', progress: 100 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-6">
                      <div className="shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-orange-300/70 to-orange-400/80 shadow-lg flex items-center justify-center border-4 border-white">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-orange-50/60 to-white rounded-xl p-6 shadow-md border border-orange-100/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-orange-600/80 font-bold text-lg">{item.phase}</span>
                          <span className="text-orange-600/80 font-semibold">{item.progress}%</span>
                        </div>
                        <p className="text-gray-800 text-base mb-3 leading-relaxed">{item.milestone}</p>
                        <div className="w-full bg-orange-100/50 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-300/70 to-orange-400/80 rounded-full transition-all duration-1000"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Snapshot */}
          <div className={`mb-16 transform transition-all duration-1000 delay-300 ${showJourney ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border-2 border-gray-800">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-gray-400 text-sm font-mono">github.com/ayuxy027/MasterG</span>
              </div>
              <div className="p-4">
                <img
                  src="/pitch/github.png"
                  alt="GitHub Repository Snapshot"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Research Section */}
          <div className={`space-y-8 mb-16 transform transition-all duration-1000 delay-500 ${showJourney ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}>
            <div className="bg-gradient-to-r from-orange-50/60 to-amber-50/60 rounded-xl p-8 border-l-4 border-orange-400/60 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Extensive Research
              </h3>
              <p className="text-gray-700 text-lg mb-2">
                We read over <strong className="text-orange-600/80">200+ references</strong> including Stack Overflow, Medium articles, and web surfing using our agents
              </p>
              <p className="text-gray-700 text-lg mb-2">
                Spending <strong className="text-orange-600/80">16 hours</strong> in total R&D!
              </p>
              <p className="text-xl font-bold text-orange-600/80 mt-4">
                But all this costed us <span className="text-orange-500/80">zero</span> xD
              </p>
            </div>
          </div>

          {/* Engineering Opportunity */}
          <div className={`space-y-8 mb-16 transform transition-all duration-1000 delay-700 ${showJourney ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}>
            <div className="bg-gradient-to-r from-orange-50/60 to-amber-50/60 rounded-xl p-8 border-l-4 border-orange-400/60 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                The True Engineering Opportunity
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                But we saw a true engineering opportunity and brought ourselves to test our limits beyond what we could do.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mt-4">
                <strong className="text-orange-600/80">It would have been easy to inject a Gemini/Groq endpoint, but it would have been a wrapper than an innovation.</strong>
              </p>
            </div>
          </div>

          {/* Did We Just Orchestrate Models Section */}
          <div className={`space-y-8 mb-16 transform transition-all duration-1000 delay-800 ${showJourney ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
            <div className="bg-white rounded-2xl p-10 shadow-2xl border-2 border-orange-200/50">
              <h3 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 text-center">
                So, Did We Just Simply Bring Some Models Together and Orchestrated Them?
              </h3>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/pitch/meme.webp"
                  alt="Definitely Not"
                  className="max-w-md w-full h-auto rounded-xl shadow-xl"
                />
              </div>
            </div>
          </div>

          {/* Push Harder Section */}
          <div className={`space-y-8 mb-16 transform transition-all duration-1000 delay-900 ${showJourney ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
            <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-xl p-8 border-l-4 border-orange-400/60 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                We Pushed Harder
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                So we pushed harder and spent nights to stress test our approach.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                We tested <strong className="text-orange-600/80">open weight models</strong> which had <strong className="text-orange-600/80">RL or CoT approach</strong> to get rid of API dependency.
              </p>
              <p className="text-2xl font-bold text-orange-600/80 text-center mt-6">
                And it worked like magic!!
              </p>
              <p className="text-xl font-bold text-orange-600/80 text-center mt-4">
                Wait for the benchmarks :D
              </p>
            </div>
          </div>

          {/* Testing Models Section */}
          <div className={`space-y-8 mb-16 transform transition-all duration-1000 delay-1100 ${showJourney ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
            <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 rounded-xl p-8 border-l-4 border-orange-400/60 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Testing Amazing Open Source Models
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Soon we found ourselves testing some amazing open source models across nights.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mt-4">
                Many of them <strong className="text-orange-600/80">crashed</strong> as we wanted to <strong className="text-orange-600/80">exceed the requirements</strong>.
              </p>
            </div>
          </div>

          {/* Final Choice */}
          <div
            className={`transform transition-all duration-1000 delay-1300 ${showJourney ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
          >
            <div className="bg-gradient-to-r from-orange-400/80 to-orange-500/80 rounded-2xl p-10 shadow-2xl text-center text-white border-4 border-orange-300/60">
              <p className="text-xl sm:text-2xl mb-6 leading-relaxed">
                After many <strong>hopes and failures</strong>, we went ahead with
              </p>
              <h3 className="text-3xl sm:text-4xl font-bold mb-4">DeepSeek R1 1GB Variant</h3>
              <p className="text-2xl mb-4">and</p>
              <h3 className="text-3xl sm:text-4xl font-bold mb-6">NLLB by Meta (600MB)</h3>
              <p className="text-4xl font-bold mt-8">And this was a killer combination! 🔥</p>
            </div>
          </div>

          {/* Manual Breakthroughs */}
          <div
            className={`mt-10 transform transition-all duration-1000 delay-1500 ${showJourney ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
          >
            <div className="bg-white/90 rounded-2xl p-8 shadow-xl border border-orange-200/60">
              <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Manual Breakthroughs</h3>
              <p className="text-gray-600 text-lg text-center mb-8">
                Beyond stacking models, we engineered critical optimizations ourselves.
              </p>

              {/* Translation Pipeline with Chart */}
              <div className="mb-8 bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-xl p-6 border border-orange-200/60">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">⚡</div>
                  <h4 className="text-2xl font-bold text-gray-900">Translation Pipeline</h4>
                  <span className="ml-auto px-4 py-1 bg-orange-500/20 text-orange-700 font-bold rounded-full text-sm">
                    10× Speedup
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span><strong>INT8 Quantization</strong> - Reduced model size & memory</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span><strong>Batch Processing</strong> - Process 6-12 sentences together</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span><strong>Parallel Processing</strong> - Multi-core CPU utilization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span><strong>Multi-threading</strong> - 4 workers for optimal throughput</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { phase: 'Baseline', time: 300 },
                        { phase: 'Phase 2', time: 240 },
                        { phase: 'Phase 3', time: 120 },
                        { phase: 'Phase 4', time: 90 },
                        { phase: 'Optimized', time: 30 }
                      ]}>
                        <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? `${value}s` : ''} />
                        <Bar dataKey="time" radius={[8, 8, 0, 0]}>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 4 ? '#f97316' : '#fb923c'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-center text-xs text-gray-600 mt-2">300s → 30s (10× improvement)</p>
                  </div>
                </div>
              </div>

              {/* Language Model */}
              <div className="mb-8 bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-xl p-6 border border-orange-200/60">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">🧠</div>
                  <h4 className="text-2xl font-bold text-gray-900">Language Model</h4>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/80 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">1.5B</div>
                    <div className="text-sm text-gray-600">Parameters</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">~2.2GB</div>
                    <div className="text-sm text-gray-600">RAM Usage</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">~78%</div>
                    <div className="text-sm text-gray-600">Reasoning Score</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-1">•</span>
                    <span><strong>DeepSeek-R1 1.5B</strong> - Auditable reasoning with Chain-of-Thought</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-1">•</span>
                    <span>Low RAM footprint for offline CPU inference</span>
                  </li>
                </ul>
              </div>

              {/* Data Layer & System Design Side by Side */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-xl p-6 border border-orange-200/60">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">💾</div>
                    <h4 className="text-2xl font-bold text-gray-900">Data Layer</h4>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span><strong>Chroma DB</strong> - Local vector embeddings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span><strong>MongoDB</strong> - Local state management (mongosh)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-xl p-6 border border-orange-200/60">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">🏗️</div>
                    <h4 className="text-2xl font-bold text-gray-900">System Design</h4>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span><strong>Offline-first</strong> architecture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span>Low latency with resilient fallbacks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span>See README for full architecture details</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className={`mt-16 mb-8 transform transition-all duration-1000 delay-1700 ${showJourney ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/"
                className="bg-gradient-to-r from-orange-400/80 to-orange-500/80 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl hover:from-orange-500/90 hover:to-orange-600/90 transition-all duration-300 transform hover:scale-105"
              >
                Home
              </Link>
              <Link
                to="/benchmarks"
                className="bg-white text-orange-600 border-2 border-orange-400/80 font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl hover:bg-orange-50 hover:border-orange-500/90 transition-all duration-300 transform hover:scale-105"
              >
                Benchmarks
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PitchPage;


