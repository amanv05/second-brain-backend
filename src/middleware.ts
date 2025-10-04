import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { type Request, type Response, type NextFunction } from "express";
dotenv.config();
export const JWT_SECRET = process.env.JWT_SECRET;



export function authMiddleware(req: Request, res: Response, next: NextFunction) {
try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(403).json({ message: "You are not Signed In!" });
    }

    const user = jwt.verify(token, JWT_SECRET as string) as { id: string };
    if(!user){
        return res.status(401).json({message: "Invalid token"});
    }

    if(user){
        req.userID = user.id;
        next();
    } else {
        res.status(401).json({
            message: "Invalid token",
        });
    } 
} catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}