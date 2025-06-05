const express = require("express");
const User = require("../Model/User_Model")
const bcrypt = require("bcryptjs")
const router = express.Router();
const { GenerateToken, VerifyToken, Protect } = require("../Utils/Token");
const upload = require("../Middleware/uploadMiddleware")


router.post("/register", async (req, res) => {
    try {
        const { name, email, password, profileImageUrl, adminInviteToken } = req.body;
        console.log(name);


        const userexit = await User.findOne({ email });
        if (userexit) {
            return res.status(400).json({ Message: "Email already Registered..." })
        }
        let role = "member";
        if (adminInviteToken === process.env.AdminToken) {
            role = "admin";
        }
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        const user = await User.create(
            {
                name,
                email,
                password: hashPassword,
                profileImage: profileImageUrl,
                role: role
            }
        )
        console.log(user);
        const payload = { User: checkUser };
        const token = GenerateToken(payload);
        console.log(token);

        res.cookie("FreashToken", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        if (user) {
            return res.status(201).json({ Message: "User Added Successfully", User: user, token: token });
        } else {
            return res.status(500).json({ Message: "User creation failed" });
        }

    } catch (error) {
        console.log(error);

        res.status(404).json({ error: error })
    }


});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const checkUser = await User.findOne({ email });
        if (!checkUser) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }


        const isMatch = await bcrypt.compare(password, checkUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        const payload = { User: checkUser };
        const token = GenerateToken(payload);
        console.log(token);

        res.cookie("FreashToken", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.status(200).json({
            message: "Authorized",
            user: checkUser,
            token: token
        });


    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/profile", Protect, async (req, res) => {
    try {
        const UserProfile = await User.findById(req.user._id).select("-password");
        if (!UserProfile) {
            res.status(404).json({ message: "User Not Found" })
        }
        console.log(UserProfile);

        res.json({ user: UserProfile });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post("/profile", () => { });


router.post("/uploadImg", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No File is Uploaded" })
    }
    const ImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.status(200).json({ message: "Image uploaded successfully", Image: ImageUrl });

})

module.exports = router