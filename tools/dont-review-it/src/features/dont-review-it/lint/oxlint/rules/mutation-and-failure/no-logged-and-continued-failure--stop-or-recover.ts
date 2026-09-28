import { createDontReviewItRule } from "../../../../create-rule.ts";
import { staticMemberOf, type StaticMember } from "../../lib/static-member.ts";

import type { ESTree } from "@oxlint/plugins";

const identifierNameOf = (expression: ESTree.Expression): string | null =>
  expression.type === "Identifier" ? expression.name : null;

const PROCESS_OBJECT_NAME = "process";

const PROCESS_STREAM_NAMES: ReadonlySet<string> = new Set(["stdout", "stderr"]);

/** @canonical-values dont-review-it.process-io-member */
const PROCESS_IO_MEMBERS = ["write", "exit"] as const;

export const PROCESS_IO_MEMBER = {
  write: PROCESS_IO_MEMBERS[0],
  exit: PROCESS_IO_MEMBERS[1],
} as const;

const STREAM_WRITE_NAME = PROCESS_IO_MEMBER.write;

const isStreamWrite = (member: StaticMember): boolean => {
  if (member.name !== STREAM_WRITE_NAME) return false;
  const stream = staticMemberOf(member.object);
  if (stream === null) return false;
  if (identifierNameOf(stream.object) !== PROCESS_OBJECT_NAME) return false;
  return PROCESS_STREAM_NAMES.has(stream.name);
};

const CONSOLE_OBJECT_NAME = "console";

const isOutputSinkCall = (node: ESTree.CallExpression): boolean => {
  const member = staticMemberOf(node.callee);
  if (member === null) return false;
  if (identifierNameOf(member.object) === CONSOLE_OBJECT_NAME) return true;
  return isStreamWrite(member);
};

const PROCESS_EXIT_NAME = PROCESS_IO_MEMBER.exit;

const isProcessExitStatement = (statement: ESTree.Statement): boolean => {
  if (statement.type !== "ExpressionStatement") return false;
  const called = statement.expression;
  if (called.type !== "CallExpression") return false;
  const member = staticMemberOf(called.callee);
  if (member === null || member.name !== PROCESS_EXIT_NAME) return false;
  return identifierNameOf(member.object) === PROCESS_OBJECT_NAME;
};

const STOPPING_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  "ReturnStatement",
  "ThrowStatement",
]);

const stopsUnconditionally = (clause: ESTree.CatchClause): boolean =>
  clause.body.body.some(
    (statement) =>
      STOPPING_STATEMENT_TYPES.has(statement.type) || isProcessExitStatement(statement),
  );

const OWN_BODY_NODE_TYPES: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "ClassDeclaration",
  "ClassExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "StaticBlock",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
]);

const enclosingCatchClause = (node: ESTree.Node): ESTree.CatchClause | null => {
  const { parent } = node;
  if (parent === null) return null;
  if (parent.type === "CatchClause") return parent;
  return OWN_BODY_NODE_TYPES.has(parent.type) ? null : enclosingCatchClause(parent);
};

const EFFECT_NAMESPACE = "Effect";

const LOGGING_TAP_NAME = "tapCause";

const DISCARDING_NAME = "ignore";

const isEffectMember = (expression: ESTree.Node, name: string): boolean => {
  if (expression.type !== "MemberExpression") return false;
  const member = staticMemberOf(expression);
  if (member === null || member.name !== name) return false;
  return identifierNameOf(member.object) === EFFECT_NAMESPACE;
};

const isLoggingTap = (argument: ESTree.Node): boolean =>
  argument.type === "CallExpression" && isEffectMember(argument.callee, LOGGING_TAP_NAME);

const isDiscard = (argument: ESTree.Node): boolean =>
  isEffectMember(argument, DISCARDING_NAME) ||
  (argument.type === "CallExpression" && isEffectMember(argument.callee, DISCARDING_NAME));

const discardsAfterLoggingTap = (node: ESTree.CallExpression): readonly ESTree.Node[] =>
  node.arguments.filter((argument, index) => {
    const previous = node.arguments[index - 1];
    return previous !== undefined && isLoggingTap(previous) && isDiscard(argument);
  });

export const noLoggedAndContinuedFailure = createDontReviewItRule({
  name: "no-logged-and-continued-failure--stop-or-recover",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow writing a caught failure to an output stream inside a catch clause that neither stops nor returns, or discarding an Effect failure with Effect.ignore right after logging it with Effect.tapCause, so a failure that was caught either ends the work or produces a value the caller can use",
      relatedGuidelines: [".claude/skills/reviews/references/failure-handling-and-fallbacks.md"],
    },
    messages: {
      loggedAndContinuedFailure:
        "A catch clause must not write the failure to an output stream and then let the surrounding code carry on. Choose one of the two endings the caller can act on. Stop: rethrow the failure, or throw one that names this layer's part in it. Recover: return the value the caller should use in place of the missing one, at the same statement level as this write.",
      loggedAndIgnoredEffectFailure:
        "Effect.ignore right after Effect.tapCause logs the failure and then hands the caller the same success as when nothing failed. Choose one of the two endings the caller can act on. Stop: drop Effect.ignore and let the failure reach the caller. Recover: replace it with Effect.orElseSucceed or Effect.catch returning a value that tells the caller the operation did not complete.",
    },
    schema: [],
  },
  create(inspection) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        for (const discard of discardsAfterLoggingTap(node)) {
          inspection.report({ node: discard, messageId: "loggedAndIgnoredEffectFailure" });
        }
        if (!isOutputSinkCall(node)) return;

        const clause = enclosingCatchClause(node);
        if (clause === null) return;
        if (stopsUnconditionally(clause)) return;

        inspection.report({ node, messageId: "loggedAndContinuedFailure" });
      },
    };
  },
});
