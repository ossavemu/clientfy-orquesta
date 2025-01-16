export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 5000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      console.log(`Intento ${i + 1}/${retries} fallido:`, errorMessage);

      if (i < retries - 1) {
        console.log(
          `Esperando ${delay / 1000} segundos antes del siguiente intento...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
