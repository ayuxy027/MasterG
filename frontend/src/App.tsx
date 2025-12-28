import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import AIChatPage from "./components/AIChat/AIChatPage";
import LMRPage from "./components/LMR/LMRPage";
import PostersPage from "./components/Posters/PostersPage";
import BoardPage from "./components/Board/BoardPage";
import StitchPage from "./components/Stitch/StitchPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import BenchmarksPage from "./pages/BenchmarksPage";
import PitchPage from "./pages/PitchPage";

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    track('pageview', { url: location.pathname + location.search });
  }, [location]);

  return null;
};

const App = () => {
  return (
    <>
      <RouteChangeTracker />
      <Routes>
      <Route path="/" element={
        <Layout>
          <Landing />
        </Layout>
      } />
      <Route path="/chat" element={
        <Layout>
          <AIChatPage />
        </Layout>
      } />
      <Route path="/lmr" element={
        <Layout>
          <LMRPage />
        </Layout>
      } />
      <Route path="/posters" element={
        <Layout>
          <PostersPage />
        </Layout>
      } />
      <Route path="/board" element={
        <Layout>
          <BoardPage />
        </Layout>
      } />
      <Route path="/stitch" element={
        <Layout>
          <StitchPage />
        </Layout>
      } />
      <Route path="/playground" element={
        <Layout>
          <PlaygroundPage />
        </Layout>
      } />
      <Route path="/benchmarks" element={
        <Layout>
          <BenchmarksPage />
        </Layout>
      } />
      <Route path="/pitch" element={<PitchPage />} />
      </Routes>
    </>
  );
};

export default App;