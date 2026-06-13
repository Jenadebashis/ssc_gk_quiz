import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [selectedTopic, setSelectedTopic] =
    useState("");

  const [selectedSubtopic, setSelectedSubtopic] =
    useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTopics();
    loadQuestions();
  }, []);

  async function loadTopics() {
    const { data } = await supabase
      .from("topics")
      .select("*")
      .order("name");

    setTopics(data || []);
  }

  async function loadSubtopics(topicId) {
    const { data } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("name");

    setSubtopics(data || []);
  }

  async function loadQuestions() {
    let query = supabase
      .from("questions")
      .select(`
        *,
        topics(name),
        subtopics(name)
      `)
      .order("created_at", {
        ascending: false,
      });

    if (selectedTopic) {
      query = query.eq(
        "topic_id",
        selectedTopic
      );
    }

    if (selectedSubtopic) {
      query = query.eq(
        "subtopic_id",
        selectedSubtopic
      );
    }

    const { data } = await query;

    setQuestions(data || []);
  }

  async function deleteQuestion(id) {
    const confirmed =
      window.confirm(
        "Delete question?"
      );

    if (!confirmed) return;

    await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    loadQuestions();
  }

  useEffect(() => {
    loadQuestions();
  }, [selectedTopic, selectedSubtopic]);

  const filteredQuestions =
    questions.filter((q) =>
      q.question
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  return (
    <div className="max-w-7xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Questions
      </h1>

      <div className="grid md:grid-cols-4 gap-4 mb-6">

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="border p-2 rounded"
        />

        <select
          value={selectedTopic}
          onChange={(e) => {
            setSelectedTopic(
              e.target.value
            );

            setSelectedSubtopic("");
            loadSubtopics(
              e.target.value
            );
          }}
          className="border p-2 rounded"
        >
          <option value="">
            All Topics
          </option>

          {topics.map((topic) => (
            <option
              key={topic.id}
              value={topic.id}
            >
              {topic.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSubtopic}
          onChange={(e) =>
            setSelectedSubtopic(
              e.target.value
            )
          }
          className="border p-2 rounded"
        >
          <option value="">
            All Subtopics
          </option>

          {subtopics.map((sub) => (
            <option
              key={sub.id}
              value={sub.id}
            >
              {sub.name}
            </option>
          ))}
        </select>

      </div>

      <div className="space-y-4">

        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="border rounded-xl p-4 bg-white"
          >
            <div className="mb-2">

              <span className="font-semibold">
                {q.topics?.name}
              </span>

              {" > "}

              <span>
                {q.subtopics?.name}
              </span>

            </div>

            <p className="mb-3">
              {q.question}
            </p>

            <button
              onClick={() =>
                deleteQuestion(q.id)
              }
              className="text-red-600"
            >
              Delete
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}