import { Result, Schema } from "effect";

import {
  FieldKey,
  ReadableSheet,
  Reply,
  fieldDefinitions,
  fieldKeys,
  readValue,
  readable,
} from "./sheet.ts";

import type { FieldName } from "./sheet.ts";
import type { InterviewState } from "./state.ts";

const maximumQuestion = 300;

const Question = Schema.Trim.check(Schema.isLengthBetween(1, maximumQuestion));
const Understanding = Schema.Struct({
  ask: readable(FieldKey),
  finish: Schema.Boolean,
  message: readable(Question),
  reply: readable(Reply),
  skip: Schema.Boolean,
  values: ReadableSheet,
});

type UnderstandingData = typeof Understanding.Type;
type Interpretation = UnderstandingData & { readonly unreadable?: FieldName };
type Heard = Pick<Interpretation, "unreadable" | "values">;

const finishPattern =
  /^(?:(?:もう)?(?:終わり|おわり|おしまい|終了|終わる|終わらせて|やめる|やめたい)|もう(?:いい|いいよ|十分))(?:で|です|にして|にします|にしたい|ください)?(?:お願いします)?[。!！]?$/u;
const skipPattern =
  /^(?:スキップ|パス|飛ばして|とばして|次へ|答えたくない)(?:で|です|します|してください|ください)?(?:お願いします)?[。!！]?$/u;
const correctionPattern =
  /^(?<label>[^はを:：]+)\s*[はを:：]\s*(?<value>.+?)(?:に(?:して|変えて|変更して)(?:ください)?)?。?$/u;

function hear(key: FieldName, spoken: readonly string[]): Heard {
  return Result.match(readValue(key, spoken), {
    onFailure: ({ field }) => ({ unreadable: field, values: {} }),
    onSuccess: (values) => ({ values }),
  });
}

function correction(text: string): Heard {
  const groups = correctionPattern.exec(text)?.groups;
  const label = groups?.["label"]?.trim();
  const key = fieldKeys.find((candidate) => fieldDefinitions[candidate].label === label);
  const value = groups?.["value"];
  return key === undefined || value === undefined ? { values: {} } : hear(key, [value]);
}

function understandByRules(state: InterviewState, text: string): Interpretation {
  if (state.phase !== "asking") {
    return { finish: false, skip: false, ...correction(text) };
  }
  const finish = finishPattern.test(text);
  const skip = !finish && skipPattern.test(text);
  const answers = !finish && !skip && state.reply?.kind !== "confirm";
  return { finish, skip, ...(answers ? hear(state.current, [text]) : { values: {} }) };
}

export { Understanding, hear, understandByRules };
export type { Interpretation, UnderstandingData };
