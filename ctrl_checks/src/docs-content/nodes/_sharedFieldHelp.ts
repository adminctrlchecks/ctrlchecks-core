export const richFieldHelp = (parts: {
  what: string;
  why: string;
  when: string;
  enter: string;
  source: string;
  later: string;
  format: string;
  example: string;
  empty: string;
  mistake: string;
}) => [
  `What this field is: ${parts.what}`,
  `Why it matters: ${parts.why}`,
  `When to fill it: ${parts.when}`,
  `What to enter: ${parts.enter}`,
  `Where the value comes from: ${parts.source}`,
  `How to use it later: ${parts.later}`,
  `Accepted format: ${parts.format}`,
  `Real workplace example: ${parts.example}`,
  `If it is empty or wrong: ${parts.empty}`,
  `Common mistake: ${parts.mistake}`,
].join('\n');
