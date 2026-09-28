import { cliStderr } from "@repo/cli";

export const warnUnreleased = (failure: Error): void => {
  cliStderr.write(`throttle: ${failure.message}\n`);
};
