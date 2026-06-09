import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function UploadQuestions() {
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");

  const [file, setFile] = useState(null);

  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function fetchTopics() {
    const { data } = await supabase
      .from("topics")
      .select("*")
      .order("name");

    setTopics(data || []);

    if (data?.length) {
      setSelectedTopic(data[0].id);
    }
  }

  async function fetchSubtopics(topicId) {
    const { data } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("name");

    setSubtopics(data || []);

    if (data?.length) {
      setSelectedSubtopic(data[0].id);
    } else {
      setSelectedSubtopic("");
    }
  }

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    if (selectedTopic) {
      fetchSubtopics(selectedTopic);
    }
  }, [selectedTopic]);

  function validateQuestion(q) {
    if (!q.question) return false;

    if (!Array.isArray(q.options)) return false;

    if (q.options.length !== 4) return false;

    if (
      typeof q.correct_answer !== "number" ||
      q.correct_answer < 0 ||
      q.correct_answer > 3
    ) {
      return false;
    }

    return true;
  }

  async function handleUpload() {
    if (!selectedTopic) {
      alert("Select topic");
      return;
    }

    if (!selectedSubtopic) {
      alert("Select subtopic");
      return;
    }

    if (!file) {
      alert("Choose JSON file");
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array");
      }

      let inserted = 0;
      let skipped = 0;
      let failed = 0;

      for (const q of json) {
        if (!validateQuestion(q)) {
          failed++;
          continue;
        }

        const { error } = await supabase
          .from("questions")
          .insert({
            topic_id: selectedTopic,
            subtopic_id: selectedSubtopic,
            question: q.question.trim(),
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
          });

        if (error) {
          // duplicate constraint hit
          if (
            error.message.toLowerCase().includes("duplicate") ||
            error.code === "23505"
          ) {
            skipped++;
          } else {
            failed++;
          }
        } else {
          inserted++;
        }
      }

      setResult({
        inserted,
        skipped,
        failed,
      });
    } catch (err) {
      alert(err.message);
    }

    setUploading(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Upload Questions
      </h1>

      <div className="space-y-4">

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

        <select
          value={selectedSubtopic}
          onChange={(e) =>
            setSelectedSubtopic(e.target.value)
          }
          className="border p-2 rounded w-full"
        >
          {subtopics.map((subtopic) => (
            <option
              key={subtopic.id}
              value={subtopic.id}
            >
              {subtopic.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept=".json"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
          className="border p-2 rounded w-full"
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {result && (
          <div className="border rounded p-4">
            <p>Inserted: {result.inserted}</p>
            <p>Skipped: {result.skipped}</p>
            <p>Failed: {result.failed}</p>
          </div>
        )}
      </div>
    </div>
  );
}