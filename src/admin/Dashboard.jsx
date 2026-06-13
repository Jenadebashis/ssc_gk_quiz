import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Topics",
      icon: "📚",
      description:
        "Create and manage topics",
      path: "/admin/topics",
    },
    {
      title: "Subtopics",
      icon: "📂",
      description:
        "Manage topic subcategories",
      path: "/admin/subtopics",
    },
    {
      title: "Questions",
      icon: "❓",
      description:
        "View, edit and delete questions",
      path: "/admin/questions",
    },
    {
      title: "Upload Questions",
      icon: "📤",
      description:
        "Bulk upload JSON questions",
      path: "/admin/upload",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="max-w-7xl mx-auto p-8">

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-10 text-white mb-10">

          <h1 className="text-5xl font-bold">
            Admin Dashboard
          </h1>

          <p className="mt-3 text-lg opacity-90">
            Manage topics, subtopics and
            question bank.
          </p>

        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {cards.map((card) => (
            <div
              key={card.title}
              onClick={() =>
                navigate(card.path)
              }
              className="
                bg-white
                border
                rounded-2xl
                p-6
                cursor-pointer
                hover:shadow-xl
                hover:border-indigo-500
                transition
              "
            >
              <div className="text-4xl mb-4">
                {card.icon}
              </div>

              <h2 className="text-xl font-bold mb-2">
                {card.title}
              </h2>

              <p className="text-gray-500 text-sm">
                {card.description}
              </p>
            </div>
          ))}

        </div>

      </div>

    </div>
  );
}