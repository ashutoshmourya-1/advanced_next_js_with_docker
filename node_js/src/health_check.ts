const port = process.env.PORT ?? "3001";

try {
  const response = await fetch(`http://127.0.0.1:${port}/health`);

  if (!response.ok) {
    console.error(`Health check failed with status: ${response.status}`);
    process.exit(1);
  }

  process.exit(0);
} catch (err) {
  console.error("Health check error:", err);
  process.exit(1);
}