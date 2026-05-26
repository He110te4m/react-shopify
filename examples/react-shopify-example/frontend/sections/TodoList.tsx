import { useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";

export const shopifyMeta = {
  name: "Todo List (React)",
  settings: [
    { type: "text", id: "title", label: "Title", default: "Todo List" },
    {
      type: "text",
      id: "placeholder",
      label: "Placeholder",
      default: "What needs to be done?",
    },
  ],
  presets: [
    { name: "Todo List (Default)", category: "Demo" },
    {
      name: "Todo List (Shopping)",
      category: "Demo",
      settings: {
        title: "Shopping List",
        placeholder: "Add item...",
      },
    },
  ],
} satisfies ShopifyMeta;

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

interface TodoListProps {
  title?: string;
  placeholder?: string;
}

let nextId = 1;

export default function TodoList({
  title = "Todo List",
  placeholder = "What needs to be done?",
}: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: nextId++, text, done: false }]);
    setInput("");
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const removeTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addTodo();
  };

  return (
    <div className="todo-section">
      <h2 className="todo-title">{title}</h2>
      <div className="todo-input-row">
        <input
          type="text"
          className="todo-input"
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="todo-btn-add" onClick={addTodo}>
          Add
        </button>
      </div>
      {todos.length > 0 ? (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item${todo.done ? " todo-item--done" : ""}`}
            >
              <label className="todo-label">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span>{todo.text}</span>
              </label>
              <button
                type="button"
                className="todo-btn-del"
                onClick={() => removeTodo(todo.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="todo-empty">No items yet.</p>
      )}
    </div>
  );
}
