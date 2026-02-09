import { add } from './source.ts';

interface Result<T> {
  value: T;
  error?: string;
}

type Mapper<T, U> = (input: T) => U;

function transform<T, U>(value: T, fn: Mapper<T, U>): Result<U> {
  return { value: fn(value) };
}

export { transform };
export type { Result, Mapper };
