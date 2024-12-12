export async function retryWithDelay(fn, retries = 3, delay = 5000) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Intento ${i + 1}/${retries} fallido:`, error.message);

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
