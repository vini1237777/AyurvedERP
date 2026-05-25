import cluster from "node:cluster";
import os from "node:os";

const workers = parseInt(process.env.WEB_CONCURRENCY || "0", 10) || os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[cluster] primary ${process.pid} forking ${workers} workers`);
  for (let i = 0; i < workers; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `[cluster] worker ${worker.process.pid} died (code=${code}, signal=${signal}) — respawning`,
    );
    cluster.fork();
  });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./app");
  console.log(`[cluster] worker ${process.pid} listening`);
}
