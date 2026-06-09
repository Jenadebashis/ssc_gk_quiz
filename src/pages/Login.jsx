import { useState } from "react";
import { supabase } from "../api/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  async function signUp() {
    const { error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created");
  }

  async function signIn() {
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/");
  }

  return (
    <div className="max-w-md mx-auto p-10">

      <h1 className="text-3xl font-bold mb-6">
        Login
      </h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        className="border p-2 w-full mb-3 rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        className="border p-2 w-full mb-3 rounded"
      />

      <div className="flex gap-3">

        <button
          onClick={signIn}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Login
        </button>

        <button
          onClick={signUp}
          className="border px-4 py-2 rounded"
        >
          Signup
        </button>

      </div>

    </div>
  );
}