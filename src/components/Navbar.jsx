import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between">

        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600"
        >
          SSC GK
        </Link>

        <div className="flex flex-wrap gap-2">

          <Link
            to="/"
            className="px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            🏠 Home
          </Link>

          <Link
            to="/history"
            className="px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            📜 History
          </Link>

          <Link
            to="/wrong-questions"
            className="px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            ❌ Wrong Questions
          </Link>

          <Link
            to="/quiz-setup"
            state={{
              mode: "mixed",
              topicName: "Mixed Practice",
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            🎲 Mixed Practice
          </Link>

          <Link
            to="/admin"
            className="px-4 py-2 rounded-lg border hover:bg-slate-100"
          >
            ⚙️ Admin
          </Link>

        </div>

      </div>
    </nav>
  );
}