import { useCallback, useEffect, useRef, useState } from "react";
import { type Goal, createGoal, deleteGoal, fetchGoals, updateGoal } from "../api/goals";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);
  const goalsRef = useRef(goals);
  goalsRef.current = goals;

  const load = useCallback(async (includeAchieved: boolean) => {
    try {
      const data = await fetchGoals(includeAchieved);
      setGoals(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(showAchieved); }, [load, showAchieved]);

  const toggleShowAchieved = () => setShowAchieved((v) => !v);

  const add = (text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    createGoal(clean).then((goal) => {
      setGoals((prev) => [goal, ...prev]);
    }).catch(console.error);
  };

  const toggle = (id: number) => {
    const goal = goalsRef.current.find((g) => g.id === id);
    if (!goal) return;
    const doneAt = goal.doneAt ? null : new Date().toISOString();
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, doneAt } : g));
    updateGoal(id, { doneAt }).then((updated) => {
      setGoals((prev) => prev.map((g) => g.id === id ? updated : g));
    }).catch(() => {
      setGoals((prev) => prev.map((g) => g.id === id ? goal : g));
    });
  };

  const remove = (id: number) => {
    const goal = goalsRef.current.find((g) => g.id === id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    deleteGoal(id).catch(() => {
      if (goal) setGoals((prev) => [goal, ...prev]);
    });
  };

  return { goals, loading, error, showAchieved, toggleShowAchieved, add, toggle, remove };
}
