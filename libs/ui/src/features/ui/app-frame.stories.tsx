import { Effect } from "effect";
import { HomeIcon, SearchIcon, UsersIcon } from "lucide-react";
import { expect } from "storybook/test";

import preview, { playTask } from "../../../storybook/preview";
import { AppFrame } from "./app-frame";
import { Icon } from "./shared/ui/icon";

const iconTargetPx = 24;
const glyphPx = 20;

const meta = preview.meta({
  args: {
    children: <p>{"本文"}</p>,
    collapsedMark: "管理",
    footer: () => <button type="button">{"アカウント"}</button>,
    navigationId: "app-navigation",
    productName: "管理画面",
    sections: [
      {
        destinations: [{ icon: <Icon icon={UsersIcon} />, label: "利用者", to: "/members" }],
        label: "運用",
      },
    ],
    title: "利用者の一覧",
  },
  component: AppFrame,
});

export const HeaderIcons = meta.story({
  play: ({ canvas }) =>
    Effect.runPromise(
      Effect.gen(function* measureHeaderIcons() {
        for (const buttonName of ["メニュー", "サイドバーを畳む"]) {
          const button = canvas.getByRole("button", { hidden: true, name: buttonName });
          const buttonStyle = getComputedStyle(button);
          yield* playTask(() =>
            expect({ height: buttonStyle.minHeight, width: buttonStyle.minWidth }).toStrictEqual({
              height: `${iconTargetPx}px`,
              width: `${iconTargetPx}px`,
            }),
          );
          const glyph = button.querySelector("svg");
          const glyphStyle = glyph === null ? undefined : getComputedStyle(glyph);
          yield* playTask(() =>
            expect({ height: glyphStyle?.height, width: glyphStyle?.width }).toStrictEqual({
              height: `${glyphPx}px`,
              width: `${glyphPx}px`,
            }),
          );
        }
      }),
    ),
});

export const BottomTabs = meta.story({
  args: {
    bottomTabs: true,
    collapsedMark: "ユーザー",
    density: "compact",
    homeTo: "/home",
    productName: "ユーザーアプリ",
    sections: [
      {
        destinations: [
          { exact: true, icon: <Icon icon={HomeIcon} />, label: "ホーム", to: "/home" },
          { icon: <Icon icon={SearchIcon} />, label: "探す", to: "/search" },
        ],
        label: "",
      },
    ],
    title: "ホーム",
  },
  play: ({ canvas }) =>
    Effect.runPromise(
      Effect.gen(function* findBottomTabs() {
        const tabs = canvas.getByRole("navigation", { name: "メイン" });
        const bounds = tabs.getBoundingClientRect();
        yield* playTask(() => expect(bounds.bottom).toBe(globalThis.innerHeight));
        yield* playTask(() => expect(bounds.width).toBe(document.documentElement.clientWidth));
      }),
    ),
});
