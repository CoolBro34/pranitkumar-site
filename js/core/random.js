/** Uniform random float in [a, b). Shared by the main thread and the night worker. */
export const rnd = (a, b) => a + Math.random() * (b - a);
