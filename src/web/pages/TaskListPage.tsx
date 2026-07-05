import { AppErrorState } from "../components/AppErrorState";
import { useTasks } from "../hooks/useTasks";

export function TaskListPage() {
  const { tasks, error, loading } = useTasks();

  if (loading) return <p>読み込み中...</p>;
  if (error) return <AppErrorState error={error} />;

  return (
    <main>
      <h1>タスク一覧</h1>
      {tasks.length === 0 ? (
        <p>タスクがありません</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
