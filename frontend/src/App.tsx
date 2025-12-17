import { Routes, Route } from 'react-router-dom';
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import AIChatPage from "./components/AIChat/AIChatPage";
import LMRPage from "./components/LMR/LMRPage";
import PostersPage from "./components/Posters/PostersPage";
import BoardPage from "./components/Board/BoardPage";
import StitchPage from "./components/Stitch/StitchPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import BenchmarksPage from "./pages/BenchmarksPage";

const App = () => {
  return (
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
    </Routes>
  );
};

export default App;