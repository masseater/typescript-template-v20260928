const captchaPackages = [
  "@hcaptcha/react-hcaptcha",
  "@marsidev/react-turnstile",
  "grecaptcha",
  "react-google-recaptcha",
  "react-google-recaptcha-v3",
  "react-turnstile",
  "svelte-turnstile",
] as const;

const captchaImportPattern = new RegExp(
  String.raw`from\s+["'](?:${captchaPackages.map((name) => name.replaceAll("/", String.raw`\/`)).join("|")})(?:\/[^"']*)?["']|require\(\s*["'](?:${captchaPackages.map((name) => name.replaceAll("/", String.raw`\/`)).join("|")})(?:\/[^"']*)?["']\s*\)`,
  "u",
);

const browserConfirmPattern =
  /\b(?:window\.|globalThis\.)?confirm\s*\(|\b(?:window\.|globalThis\.)alert\s*\(/u;

const hoverHidden = /(?:^|[\s"'`])(?:opacity-0|invisible|hidden|pointer-events-none)(?:$|[\s"'`])/u;
const hoverReveal = /(?:group-hover|hover):(?:opacity-(?:100|\[1\])|visible|pointer-events-auto)/u;

const captchaImportViolations = (source: string): string[] => {
  return captchaImportPattern.test(source)
    ? ["captcha-import: 画像認証は使えません。回数の上限と User-Agent で乱用を見てください。"]
    : [];
};

const browserConfirmViolations = (source: string): string[] => {
  return browserConfirmPattern.test(source)
    ? [
        "browser-confirm: window.confirm / alert は使えません。見出しと動作の名前を持つ ConfirmDialog を使ってください。",
      ]
    : [];
};

const hoverOnlyActionViolations = (source: string): string[] => {
  const classBlocks = [
    ...source.matchAll(/className\s*=\s*(?:\{`([^`]*)`\}|"([^"]*)"|'([^']*)')/gu),
  ];
  const hovering = classBlocks.some((match) => {
    const classes = match[1] ?? match[2] ?? match[3] ?? "";
    return hoverHidden.test(classes) && hoverReveal.test(classes);
  });
  return hovering
    ? [
        "hover-only-action: ホバーでしか出ない操作は作れません。押せば出るメニュー（DropdownMenu）にしてください。",
      ]
    : [];
};

const shippedUiRuleViolations = (source: string): string[] => {
  return [
    ...captchaImportViolations(source),
    ...browserConfirmViolations(source),
    ...hoverOnlyActionViolations(source),
  ];
};

export {
  browserConfirmViolations,
  captchaImportViolations,
  hoverOnlyActionViolations,
  shippedUiRuleViolations,
};
