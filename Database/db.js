const mongoose = require("mongoose")

const connectDB = async (Url) => {
    try {
        await mongoose.connect(Url)
        console.log("MongoDb is Connected");

    } catch (error) {
        console.log("Error", error);

    }
}

module.exports = connectDB;