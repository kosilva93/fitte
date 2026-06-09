declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;

interface Expect {
  (value: unknown): Matchers;
}

interface Matchers {
  toBe(value: unknown): void;
  toBeNull(): void;
  toEqual(value: unknown): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
  toHaveBeenCalled(): void;
  toMatchObject(value: unknown): void;
  not: Matchers;
  rejects: {
    toThrow(message?: string): Promise<void>;
  };
}

declare const expect: Expect;

declare namespace jest {
  interface Mock {
    (...args: unknown[]): unknown;
    mockResolvedValue(value: unknown): Mock;
  }
}

declare const jest: {
  fn: () => jest.Mock;
  mock: (moduleName: string, factory: () => unknown) => void;
  resetAllMocks: () => void;
};
