const express = require("express")
const connectDB = require("./Database/db.js")
const cors = require("cors");
const path = require("path")
const dotenv = require("dotenv")
var cookieParser = require('cookie-parser')
const { Protect } = require("./Utils/Token.js")


const AuthRoutes = require("./Routes/AuthRoutes.js");
const UserRoutes = require("./Routes/UserRoutes.js")
const TaskRoutes = require("./Routes/TaskRoutes.js")

dotenv.config();
const dataURL = process.env.MONGO_URL;
console.log(dataURL);

connectDB(dataURL)



const app = express();
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/task", TaskRoutes);
// app.use("/api/report", ReportRoutes);


const Port = process.env.PORT || 5000

app.get("/", (req, res) => {
    res.send("Hello")
})



app.listen(Port, () => {
    console.log("Server Listeing at Port", Port);

})