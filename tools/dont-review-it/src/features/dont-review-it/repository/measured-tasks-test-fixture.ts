import { taskInput, telemetryEnv, type Tasks } from "@repo/vite-config";
import { isEqual } from "es-toolkit";

const unmeasuredTasks = (tasks: Tasks): string[] =>
  Object.entries(tasks).flatMap(([name, task]) => {
    if (typeof task === "string" || Array.isArray(task)) return [name];
    if (task.cache === false || [task.command].flat().length === 0) return [];
    const passed = task.env ?? [];
    return telemetryEnv.every((variable) => passed.includes(variable)) ? [] : [name];
  });

const specifiedNamespaceWildcards: readonly string[] = ["OTEL_*"];

const wildcardEnvTasks = (tasks: Tasks): string[] =>
  Object.entries(tasks).flatMap(([name, task]) => {
    if (typeof task === "string" || Array.isArray(task) || task.cache === false) return [];
    return [...(task.env ?? []), ...(task.untrackedEnv ?? [])]
      .filter((variable) => /[*?[]/u.test(variable))
      .filter((variable) => !specifiedNamespaceWildcards.includes(variable))
      .map((variable) => `${name} ${variable}`);
  });

const tracksAutomatically = (entry: unknown): boolean =>
  typeof entry === "object" && entry !== null && "auto" in entry && entry.auto === true;

const partialTaskInputTasks = (tasks: Tasks): string[] =>
  Object.entries(tasks).flatMap(([name, task]) => {
    if (typeof task === "string" || Array.isArray(task)) return [];
    const input: readonly unknown[] = task.input ?? [];
    if (!input.some(tracksAutomatically)) return [];
    return taskInput.every((shared) => input.some((entry) => isEqual(entry, shared)))
      ? []
      : [name];
  });

export { partialTaskInputTasks, unmeasuredTasks, wildcardEnvTasks };
