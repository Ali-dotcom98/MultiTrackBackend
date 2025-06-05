const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config();
const Key = process.env.PrivateKey
const GenerateToken = (Payload) => {
    return jwt.sign(Payload, Key, { expiresIn: "7D" });
}

const VerifyToken = (Token) => {
    return jwt.verify(Token, Key);
}

const Protect = (req, res, next) => {
    console.log("In protect");

    let token = req.headers.authorization?.split(" ")[1];
    console.log("Does token ", token);


    if (!token) {
        token = req.cookies.FreashToken;
        console.log("Does token1 ", token);
    }

    if (!token) {
        return res.status(401).json({ Message: "Unauthorized, No Token Provided" });
    }

    try {
        const decoded = jwt.verify(token, Key);

        const user = decoded.User;
        console.log(user);

        req.user = user;

        // req.user = decoded;  // Store user data in request
        next();
    } catch (error) {
        return res.status(403).json({ Message: "Invalid Token" });
    }
};

module.exports = { GenerateToken, VerifyToken, Protect }

