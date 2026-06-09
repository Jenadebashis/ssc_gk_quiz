import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function Subtopics() {
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [selectedTopic, setSelectedTopic] = useState("");
  const [subtopicName, setSubtopicName] = useState("");

  async function fetchTopics() {
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setTopics(data);

    if (data.length > 0 && !selectedTopic) {
      setSelectedTopic(data[0].id);
    }
  }

  async function fetchSubtopics() {
    const { data, error } = await supabase
      .from("subtopics")
      .select(`
        *,
        topics (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setSubtopics(data);
  }

  async function addSubtopic(e) {
    e.preventDefault();

    if (!selectedTopic) {
      alert("Select a topic");
      return;
    }

    if (!subtopicName.trim()) return;

    const { error } = await supabase
      .from("subtopics")
      .insert({
        topic_id: selectedTopic,
        name: subtopicName.trim(),
      });

    if (error) {
      alert(error.message);
      return;
    }

    setSubtopicName("");
    fetchSubtopics();
  }

  async function deleteSubtopic(id) {
    const confirmed = window.confirm(
      "Delete this subtopic?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("subtopics")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchSubtopics();
  }

  useEffect(() => {
    fetchTopics();
    fetchSubtopics();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Subtopics
      </h1>

      <form
        onSubmit={addSubtopic}
        className="space-y-4 mb-8"
      >
        <select
          value={selectedTopic}
          onChange={(e) =>
            setSelectedTopic(e.target.value)
          }
          className="border p-2 rounded w-full"
        >
          {topics.map((topic) => (
            <option
              key={topic.id}
              value={topic.id}
            >
              {topic.name}
            </option>
          ))}
        </select>

        <input
          value={subtopicName}
          onChange={(e) =>
            setSubtopicName(e.target.value)
          }
          placeholder="Subtopic Name"
          className="border p-2 rounded w-full"
        />

        <button
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Subtopic
        </button>
      </form>

      <div className="space-y-3">
        {subtopics.map((subtopic) => (
          <div
            key={subtopic.id}
            className="border rounded p-4 flex justify-between"
          >
            <div>
              <div className="font-semibold">
                {subtopic.name}
              </div>

              <div className="text-sm text-gray-500">
                {subtopic.topics?.name}
              </div>
            </div>

            <button
              onClick={() =>
                deleteSubtopic(subtopic.id)
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