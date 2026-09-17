import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "./services/api";
const Context = createContext();
export function Provider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(null);
  const refresh = useCallback(async () => {
    const data = await api("auth/session/");
    setUser(data.user);
    return data.user;
  }, []);
  useEffect(() => {
    refresh()
      .catch(() =>
        setToast({
          text: "Unable to connect to Haven. Please refresh to try again.",
          error: true,
        }),
      )
      .finally(() => setReady(true));
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  const notify = useCallback(
    (text, error = false) => setToast({ text, error }),
    [],
  );
  return (
    <Context.Provider value={{ user, setUser, ready, refresh, notify }}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.text}
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
export function useData(path, dependencies = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((x) => x + 1);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError("");
    api(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, version, ...dependencies]);
  return { data, error, loading, reload, setData };
}
