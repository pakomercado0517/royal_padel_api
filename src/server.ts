import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import authRouter from "./Routes/authRouter";
import courtRouter from "./Routes/courtRouter";
import courtAvailabilityRouter from "./Routes/courtAvailabilityRouter";
import courtPricingRouter from "./Routes/courtPricingRouter";
import customerRouter from "./Routes/customerRouter";
import notificationRouter from "./Routes/notificationRouter";
import paymentRouter from "./Routes/paymentRouter";
import reservationRouter from "./Routes/reservationRouter";

require("./Config/db");

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(cookieParser());
server.use(morgan("dev"));
server.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Create API router with prefix
const apiRouter = express.Router();

// Mount all routes on the API router
apiRouter.use('/user', authRouter);
apiRouter.use('/court', courtRouter);
apiRouter.use('/court-availability', courtAvailabilityRouter);
apiRouter.use('/court-pricing', courtPricingRouter);
apiRouter.use('/customer', customerRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/payment', paymentRouter);
apiRouter.use('/reservation', reservationRouter);

// Apply the /api prefix to all routes at once
server.use('/api', apiRouter);

//Error catching endware
server.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.mesasge || err;
  console.log(err);
  res.status(status).send(message);
  next(err);
});

export default server;
