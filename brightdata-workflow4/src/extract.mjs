const MAX_EXCERPT_LENGTH = 600;

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(stripTags(match[1])).trim().slice(0, 240) : 'Untitled source';
}

export function extractPassages(html, task, limit = 4) {
  const candidates = html
    .match(/<(?:p|li|h[1-3])\b[^>]*>[\s\S]*?<\/(?:p|li|h[1-3])>/gi) ?? [];
  const keywords = tokenize(task);
  return candidates
    .map((candidate) => decodeEntities(stripTags(candidate)).replace(/\s+/g, ' ').trim())
    .filter((text) => text.length >= 40)
    .map((text) => ({ text: text.slice(0, MAX_EXCERPT_LENGTH), score: score(text, keywords) }))
    .sort((left, right) => right.score - left.score || left.text.length - right.text.length)
    .filter(({ score }, index) => score > 0 || index === 0)
    .slice(0, limit)
    .map(({ text }) => text);
}

function tokenize(value) {
  return new Set(value.toLowerCase().match(/[a-z]{3,}/g) ?? []);
}

function score(text, keywords) {
  const tokens = tokenize(text);
  return [...keywords].reduce((total, keyword) => total + (tokens.has(keyword) ? 1 : 0), 0);
}

function stripTags(value) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}

function decodeEntities(value) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
