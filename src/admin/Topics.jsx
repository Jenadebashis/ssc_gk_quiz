import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [topicName, setTopicName] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchTopics() {
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setTopics(data);
  }

  async function addTopic(e) {
    e.preventDefault();

    if (!topicName.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from("topics")
      .insert({
        name: topicName.trim(),
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTopicName("");
    fetchTopics();
  }

  async function deleteTopic(id) {
    const confirmed = window.confirm(
      "Delete this topic?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchTopics();
  }

  useEffect(() => {
    fetchTopics();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Topics
      </h1>

      <form
        onSubmit={addTopic}
        className="flex gap-3 mb-8"
      >
        <input
          value={topicName}
          onChange={(e) =>
            setTopicName(e.target.value)
          }
          placeholder="Enter topic name"
          className="border p-2 flex-1 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </form>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <span>{topic.name}</span>

            <button
              onClick={() =>
                deleteTopic(topic.id)
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