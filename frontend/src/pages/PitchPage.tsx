import { useEffect, useRef, useState } from 'react';

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
  const problemRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);
  const benchmarksRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

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

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
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
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-500 leading-tight">
            We are the Creators of MasterG
          </h2>
        </div>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section ref={problemRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-12 text-center">
            The Challenge
          </h2>
          <div className="prose prose-lg max-w-none">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg mb-8">
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
      <section ref={requirementsRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-orange-50">
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
                className={`bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500 transform transition-all duration-500 ${
                  visibleBenchmarks.includes(index)
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
                    <p className="text-orange-600 font-semibold">
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
      <section ref={resultsRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className={`transform transition-all duration-1000 ${
            showResults ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-orange-500 mb-8">
              And Guess What,
            </h2>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-16">
              We Beat Them All!!
            </h2>
          </div>
        </div>
      </section>

      {/* Solution Introduction */}
      <section ref={solutionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 shadow-xl">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Astonishing Performance
              </h3>
              <p className="text-gray-700 text-lg mb-4">
                Works on a <strong className="text-orange-600">1.3 GB RAM</strong> memory and <strong className="text-orange-600">4 GB</strong> of disc space
              </p>
              <p className="text-gray-700 text-lg">
                Works <strong className="text-orange-600">completely offline!</strong>
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-xl">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Built with Open Source
              </h3>
              <p className="text-gray-700 text-lg mb-4">
                Built using <strong className="text-blue-600">open source</strong> and <strong className="text-blue-600">minimal external tooling</strong>
              </p>
              <p className="text-gray-700 text-lg">
                We leveraged <strong className="text-blue-600">open weight models</strong> from proprietary providers like <strong className="text-blue-600">DeepSeek</strong> and <strong className="text-blue-600">Meta</strong>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 shadow-2xl text-center">
            <h3 className="text-3xl font-bold text-white mb-6">
              DeepSeek R1 1.5B and NLLB 600M
            </h3>
            <p className="text-xl text-orange-50">
              To be precise ;)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PitchPage;

