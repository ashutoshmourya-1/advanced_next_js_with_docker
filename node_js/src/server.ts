import { configDotenv } from "dotenv";

configDotenv();

const { default: app } = await import("./app.js");

const server_start = (): void => {
  app.listen(process.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on port: ${process.env.PORT}`);
  });
};

server_start();