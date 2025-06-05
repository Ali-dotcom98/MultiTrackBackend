const express = require("express");
const User = require("../Model/User_Model");
const Task = require("../Model/Task_Model");
const router = express.Router();

const { GenerateToken, VerifyToken, Protect } = require("../Utils/Token");
router.get("/GetTask", Protect, async (req, res) => {
    try {

        const { status } = req.query;
        let filter = {};
        if (status) {
            filter.status = status;
        }
        let tasks;
        if (req.user.role === "admin") {
            tasks = await Task.find(filter).populate(
                "assignedTo",
                "name email profileImage"
            );
        }
        else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
                "assignedTo",
                "name email profileImage"
            )
        }
        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoCheckList.filter(
                    (item) => item.completed
                ).length;
                return { ...task._doc, completedTodoCount: completedCount };
            })
        )


        const allTasks = await Task.countDocuments(
            req.user.role === "admin" ? {} : { assignedTo: req.user._id }
        )
        const pendingTask = await Task.countDocuments(
            {
                ...filter,
                status: "Pending",
                ...(req.user.role !== "admin" && { assignedTo: req.user._id })
            }
        )

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status: "In Progress",
            ...(req.user.role !== "admin" && { assignedTo: req.user._id })

        })

        const CompletedTask = await Task.countDocuments({
            ...filter,
            status: "Completed",
            ...(req.user.role !== "admin" && { assignedTo: req.user._id })

        })


        res.json({
            tasks,
            statusSummary: {
                all: allTasks,
                pendingTask: pendingTask,
                inProgressTasks: inProgressTasks,
                CompletedTask: CompletedTask
            }
        })

    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})


router.get("/GetTask/:id", async (req, res) => {
    try {
        console.log("slkdlsak");

        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImage"
        )
        if (!task) {
            return res.status(404).json({ message: "Task Not Found" });
        }
        console.log("Yes task is sended");

        return res.status(201).json({ message: "Task Exist", task });



    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})

router.post("/CreateTask", Protect, async (req, res) => {
    try {
        const {
            title,
            description,
            priority,
            status,
            dueDate,
            assignedTo,
            attachment,
            todoCheckList
        } = req.body;


        if (!Array.isArray(assignedTo)) {
            return res.status(400).json({ message: "assignedTo must be an array of User IDs" });
        }


        if (!title || !dueDate) {
            return res.status(400).json({ message: "Title and Due Date are required" });
        }


        const task = await Task.create({

            title,
            description,
            assignedTo,
            priority,
            status,
            dueDate,
            attachment,
            todoCheckList,
            createdBy: req.user._id,
        });

        return res.status(201).json({ message: "Task Created Successfully", task });

    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.put("/UpdateTask/:id", async (req, res) => {
    try {

        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }
        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoCheckList = req.body.todoCheckList || task.todoCheckList;
        task.attachment = req.body.attachment || task.attachment;
        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res.status(400).json({ message: "Assigned must be array of Users" })
            }
        }
        task.assignedTo = req.body.assignedTo;
        const updateUser = await task.save();
        res.status(201).json({ Message: "Task Updated Successfully", updateUser });


    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})


router.delete("/DeleteTask/:id", async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }
        await task.deleteOne();
        res.json({ Message: "Task Deleted Successfully..." })

    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})


router.put("/UpdateTaskStatus/:id", Protect, async (req, res) => {
    try {
        console.log(req.user.role);

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(403).json({ Message: "Task Not Exist" })
        }
        console.log(task.assignedTo);

        const isAssigned = task.assignedTo.some((user_id) => user_id.toString() === req.user._id);
        console.log(isAssigned);

        if (!isAssigned && req.user.role !== "admin") {
            return res.status(403).json({ Message: "Not authorized", User: req.user });
        }
        task.status = req.body.status || task.status
        if (task.status == "Completed") {
            task.todoCheckList.forEach((item) => (item.completed = true));
            task.progress = 100;
        }
        await task.save();
        res.status(200).json({ message: "Task Status Updated", task })



    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})

router.put("/UpdateTaskCheckList/:id", Protect, async (req, res) => {
    try {
        const { todoCheckList } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }
        if (!task.assignedTo.includes(req.params.id) && req.user.role != "admin") {
            return res.status(403).json({ Message: "Not Authorized to Update the List" })
        }
        task.todoCheckList = todoCheckList;
        const completedCount = task.todoCheckList.filter(
            (item) => item.completed
        ).length;

        const totalItems = task.todoCheckList.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
        if (task.progress == 100) {
            task.status = "Completed"
        }
        else if (task.progress > 0) {
            task.status = "In Progress"
        }
        else {
            task.status = "Pending"
        }

        await task.save();

        const UpdateTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImage"
        );
        res.json({ message: "Task CheckListed", UpdateTask })


    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})

router.get("/AdminDashboardData", async (req, res) => {
    try {
        const totaltask = await Task.countDocuments();
        const pendingTask = await Task.countDocuments({ status: "Pending" });
        const completedTask = await Task.countDocuments({ status: "Completed" });
        const overdueTask = await Task.countDocuments(
            {
                status: { $ne: "Completed" },
                dueDate: { $lt: new Date() }
            });
        const taskStatus = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },

                },

            }
        ]);
        console.log(taskDistributionRaw);

        const taskDistribution = taskStatus.reduce((acc, status) => {
            const formattedkey = status.replace(/\s+/g, "");

            acc[formattedkey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        console.log(taskDistribution);


        taskDistribution["All"] = totaltask;

        console.log(taskDistribution);


        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 },
                },
            },
        ]);
        console.log("taskPriorityLevelsRaw", taskPriorityLevelsRaw);


        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            const data = taskPriorityLevelsRaw.find((item) => item._id === priority)
            console.log("Data", data);

            acc[priority] = data?.count || 0;
            return acc;
        }, {});
        // Fetch recent 10 tasks
        console.log(taskPriorityLevels);

        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        console.log(recentTasks);


        res.status(200).json({
            statistics: {
                totaltask,
                pendingTask,
                completedTask,
                overdueTask,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });


    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})

router.get("/UserDashboardData", Protect, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("User", userId);

        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasks = await Task.countDocuments({ assignedTo: userId, dueDate: { $lt: new Date() } });

        // Task distribution by status
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, "");
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});

        taskDistribution["All"] = totalTasks;

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });



    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message })
    }
})

module.exports = router;