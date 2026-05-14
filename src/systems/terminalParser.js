import { COMMAND_REGISTRY, listCommandPhrases } from './terminalCommands.js';

function normalizeInput(raw) {
  return (raw || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function startsWithTokens(inputTokens, phraseTokens) {
  if (phraseTokens.length > inputTokens.length) {
    return false;
  }

  for (let i = 0; i < phraseTokens.length; i += 1) {
    if (inputTokens[i] !== phraseTokens[i]) {
      return false;
    }
  }

  return true;
}

export function parseTerminalCommand(raw) {
  const normalized = normalizeInput(raw);

  if (!normalized) {
    return { ok: false, reason: 'empty' };
  }

  const tokens = normalized.split(' ');
  let best = null;
  let bestPhrase = null;

  for (const cmd of COMMAND_REGISTRY) {
    const candidatePhrases = [cmd.phrase, ...cmd.aliases];

    for (const phrase of candidatePhrases) {
      const phraseTokens = phrase.split(' ');

      if (!startsWithTokens(tokens, phraseTokens)) {
        continue;
      }

      if (!best || phraseTokens.length > bestPhrase.length) {
        best = cmd;
        bestPhrase = phraseTokens;
      }
    }
  }

  if (!best || !bestPhrase) {
    return { ok: false, reason: 'unknown', raw: normalized, tokens };
  }

  const args = tokens.slice(bestPhrase.length);

  return {
    ok: true,
    raw: normalized,
    tokens,
    commandId: best.id,
    namespace: best.namespace,
    args,
  };
}

export function autocompleteTerminalCommand(raw, extraTokens = []) {
  const normalized = normalizeInput(raw);
  const candidates = [...new Set([...listCommandPhrases(), ...extraTokens])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (!normalized) {
    return candidates[0] || '';
  }

  const exact = candidates.find((candidate) => candidate === normalized);
  if (exact) {
    return exact;
  }

  const prefixed = candidates.find((candidate) => candidate.startsWith(normalized));
  if (prefixed) {
    return prefixed;
  }

  const inputTokens = normalized.split(' ');
  const last = inputTokens[inputTokens.length - 1] || '';

  if (inputTokens.length > 1 && last) {
    const withLast = candidates.find((candidate) => {
      const candidateTokens = candidate.split(' ');
      return candidateTokens[candidateTokens.length - 1]?.startsWith(last);
    });

    if (withLast) {
      return withLast;
    }
  }

  return normalized;
}
