const express = require("express");
const User = require("../Model/User_Model")
const task = require("../Model/Task_Model")
const bcrypt = require("bcryptjs");
const Task = require("../Model/Task_Model");
const router = express.Router();


router.get("/GetUserId", async (req, res) => {
    try {
        const Users = await User.find({ role: "member" });
        const userwithTaskCounts = await Promise.all(Users.map(async (user) => {
            const PendingTask = await Task.countDocuments({ assignedTo: user._id, status: "Pending" });
            const inProgressTasks = await Task.countDocuments({ assignedTo: user._id, status: "In Progress" })
            const completedTasks = await Task.countDocuments({ assignedTo: user._id, status: "Completed" })
            return {
                ...user._doc,
                PendingTask,
                inProgressTasks,
                completedTasks,
            };
        }))
        console.log(userwithTaskCounts);
        res.json(userwithTaskCounts)




    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})


router.get("/GetUserId/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ Message: "User Not Found" });
        }
        res.json(user)
    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})


module.exports = router