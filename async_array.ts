import PQueue from "p-queue";

export class AsyncArray {
  private queue: PQueue;
  private static instance: AsyncArray;

  private constructor(concurrency = 1) {
    this.queue = new PQueue({ concurrency });
  }

  public static getInstance(concurrency = 1) {
    if (!AsyncArray.instance) {
      AsyncArray.instance = new AsyncArray(concurrency);
    }
    return AsyncArray.instance;
  }

  async aForEach<E>(
    array: E[],
    callback: (
      ...params: Parameters<Parameters<Array<E>["forEach"]>[0]>
    ) => void
  ): Promise<void> {
    await this.queue.addAll(
      array.map(
        (...args) =>
          () =>
            callback(...args)
      ),
      {
        throwOnTimeout: true,
      }
    );
  }

  async aMap<E, R>(
    array: E[],
    callback: (...params: Parameters<Parameters<Array<E>["map"]>[0]>) => R
  ): Promise<R[]> {
    return Promise.all(
      await this.queue.addAll(
        array.map(
          (...args) =>
            () =>
              callback(...args)
        ),
        {
          throwOnTimeout: true,
        }
      )
    );
  }

  async aReduce<E, R>(
    array: E[],
    callback: (prev: E | R, curr: E, i: number, arr: E[]) => Promise<E | R>,
    first?: E | R
  ): Promise<E | R> {
    const list = first !== undefined ? array : array.slice(1);
    const start = first !== undefined ? first : array[0];

    return await list.reduce<Promise<E | R>>(async (pAcc, cur, ...rest) => {
      const acc = await pAcc;
      return await this.queue.add(() => callback(acc, cur, ...rest), {
        throwOnTimeout: true,
      });
    }, Promise.resolve(start));
  }
}
