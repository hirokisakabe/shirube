import { useEffect, useRef, useState } from "react";
import { type Goal, createGoal, deleteGoal, fetchGoals, updateGoal } from "../api/goals";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const showAchievedRef = useRef(showAchieved);
  showAchievedRef.current = showAchieved;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGoals(showAchieved)
      .then((data) => { if (!cancelled) setGoals(data); })
      .catch((e: unknown) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showAchieved]);

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
    const becomingDone = !goal.doneAt;
    const doneAt = becomingDone ? new Date().toISOString() : null;
    const currentShowAchieved = showAchievedRef.current;
    if (becomingDone && !currentShowAchieved) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } else {
      setGoals((prev) => prev.map((g) => g.id === id ? { ...g, doneAt } : g));
    }
    updateGoal(id, { doneAt }).then((updated) => {
      if (!becomingDone || currentShowAchieved) {
        setGoals((prev) => prev.map((g) => g.id === id ? updated : g));
      }
    }).catch(() => {
      if (becomingDone && !currentShowAchieved) {
        setGoals((prev) => [goal, ...prev]);
      } else {
        setGoals((prev) => prev.map((g) => g.id === id ? goal : g));
      }
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
