import { config } from "./src/config/config";
export default {
  schema: "prisma/schema.prisma",
  datasource: {
    url: config.database.url,
  },
};
