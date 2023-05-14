export const setSubtract = <T extends any>(
  setA: Set<T>,
  setB: Set<T>
): Set<T> => {
  const _setA = new Set(setA);
  for (const elem of setB) {
    _setA.delete(elem);
  }
  return _setA;
};
