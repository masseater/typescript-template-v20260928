---
description: "Disallow a conditional expression in the test or the consequent of another conditional expression, so which combination of conditions yields which value is readable from top to bottom"
---

# no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value

<!-- BEGIN GENERATED rule-header -->

Disallow a conditional expression in the test or the consequent of another conditional expression, so which combination of conditions yields which value is readable from top to bottom

- Tool: `oxlint`
- Fixable: no
- Suggestions: no
- Options: no
- Bundle: `writing`
- Source: [`no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value.ts`](../../src/features/dont-review-it/lint/oxlint/rules/writing/no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value.ts)

<!-- END GENERATED rule-header -->

## Violation

A conditional expression whose test or true branch is itself a conditional expression. Reading such an expression means holding the outer condition while the inner one is decided, so which combination of conditions yields which value is not visible from top to bottom.

A chain that continues only through the false branch (`a ? x : b ? y : z`) is not reported. It reads like `else if`, one condition after another. A conditional nested inside a call, an object or an array within a branch is not reported either, because the rule reads only the test and the true branch themselves.

## Fix

Split the outer condition with `if` and return early, or give the inner value a name first so each conditional keeps one level.

```ts
const retried = seen >= limit ? 200 : 503;
const status = retrying ? retried : 204;
```

<!-- BEGIN GENERATED examples -->

Code this rule rejects.

```ts
// a conditional in the true branch is reported
const status = retrying ? (seen >= limit ? 200 : 503) : 204;
```

Code this rule accepts.

```ts
// a chain through the false branch reads like else if and passes
const label = ready ? 'ready' : failed ? 'failed' : 'waiting';
```

```ts
// a named inner value keeps each conditional to one level
const retried = seen >= limit ? 200 : 503;
const status = retrying ? retried : 204;
```

<!-- END GENERATED examples -->

### Forbidden bypasses (do not do this)

- Wrapping the inner conditional in a call or an object only to pass the rule. The combination of conditions stays as hard to read as before
- Moving the inner conditional into the false branch by negating the conditions when the chain no longer reads as one condition after another

## Messages

<!-- BEGIN GENERATED messages -->

| messageId | Text |
| --- | --- |
| `nestedConditional` | A conditional expression must not sit in the test or the true branch of another conditional expression. Split the outer condition with if and return early, or give the inner value a name first. A chain that continues only through the false branch (a ? x : b ? y : z) is allowed. |

<!-- END GENERATED messages -->

## Runtime Selection

<!-- BEGIN GENERATED runtime -->

This rule runs as an oxlint JS plugin, in the same pass as every other rule the workspace ships. It reads no options. A consumer turns it on or off as a whole.

<!-- END GENERATED runtime -->
