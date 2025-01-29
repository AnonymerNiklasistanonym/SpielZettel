type JsonObject = Record<string, unknown>;

function isObject(item: unknown): item is JsonObject {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

export function deepMerge<T extends JsonObject, U extends JsonObject>(
  target: T,
  source: U,
): T & U {
  if (typeof target !== "object" || typeof source !== "object")
    return source as T & U;

  const output: JsonObject = { ...target };
  for (const key in source) {
    if (isObject(source[key]) && isObject(target[key])) {
      // Recursively merge if both values are objects
      output[key] = deepMerge(
        target[key] as JsonObject,
        source[key] as JsonObject,
      );
    } else {
      // Otherwise, overwrite with source value
      output[key] = source[key];
    }
  }

  return output as T & U;
}
