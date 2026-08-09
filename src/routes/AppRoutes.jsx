import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";

import Dashboard from "../admin/Dashboard";
import Topics from "../admin/Topics";
import Subtopics from "../admin/Subtopics";
import UploadQuestions from "../admin/UploadQuestions";
import TopicDetails from "../pages/TopicDetails";
import TopicSets from "../pages/TopicSets";
import MixedPracticeSets from "../pages/MixedPracticeSets";
import QuizSetup from "../pages/QuizSetup";
import Quiz from "../pages/Quiz";
import Results from "../pages/Results";
import Login from "../pages/Login";
import History from "../pages/History";
import WrongQuestions from "../pages/WrongQuestions";
import Questions from "../admin/Questions";
import AdminGuard from "../components/AdminGuard";
import AttemptReview from "../pages/AttemptReview";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
      <Route path="/admin/topics" element={<AdminGuard><Topics /></AdminGuard>} />
      <Route path="/admin/subtopics" element={<AdminGuard><Subtopics /></AdminGuard>} />
      < Route path="/admin/upload" element={<AdminGuard>< UploadQuestions /></AdminGuard>} />
      < Route
        path="/topic/:topicId"
        element={< TopicDetails />}
      />
      < Route
        path="/topic/:topicId/sets"
        element={< TopicSets />}
      />
      < Route
        path="/mixed-practice-sets"
        element={< MixedPracticeSets />}
      />
      < Route
        path="/quiz-setup"
        element={< QuizSetup />}
      />
      < Route
        path="/quiz"
        element={< Quiz />}
      />
      < Route
        path="/results"
        element={< Results />}
      />
      < Route
        path="/login"
        element={< Login />}
      />
      < Route
        path="/history"
        element={< History />}
      />
      < Route
        path="/wrong-questions"
        element={< WrongQuestions />}
      />
      < Route
        path="/admin/questions"
        element={
          < AdminGuard >
            <Questions />
          </AdminGuard >
        }
      />
      <Route
        path="/attempt/:attemptId"
        element={<AttemptReview />}
      />
    </Routes >
  );
}