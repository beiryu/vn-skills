import * as fns from './functions.js';

declare const CustomFunctions: { associate(id: string, fn: (...args: never[]) => unknown): void };

for (const [id, fn] of Object.entries(fns)) CustomFunctions.associate(id, fn);
