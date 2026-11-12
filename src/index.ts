import { createWorker } from "../kit/core/worker.js";
import config from "../mcp.config.js";
import { content } from "./content.js";

export default createWorker(config, { sources: { content } });
