import pino from "pino";
import { NODE_ENV, LOG_LEVEL } from "../constants.js";

const isDevelopment = NODE_ENV === "development";

const transport_obj = isDevelopment?
{
  transport:
  {
    target:"pino-pretty",
    options:
    {
      colorise: true,
      translateTime: "yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname"
    },
  },

}:{};

const logger = pino(
  {
    level: LOG_LEVEL,
    ...transport_obj
  }
)
export default logger;