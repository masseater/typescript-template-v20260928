import { describe, expect, test } from "vite-plus/test";

import { defaultWorkflowChecksConfig } from "../config.ts";
import { parseWorkflowDocument } from "../workflow-document.ts";
import { undeclaredPermissions } from "./declared-permissions.ts";

const DEMAND = `A job must not run on whatever the platform hands it by default, because declaring nothing records that the permissions were never examined rather than that they were found sufficient. Declare permissions on this workflow or on the job`;

describe("undeclaredPermissions", () => {
  describe("a job that states nothing about what it may reach", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source: "jobs:\n  build:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is reported by name", ({ problems }) => {
      expect(problems).toStrictEqual([
        {
          file: ".github/workflows/ci.yml",
          line: 2,
          message: `${DEMAND} build, naming only what the run reads or writes.`,
        },
      ]);
    });
  });

  describe("a declaration made once for the whole workflow", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source: "permissions:\n  contents: read\njobs:\n  build:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is accepted", ({ problems }) => {
      expect(problems).toStrictEqual([]);
    });
  });

  describe("a declaration made by the job itself", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source: "jobs:\n  build:\n    permissions:\n      contents: read\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is accepted", ({ problems }) => {
      expect(problems).toStrictEqual([]);
    });
  });

  describe("a job that left it unstated beside a job that declared it", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source:
            "jobs:\n  build:\n    permissions:\n      contents: read\n    steps: []\n  test:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is the only one reported", ({ problems }) => {
      expect(problems).toStrictEqual([
        {
          file: ".github/workflows/ci.yml",
          line: 6,
          message: `${DEMAND} test, naming only what the run reads or writes.`,
        },
      ]);
    });
  });

  describe("a job whose key is not a plain value", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source: "jobs:\n  ? [build]\n  : {}\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is still reported, with nothing standing in for the name", ({ problems }) => {
      expect(problems).toStrictEqual([
        {
          file: ".github/workflows/ci.yml",
          line: 2,
          message: `${DEMAND} , naming only what the run reads or writes.`,
        },
      ]);
    });
  });

  describe("a scope beyond reading the contents granted to every job of a workflow with several", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source:
            "permissions:\n  contents: read\n  pull-requests: read\njobs:\n  build:\n    steps: []\n  test:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is reported at the scope", ({ problems }) => {
      expect(problems).toStrictEqual([
        {
          file: ".github/workflows/ci.yml",
          line: 3,
          message:
            "A workflow with more than one job must not grant pull-requests to all of them, because every job then holds a token that only some of them use. Keep only contents: read on the workflow and declare pull-requests on the jobs that use it.",
        },
      ]);
    });
  });

  describe("a blanket grant to every job of a workflow with several", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source: "permissions: read-all\njobs:\n  build:\n    steps: []\n  test:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is reported by its value", ({ problems }) => {
      expect(problems).toStrictEqual([
        {
          file: ".github/workflows/ci.yml",
          line: 1,
          message:
            "A workflow with more than one job must not grant read-all to all of them, because every job then holds a token that only some of them use. Keep only contents: read on the workflow and declare read-all on the jobs that use it.",
        },
      ]);
    });
  });

  describe("a workflow that shares only reading the contents and lets a job widen it", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source:
            "permissions:\n  contents: read\njobs:\n  build:\n    permissions:\n      contents: read\n      pull-requests: read\n    steps: []\n  test:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is accepted", ({ problems }) => {
      expect(problems).toStrictEqual([]);
    });
  });

  describe("a wider grant on a workflow with a single job", () => {
    const it = test.extend("problems", () =>
      undeclaredPermissions({
        document: parseWorkflowDocument({
          relativePath: ".github/workflows/ci.yml",
          source:
            "permissions:\n  contents: read\n  issues: read\njobs:\n  build:\n    steps: []\n",
        }),
        config: defaultWorkflowChecksConfig,
      }));

    it("is accepted, because no other job receives it", ({ problems }) => {
      expect(problems).toStrictEqual([]);
    });
  });
});
