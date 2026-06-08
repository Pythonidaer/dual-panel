import type { TokenType } from "@/lib/demo-data";

export const tokenColor: Record<TokenType, string> = {
  keyword:     "text-tok-keyword",
  function:    "text-tok-function",
  string:      "text-tok-string",
  number:      "text-tok-number",
  variable:    "text-tok-variable",
  comment:     "text-tok-comment italic",
  punctuation: "text-tok-punctuation",
  plain:       "",
};
