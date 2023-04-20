export class SetWrapper<T> implements Set<T> {
  private set;

  constructor(iterable?: Iterable<T>) {
    if (iterable instanceof Set) this.set = iterable;
    if (iterable) this.set = new Set(iterable);
    else this.set = new Set();
  }

  get [Symbol.toStringTag]() {
    return "Validator";
  }

  add(value: T): this {
    this.set.add(value);
    return this;
  }

  delete(value: T): boolean {
    return this.set.delete(value);
  }

  has(value: T): boolean {
    return this.set.has(value);
  }

  get size(): number {
    return this.set.size;
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    this.set.forEach(callbackfn, thisArg);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.set[Symbol.iterator]();
  }

  values(): IterableIterator<T> {
    return this.set.values();
  }

  keys(): IterableIterator<T> {
    return this.set.keys();
  }

  entries(): IterableIterator<[T, T]> {
    return this.set.entries();
  }

  clear(): void {
    this.set.clear();
  }
}
