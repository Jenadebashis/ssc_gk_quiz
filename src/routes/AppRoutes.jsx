import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";

import Dashboard from "../admin/Dashboard";
import Topics from "../admin/Topics";
import Subtopics from "../admin/Subtopics";
import UploadQuestions from "../admin/UploadQuestions";
import TopicDetails from "../pages/TopicDetails";
import QuizSetup from "../pages/QuizSetup";
import Quiz from "../pages/Quiz";
import Results from "../pages/Results";
import Login from "../pages/Login";
import History from "../pages/History";
import WrongQuestions from "../pages/WrongQuestions";
import Questions from "../admin/Questions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/topics" element={<Topics />} />
      <Route path="/admin/subtopics" element={<Subtopics />} />
      <Route path="/admin/upload" element={<UploadQuestions />} />
      <Route
        path="/topic/:topicId"
        element={<TopicDetails />}
      />
      <Route
        path="/quiz-setup"
        element={<QuizSetup />}
      />
      <Route
        path="/quiz"
        element={<Quiz />}
      />
      <Route
        path="/results"
        element={<Results />}
      />
      <Route
        path="/login"
        element={<Login />}
      />
      <Route
        path="/history"
        element={<History />}
      />
      <Route
        path="/wrong-questions"
        element={<WrongQuestions />}
      />
      <Route
        path="/admin/questions"
        element={<Questions />}
      />
    </Routes>
  );
}