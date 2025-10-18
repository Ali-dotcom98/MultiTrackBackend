const mongoose = require("mongoose")

const connectDB = async (Url) => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/TaskManagment")
        console.log("MongoDb is Connected");

    } catch (error) {
        console.log("Error", error);

    }
}

module.exports = connectDB;