import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();
await mongoose.connect(process.env.DB as string); 


const userSchema = new mongoose.Schema({
    username: { type: String, required:true, unique: true, },
    password: { type: String, required:true },
});

const contentTypes = ['image', 'video', 'article', 'audio'];

const contentSchema = new mongoose.Schema({
    link: { type: String, required: true },
    type: { type: String, enum: contentTypes, required : true },
    title: { type: String, required: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tags"}],
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
});

const tagSchema = new mongoose.Schema({
    title: { type:String, required: true, unique: true },
})

const linkSchema = new mongoose.Schema({
    hash: { type: String, required: true },
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
})

export const userModel = mongoose.model("Users", userSchema);
export const contentModel = mongoose.model("Content", contentSchema);
export const tagModel = mongoose.model("Tags", tagSchema);
export const linkModel = mongoose.model("Link", linkSchema);