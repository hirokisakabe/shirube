import { describe, expect, it } from "vitest";
import {
	createGoal,
	deleteGoal,
	fetchGoals,
	updateGoal,
} from "./goals";
import {
	fetchReview,
	fetchReviews,
	upsertReview,
} from "./reviews";
import {
	createTask,
	deleteTask,
	fetchTasks,
	updateTask,
} from "./tasks";

describe("Hono RPC API client", () => {
	it("tasks wrapperがRPC client経由で主要操作を実行できる", async () => {
		const created = await createTask("RPC task", "2026-06-09");
		expect(created.title).toBe("RPC task");

		await createTask("Other day", "2026-06-10");
		expect(await fetchTasks("2026-06-09")).toHaveLength(1);

		const updated = await updateTask(created.id, { doneAt: "2026-06-09T00:00:00.000Z" });
		expect(updated.doneAt).toBe("2026-06-09T00:00:00.000Z");

		const deleted = await deleteTask(created.id);
		expect(deleted.deletedAt).not.toBeNull();
	});

	it("goals wrapperがRPC client経由で主要操作を実行できる", async () => {
		const created = await createGoal("RPC goal");
		expect(created.title).toBe("RPC goal");
		expect(await fetchGoals()).toHaveLength(1);

		const updated = await updateGoal(created.id, { doneAt: "2026-06-09T00:00:00.000Z" });
		expect(updated.doneAt).toBe("2026-06-09T00:00:00.000Z");
		expect(await fetchGoals()).toHaveLength(0);
		expect(await fetchGoals(true)).toHaveLength(1);

		const deleted = await deleteGoal(created.id);
		expect(deleted.deletedAt).not.toBeNull();
	});

	it("reviews wrapperがRPC client経由で主要操作を実行できる", async () => {
		expect(await fetchReview("2026-W23")).toBeNull();

		const saved = await upsertReview("2026-W23", "RPC review");
		expect(saved.content).toBe("RPC review");

		const fetched = await fetchReview("2026-W23");
		expect(fetched?.content).toBe("RPC review");
		expect(await fetchReviews()).toHaveLength(1);
	});
});
