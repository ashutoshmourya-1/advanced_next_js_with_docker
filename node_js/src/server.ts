import "dotenv/config";
import app from "./app.js";

app.listen(process.env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port: ${process.env.PORT}`);
});
