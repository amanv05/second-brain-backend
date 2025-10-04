import express from "express";
import z from "zod";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";


import { userModel, contentModel, tagModel, linkModel } from "./db.js"
import { JWT_SECRET, authMiddleware } from "./middleware.js";


const app = express();
app.use(express.json());
dotenv.config();



app.post("/api/v1/signup", async (req, res) => {
    const requiredBody = z.object({
        username: z.string().min(3).max(10),
        password: z.string().min(8).max(20),
    });

try {
    const parsedBody = requiredBody.safeParse(req.body);

    if(!parsedBody.success) {
      return res.status(400).json({
      message: "Invalid inputs",
      error: parsedBody.error,
      });
    }

    const { username, password } = parsedBody.data;


    const userAlready = await userModel.findOne({
        username: username
    });

    if (userAlready) {
        return res.status(409).json({
            message: "User already exists",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 5);

    const userCreated = await userModel.create({
        username: username,
        password: hashedPassword,
    });

    if(userCreated) {
        return res.status(200).json({
            message: "User signed up"
        });
    }
} catch(e) {
    console.error("Signup error:", e);
    return res.status(500).json({
        message: "Server error",
    });
}
});


app.post("/api/v1/signin", async (req, res) => {
    const requiredBody = z.object({
        username: z.string().min(3).max(10),
        password: z.string().min(8).max(20),
    });
 
try{
    const parsedBody = requiredBody.safeParse(req.body);
    
    if(!parsedBody.success){
        return res.status(400).json({
            message: "Invalid Input",
            error: parsedBody.error
        });
    }

    const { username, password } = parsedBody.data;

    const user = await userModel.findOne({
        username: username,
    });

    if(!user) {
        return res.status(401).json({
            message: "Invalid Username or Password",
        });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if(!passwordMatch) {
        return res.status(401).json({
            message: "Invalid Username or Password",
        });
    }

    if(passwordMatch && user){
        const jwtToken = jwt.sign({
            id: user._id
        }, JWT_SECRET as string);

        return res.status(200).json({
            token: jwtToken,
        });
    } 
} catch(e) {
    console.error("Signin error:", e);
    return res.status(500).json({
        message: "Internal server error",
    });
} 
});


app.post("/api/v1/content", authMiddleware, async (req, res) => {
    const contentSchema = z.object({
        link: z.url(),
        title: z.string().min(1).max(100),
        type: z.string().min(1),
        tags: z.array(z.string()).optional(),
    })

try {
    const parsedBody = contentSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({
            message: "Invalid input",
            error: parsedBody.error,
        });
    }

    const { link, type, tags, title } = parsedBody.data;
    

    const content = await contentModel.create({
        link,
        title,
        type,
        tags: [],
        userID: req.userID,
    });

    if(content) {
        return res.status(201).json({
            message: "Content successfully created",
        });
    } else {
        return res.status(400).json({
            message: "Content not created",
        });
    }
} catch(e) {
    console.error("Error while creating:", e);
    return res.status(500).json({
        message: "Internal server error",
    });
}
});


app.get("/api/v1/content", authMiddleware, async (req, res) => {
try {
    const userID = req.userID;
    const content = await contentModel.find({
        userID: userID,
    }).populate("userID", "username");

    if (content) {
        return res.status(200).json({
            content,
        });
    } else {
        return res.status(200).json({
            message: "No content present"
        });
    }
} catch(e) {
    console.error("Error while retrieving content:", e);
    return res.status(500).json({
        message: "Internal server error",
    });
}
});


app.delete("/api/v1/content", authMiddleware, async (req, res) => {
try {
    const contentID = req.body.contentID;
    const userID = req.userID;

    const deleteContent = await contentModel.findOneAndDelete({
            _id: contentID,
            userID,
        });
    
    if (deleteContent) {
        return res.status(200).json({
            message: "Content Deleted",
        });
    } else {
        return res.status(404).json({
            message: "Content not found",
        })
    }
} catch(e) {
    console.error("Error while deleting:", e);
    return res.status(500).json({
        message: "Internal server error",
    })
}
});


app.post("/api/v1/brain/share", authMiddleware, async (req, res) => {
try {
    const share = req.body.share;
    const userID = req.userID;
if (share === true || share === "true") {
    const existinglink = await linkModel.findOne({
        userID: userID,
    });

    if(existinglink) {
        return res.status(200).json({
            hash: existinglink.hash,
            message: "Link already exists",
        });
    } else {
    const hash = crypto.randomBytes(8).toString("hex");

    const createLink = await linkModel.create({
        userID,
        hash: hash
    });

    if (createLink) {
        return res.status(201).json({
            hash,
            message: "Link created",
        });
    } else {
        res.status(500).json({ message: "Failed to create link"});
    }
}
} else {
       await linkModel.deleteOne({
        userID: userID,
       });
       return res.status(200).json({
        message: "Removed link",
       });
    }
} catch(e) {
    console.error("Error while deleting:", e);
    return res.status(500).json({
        message: "Internal server error",
    });
}
});


app.get("/api/v1/brain/:shareLink", async (req, res) => {
try {
    const hash = req.params.shareLink;

    const link = await linkModel.findOne({
        hash,
    });

    if (!link) {
        return res.status(404).json({
            message: "Invalid link",
        });
    }

    const content = await contentModel.find({
            userID: link.userID,
        });

    const user = await userModel.findOne({
        _id: link.userID,
    })

    if (!content) {
        return res.status(204).json({ message: "Content not present" });
    }

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
        content,
        username: user.username,
    });
} catch(e) {
    console.error("Error while accesing other brain:", e);
    return res.status(500).json({
        message: "Internal server error",
    });
}
});


app.listen(3000, () => {
    console.log("Server is Started");
});