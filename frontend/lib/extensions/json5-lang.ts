import { parser } from '@lezer/json';
import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';

// Enhanced JSON5 language support with custom highlighting
export const json5Language = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        String: t.string,
        Number: t.number,
        "True False": t.bool,
        PropertyName: t.propertyName,
        Null: t.null,
        ",": t.separator,
        "[ ]": t.squareBracket,
        "{ }": t.brace,
        ":": t.punctuation,
        LineComment: t.lineComment,
        BlockComment: t.blockComment
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["[", "{", '"'] },
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    indentOnInput: /^\s*[}\]]$/
  }
});

// Custom JSON5 language support with enhanced features
export function json5() {
  return new LanguageSupport(json5Language);
}
