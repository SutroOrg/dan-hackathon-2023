import { AsyncArray } from "./async_array.js";

const getArray = () => [1, 2, 3, 4, 5, 6, 7, 8];

const doubler = (x: number) =>
  new Promise<number>((resolve) => {
    setTimeout(() => resolve(x * 2), Math.random() * 2000);
  });

getArray()
  .map(doubler)
  .forEach((x) => console.log(x));

const asyncArray = AsyncArray.getInstance(2);

const arr = await asyncArray.aMap(getArray(), doubler);

console.log(arr);

asyncArray.aForEach(getArray(), async (x) => {
  const foo = await doubler(x);
  console.log(`aa: ${foo}`);
});

getArray().forEach(async (x) => {
  const foo = await doubler(x);
  console.log(`arr: ${foo}`);
});
