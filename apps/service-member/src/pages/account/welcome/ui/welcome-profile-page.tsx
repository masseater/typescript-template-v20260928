import { maximumNameLength } from "@repo/runtime/contracts";
import { Button, Field, FormColumn, Heading, STATUS_VARIANT, StatusMessage } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";

import { useProfileForm } from "#entities/profile/index.ts";
import { maximumProfileLength } from "#shared/contracts/index.ts";
import { fieldError } from "#shared/forms/index.ts";
import { saveOnboardingStep } from "../api/onboarding.ts";

import type { FormEvent, ReactElement } from "react";

const blankProfile = { name: "", profile: "", socialLinks: [] };

function WelcomeProfilePage(): ReactElement {
  const navigate = useNavigate();
  const { blocked, error, form, pending } = useProfileForm(blankProfile, () =>
    saveOnboardingStep("done").then(() => navigate({ to: "/home" })),
  );
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void form.handleSubmit();
  }
  return (
    <main className="flex flex-col gap-4">
      <Heading as="h1" size="page">
        基本項目の入力
      </Heading>
      <form noValidate onSubmit={handleSubmit} aria-busy={pending}>
        <FormColumn>
          <form.Field name="name">
            {(field) => (
              <Field
                label="ユーザー名"
                maxLength={maximumNameLength}
                name="name"
                onValueChange={field.handleChange}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Field name="profile">
            {(field) => (
              <Field
                label="自己紹介"
                maxLength={maximumProfileLength}
                multiline
                name="profile"
                onValueChange={field.handleChange}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(invalid) =>
              invalid === undefined ? null : (
                <StatusMessage variant={STATUS_VARIANT.failure}>{invalid}</StatusMessage>
              )
            }
          </form.Subscribe>
          {error !== "" && <StatusMessage variant={STATUS_VARIANT.failure}>{error}</StatusMessage>}
          <div>
            <Button disabled={blocked} type="submit" variant="primary">
              保存してホームへ
            </Button>
          </div>
        </FormColumn>
      </form>
    </main>
  );
}

export { WelcomeProfilePage };
