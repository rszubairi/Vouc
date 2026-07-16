import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Twice a day, notify users about new replies on discussions they've starred.
crons.interval(
  "starred discussion digest",
  { hours: 12 },
  internal.digests.runDigestBatch,
  { cursor: null }
);

export default crons;
