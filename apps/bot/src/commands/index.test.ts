import { describe, expect, it } from 'vitest';
import { commands } from './index.js';

interface JsonOption {
  name: string;
  required?: boolean;
  options?: JsonOption[];
}

/**
 * Discord rejects a command payload when an optional option appears before a
 * required one. Every command is registered globally at boot, so one bad
 * builder prevents all commands from updating.
 */
function requiredAfterOptional(name: string, options: JsonOption[] | undefined): string[] {
  const problems: string[] = [];
  let seenOptional = false;

  for (const option of options ?? []) {
    const path = `${name} ${option.name}`;
    if (option.required) {
      if (seenOptional) problems.push(path);
    } else {
      seenOptional = true;
    }
    problems.push(...requiredAfterOptional(path, option.options));
  }

  return problems;
}

describe('slash command definitions', () => {
  it('places required options before optional options', () => {
    const problems = commands.flatMap((command) => {
      const data = command.data.toJSON() as { name: string; options?: JsonOption[] };
      return requiredAfterOptional(data.name, data.options);
    });

    expect(problems).toEqual([]);
  });
});
