export function errorHandler(err, req, res) {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
