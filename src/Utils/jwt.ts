import jwt, { JwtPayload } from "jsonwebtoken";

const { JWT_SECRET } = process.env;

export const generateJWT = (id: string) => {
  const token = jwt.sign({ id }, JWT_SECRET as string, {
    expiresIn: "30d",
  });
  return token;
};

export const verifyJWT = (token: string) => {
  const payload = jwt.verify(token, JWT_SECRET as string);
  return payload;
};
