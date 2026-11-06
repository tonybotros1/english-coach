/** Which plan tasks are finished: lessons record themselves; weekly reviews and checkpoints are recorded here. */
import type { Db, ObjectId } from 'mongodb';

type TaskDoneDoc = { userId: ObjectId; planCreatedAt: Date; taskId: string; at: Date };

export async function markTaskDone(db: Db, userId: ObjectId, planCreatedAt: Date, taskId: string, now = new Date()) {
  await db
    .collection<TaskDoneDoc>('task_done')
    .updateOne({ userId, planCreatedAt, taskId }, { $setOnInsert: { userId, planCreatedAt, taskId, at: now } }, { upsert: true });
}

/** Task ids of the plan's finished lessons, weekly reviews and checkpoints. */
export async function doneTaskIds(db: Db, userId: ObjectId, planCreatedAt: Date): Promise<string[]> {
  const [lessons, others] = await Promise.all([
    db.collection('lessons').find({ userId, planCreatedAt, status: 'completed' }, { projection: { taskId: 1 } }).toArray(),
    db.collection<TaskDoneDoc>('task_done').find({ userId, planCreatedAt }, { projection: { taskId: 1 } }).toArray(),
  ]);
  return [...new Set([...lessons.map((l) => l.taskId as string), ...others.map((o) => o.taskId)])];
}
