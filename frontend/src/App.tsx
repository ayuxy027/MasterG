import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { track } from '@vercel/analytics';
import Layout from "./components/Layout";
import Landing from "./pages/Landing";

const AIChatPage = lazy(() => import("./components/AIChat/AIChatPage"));
const LMRPage = lazy(() => import("./components/LMR/LMRPage"));
const PostersPage = lazy(() => import("./components/Posters/PostersPage"));
const BoardPage = lazy(() => import("./components/Board/BoardPage"));
const StitchPage = lazy(() => import("./components/Stitch/StitchPage"));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage"));
const BenchmarksPage = lazy(() => import("./pages/BenchmarksPage"));
const PitchPage = lazy(() => import("./pages/PitchPage"));

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    track('pageview', { url: location.pathname + location.search });
  }, [location]);

  return null;
};

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="h-10 w-10 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <>
      <RouteChangeTracker />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Layout><Landing /></Layout>} />
          <Route path="/chat" element={<Layout><AIChatPage /></Layout>} />
          <Route path="/lmr" element={<Layout><LMRPage /></Layout>} />
          <Route path="/posters" element={<Layout><PostersPage /></Layout>} />
          <Route path="/board" element={<Layout><BoardPage /></Layout>} />
          <Route path="/stitch" element={<Layout><StitchPage /></Layout>} />
          <Route path="/playground" element={<Layout><PlaygroundPage /></Layout>} />
          <Route path="/benchmarks" element={<Layout><BenchmarksPage /></Layout>} />
          <Route path="/pitch" element={<PitchPage />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
