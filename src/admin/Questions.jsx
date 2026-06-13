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

  const [editingQuestion, setEditingQuestion] =
    useState(null);

  const [editForm, setEditForm] =
    useState({
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      explanation: "",
    });

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

  function openEdit(question) {
    setEditingQuestion(question);

    setEditForm({
      question: question.question,
      options: [...question.options],
      correct_answer:
        question.correct_answer,
      explanation:
        question.explanation || "",
    });
  }

  async function saveQuestion() {
    if (!editingQuestion) return;

    const { error } = await supabase
      .from("questions")
      .update({
        question:
          editForm.question,
        options:
          editForm.options,
        correct_answer:
          editForm.correct_answer,
        explanation:
          editForm.explanation,
      })
      .eq(
        "id",
        editingQuestion.id
      );

    if (error) {
      alert(error.message);
      return;
    }

    setEditingQuestion(null);

    loadQuestions();
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

            if (e.target.value) {
              loadSubtopics(
                e.target.value
              );
            } else {
              setSubtopics([]);
            }
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

            <div className="flex gap-4">

              <button
                onClick={() =>
                  openEdit(q)
                }
                className="text-blue-600"
              >
                Edit
              </button>

              <button
                onClick={() =>
                  deleteQuestion(q.id)
                }
                className="text-red-600"
              >
                Delete
              </button>

            </div>

          </div>
        ))}

      </div>

      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">

          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">

            <h2 className="text-xl font-bold mb-4">
              Edit Question
            </h2>

            <textarea
              value={editForm.question}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  question:
                    e.target.value,
                })
              }
              className="border p-2 rounded w-full mb-4"
              rows={3}
            />

            {editForm.options.map(
              (option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(e) => {
                    const updated = [
                      ...editForm.options,
                    ];

                    updated[index] =
                      e.target.value;

                    setEditForm({
                      ...editForm,
                      options: updated,
                    });
                  }}
                  className="border p-2 rounded w-full mb-2"
                />
              )
            )}

            <select
              value={
                editForm.correct_answer
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  correct_answer:
                    Number(
                      e.target.value
                    ),
                })
              }
              className="border p-2 rounded w-full mb-4"
            >
              <option value={0}>
                Option A
              </option>

              <option value={1}>
                Option B
              </option>

              <option value={2}>
                Option C
              </option>

              <option value={3}>
                Option D
              </option>

            </select>

            <textarea
              value={
                editForm.explanation
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  explanation:
                    e.target.value,
                })
              }
              className="border p-2 rounded w-full mb-4"
              rows={3}
              placeholder="Explanation"
            />

            <div className="flex gap-4">

              <button
                onClick={saveQuestion}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Save
              </button>

              <button
                onClick={() =>
                  setEditingQuestion(
                    null
                  )
                }
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}