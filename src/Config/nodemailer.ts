import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const { NODEMAILER_HOST, NODEMAILER_PORT, NODEMAILER_USER, NODEMAILER_PASS } =
  process.env;

const config = () => {
  return {
    service: "gmail",
    host: NODEMAILER_HOST,
    port: +NODEMAILER_PORT,
    type: "OAuth2",
    secure: true,
    auth: {
      user: NODEMAILER_USER,
      pass: NODEMAILER_PASS,
    },
  };
};

export const transport = nodemailer.createTransport(config());
