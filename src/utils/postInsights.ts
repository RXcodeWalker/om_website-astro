const WORDS_PER_MINUTE = 200;
const MAX_IDEA_LENGTH = 84;
const MAX_LINE_LENGTH = 170;

const EMPHASIS_PATTERN = /[*_~`>#]/g;
const URL_PATTERN = /\bhttps?:\/\/\S+/gi;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trim()}...`;
}

function cleanCandidate(value: string): string {
  const cleaned = normalizeWhitespace(
    decodeBasicEntities(value)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[[^\]]*]\(([^)]+)\)/g, ' ')
      .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
      .replace(EMPHASIS_PATTERN, ' ')
      .replace(URL_PATTERN, ' ')
      .replace(/^[\s\-–—:;,.]+/, '')
      .replace(/[\s\-–—:;,.]+$/, ''),
  );

  return cleaned;
}

function uniqueByLower(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function toPlainText(markdown: string): string {
  const withoutCodeBlocks = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ');

  const withoutImages = withoutCodeBlocks.replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ');
  const withoutLinks = withoutImages.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1');
  const withoutHtml = withoutLinks.replace(/<[^>]+>/g, ' ');
  const withoutLists = withoutHtml.replace(/^\s*[-*+]\s+/gm, '');
  const withoutHeadingMarks = withoutLists.replace(/^#{1,6}\s+/gm, '');
  const withoutRules = withoutHeadingMarks.replace(/^[-=]{3,}$/gm, ' ');

  return normalizeWhitespace(
    decodeBasicEntities(
      withoutRules
        .replace(EMPHASIS_PATTERN, '')
        .replace(URL_PATTERN, ' '),
    ),
  );
}

function splitSentences(value: string): string[] {
  const matches = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 24);
}

function headingCandidates(markdown: string): string[] {
  const candidates: string[] = [];
  const headingMatches = markdown.matchAll(/^\s*#{1,6}\s+(.+)$/gm);
  const strongMatches = markdown.matchAll(/<strong>(.*?)<\/strong>/gim);
  const boldMatches = markdown.matchAll(/^\s*\*\*(.+?)\*\*\s*$/gm);

  for (const match of headingMatches) {
    candidates.push(cleanCandidate(match[1] ?? ''));
  }

  for (const match of strongMatches) {
    candidates.push(cleanCandidate(match[1] ?? ''));
  }

  for (const match of boldMatches) {
    candidates.push(cleanCandidate(match[1] ?? ''));
  }

  return uniqueByLower(
    candidates
      .filter((candidate) => candidate.length >= 10 && candidate.length <= MAX_IDEA_LENGTH)
      .map((candidate) => truncate(candidate, MAX_IDEA_LENGTH)),
  );
}

function sentenceCandidates(plainText: string): string[] {
  return uniqueByLower(
    splitSentences(plainText)
      .filter((sentence) => sentence.length >= 32 && sentence.length <= 140)
      .map((sentence) =>
        truncate(
          sentence
            .replace(/\s+/g, ' ')
            .replace(/^[^A-Za-z0-9"]+/, '')
            .replace(/\s*[.!?]+$/, ''),
          MAX_IDEA_LENGTH,
        ),
      ),
  );
}

function scoreStrikingSentence(sentence: string, index: number): number {
  const wordCount = sentence.split(/\s+/).filter(Boolean).length;
  let score = 0;

  if (/[!?]/.test(sentence)) score += 4;
  if (/[—:;]/.test(sentence)) score += 3;
  if (/\b(must|never|now|finally|defining|crucial|belief|future|pressure|bold)\b/i.test(sentence)) score += 2;
  if (wordCount >= 8 && wordCount <= 28) score += 3;
  if (sentence.length >= 48 && sentence.length <= MAX_LINE_LENGTH) score += 3;
  if (index < 6) score += 1;

  return score;
}

export function estimateReadingMinutes(markdown: string): number {
  const plain = toPlainText(markdown);
  const words = plain.split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

export function extractKeyIdeas(markdown: string, count = 3): string[] {
  const plain = toPlainText(markdown);
  const ideas = headingCandidates(markdown);

  if (ideas.length < count) {
    ideas.push(...sentenceCandidates(plain));
  }

  const unique = uniqueByLower(ideas)
    .map((idea) => truncate(idea, MAX_IDEA_LENGTH))
    .slice(0, count);

  if (unique.length === count) return unique;

  if (plain) {
    const fallback = truncate(plain, MAX_IDEA_LENGTH);
    while (unique.length < count) {
      unique.push(fallback);
    }
    return unique;
  }

  while (unique.length < count) {
    unique.push('More ideas inside the full piece');
  }

  return unique;
}

export function extractStrikingLine(markdown: string, fallback = ''): string {
  const plain = toPlainText(markdown);
  const sentences = splitSentences(plain).filter((sentence) => sentence.length <= 220);

  if (!sentences.length) {
    return truncate(cleanCandidate(fallback) || 'Read the full piece for the defining line.', MAX_LINE_LENGTH);
  }

  const bestSentence = sentences
    .map((sentence, index) => ({ sentence, score: scoreStrikingSentence(sentence, index) }))
    .sort((a, b) => b.score - a.score)[0]?.sentence;

  return truncate(cleanCandidate(bestSentence || fallback || sentences[0]), MAX_LINE_LENGTH);
}
