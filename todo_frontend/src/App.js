import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "kavia.todo.tasks.v1";

/**
 * @typedef {"all" | "active" | "completed"} FilterValue
 */

/**
 * @typedef Todo
 * @property {string} id
 * @property {string} title
 * @property {boolean} completed
 * @property {number} createdAt
 */

/**
 * Try to read tasks from localStorage. Returns [] on any error/corruption.
 * @returns {Todo[]}
 */
function loadTasksFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic validation/sanitization
    return parsed
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : crypto.randomUUID(),
        title: typeof t.title === "string" ? t.title : "",
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      }))
      .filter((t) => t.title.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * @param {Todo[]} tasks
 */
function saveTasksToStorage(tasks) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore write errors (e.g., storage full / private mode)
  }
}

/**
 * Create a stable ID. Uses crypto.randomUUID when available.
 * @returns {string}
 */
function makeId() {
  // eslint-disable-next-line no-undef
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// PUBLIC_INTERFACE
function App() {
  const [tasks, setTasks] = useState(() => loadTasksFromStorage());
  const [filter, setFilter] = useState(/** @type {FilterValue} */ ("all"));
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  // Persist to localStorage whenever tasks change
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  // Focus input on first render for fast entry
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const remainingCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case "active":
        return tasks.filter((t) => !t.completed);
      case "completed":
        return tasks.filter((t) => t.completed);
      case "all":
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // PUBLIC_INTERFACE
  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    const next = [
      {
        id: makeId(),
        title,
        completed: false,
        createdAt: Date.now(),
      },
      ...tasks,
    ];

    setTasks(next);
    setNewTitle("");
    // Keep focus for rapid entry
    inputRef.current?.focus();
  };

  // PUBLIC_INTERFACE
  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // PUBLIC_INTERFACE
  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // PUBLIC_INTERFACE
  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    addTask();
  };

  const onKeyDownNew = (e) => {
    if (e.key === "Escape") {
      setNewTitle("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="App">
      <main className="page">
        <header className="header">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              ✓
            </div>
            <div className="brandText">
              <h1 className="title">To‑Do</h1>
              <p className="subtitle">
                A lightweight task list with local persistence.
              </p>
            </div>
          </div>

          <div className="stats" aria-label="Task statistics">
            <div className="stat">
              <span className="statValue">{remainingCount}</span>
              <span className="statLabel">remaining</span>
            </div>
            <div className="stat">
              <span className="statValue">{completedCount}</span>
              <span className="statLabel">completed</span>
            </div>
          </div>
        </header>

        <section className="card" aria-label="Add a new task">
          <form className="addRow" onSubmit={onSubmit}>
            <label className="srOnly" htmlFor="newTask">
              New task
            </label>
            <input
              id="newTask"
              ref={inputRef}
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={onKeyDownNew}
              placeholder="Add a task…"
              maxLength={200}
              aria-label="Task title"
            />
            <button className="btn btnPrimary" type="submit">
              Add
            </button>
          </form>

          <div className="toolbar" aria-label="Task filters and actions">
            <div className="filters" role="tablist" aria-label="Filter tasks">
              <button
                type="button"
                className={`chip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
              >
                All
              </button>
              <button
                type="button"
                className={`chip ${filter === "active" ? "active" : ""}`}
                onClick={() => setFilter("active")}
                aria-pressed={filter === "active"}
              >
                Active
              </button>
              <button
                type="button"
                className={`chip ${filter === "completed" ? "active" : ""}`}
                onClick={() => setFilter("completed")}
                aria-pressed={filter === "completed"}
              >
                Completed
              </button>
            </div>

            <button
              type="button"
              className="btn btnGhost"
              onClick={clearCompleted}
              disabled={completedCount === 0}
              aria-disabled={completedCount === 0}
              title="Remove all completed tasks"
            >
              Clear completed
            </button>
          </div>
        </section>

        <section className="card listCard" aria-label="Task list">
          {filteredTasks.length === 0 ? (
            <div className="empty">
              <p className="emptyTitle">No tasks here.</p>
              <p className="emptyHint">
                {tasks.length === 0
                  ? "Add your first task above."
                  : "Try a different filter."}
              </p>
            </div>
          ) : (
            <ul className="list" aria-label="Tasks">
              {filteredTasks.map((task) => (
                <li key={task.id} className="item">
                  <label className="checkRow">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      aria-label={`Mark "${task.title}" as ${
                        task.completed ? "not completed" : "completed"
                      }`}
                    />
                    <span className={`itemTitle ${task.completed ? "done" : ""}`}>
                      {task.title}
                    </span>
                  </label>

                  <div className="itemActions">
                    <button
                      type="button"
                      className="iconBtn"
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete "${task.title}"`}
                      title="Delete task"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer">
          <p className="footerText">
            Stored locally in your browser (localStorage).
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
