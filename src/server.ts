import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import authRouter from "./Routes/authRouter";
import courtRouter from "./Routes/courtRouter";
import customerRouter from "./Routes/customerRouter";
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

// Routes middleware
server.use("/user", authRouter);
server.use("/court", courtRouter);
server.use("/reservation", reservationRouter);
server.use("/customer", customerRouter);
server.use("/payment", paymentRouter);

//Error catching endware
server.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.mesasge || err;
  console.log(err);
  res.status(status).send(message);
  next(err);
});

export default server;
