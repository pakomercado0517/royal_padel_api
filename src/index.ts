import server from "./server";
import { conn } from "./Config/db";

const PORT = process.env.PORT || 3003;

conn.sync({ force: true }).then(() => {
  server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
});
