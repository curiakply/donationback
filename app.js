require("dotenv").config({ path: "./config/.env" });

const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const mongoose = require("mongoose");
const passport = require('passport');
const session = require('express-session');
require('./config/passport');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const options = require("./config/swaggerOptions");
// const authRoutes = require('./routes/auth');
const authRoutes = require('./routes/auth.routes');
const { verifyToken } = require('./middleware/auth.middleware');
const app = express();

const port = process.env.PORT || 5000;
connectDB();
// app.use(logger);

// app.use(cookieParser());
// //03/06/2026
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: false }));
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ limit: "10mb", extended: true }));
// app.use(cors({
//   origin: ['http://localhost', 'http://localhost:80','http://localhost:3000','http://localhost:5173','https://jeevan-bay.vercel.app','https://jeevan-frontend-two.vercel.app','http://localhost:3001'], // Replace with your frontend URL
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','HEAD','PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));  
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000','http://localhost:5173','http://localhost:3001','http://localhost','http://localhost:80','http://frontend','http://localhost:3000','http://192.168.1.11:3000','http://192.168.1.11','http://jeevankply.com','http://jeevankply.com:3000','https://priestdonation.vercel.app'];

app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','HEAD','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
//app.use(cors(corsOptions));
const path = require("path");
const diocese = require("./routes/dioceseRouter");
const priest = require("./routes/priestRouter");
const position = require("./routes/positionRouter");
const department = require("./routes/departmentRoutes");
app.use('/congregation', require('./routes/congregationRouter'));

const parish = require("./routes/parish");
const authRouter = require('./routes/auth.routes');

// const auth = require("./routes/auth");


// const parishdata = require("./routes/parishData");

const adminManagementRoutes = require('./routes/adminmanagement');
const backupRoutes = require('./routes/backup');

const donationRouter = require("./routes/donationRouter");

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, 
  secure: process.env.NODE_ENV === 'production',
}));
app.use(logger);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(passport.initialize());
app.use(passport.session()); 

app.get("/", (req, res) => {
  res.status(200);
});
app.get('/ping', (req, res) => res.json({ ok: true }));
app.use('/assignment', require('./routes/assignmentRouter'));
// Add this route
// app.use('/analytics', transactionAnalyticsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/authf', require('./routes/forgotPasswordRoutes'));
//app.use("/auth", auth);
app.use("/diocese", diocese);
app.use("/priest", priest);
app.use("/position", position);
app.use("/department", department);

app.use("/parish", parish);



app.use("/organization", require("./routes/Organizationroutes"));
app.use("/narration", require("./routes/Narrationroutes"));

app.use('/admin-management', adminManagementRoutes);
app.use("/donations", donationRouter);
app.use("/donation-report", require("./routes/Donationreportroutes"));
app.use("/organization-report", require("./routes/Organizationreportroutes"));
app.use("/priest-ledger", require("./routes/Priestledgerroutes"));
app.use("/curia-dashboard", require("./routes/Curiadashboardroutes"));
// app.use("/users", require("./routes/UserRoutes"));
app.use('/backup', backupRoutes);

 app.use('/auth', authRouter);
const specs = swaggerJsdoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);


app.use('/auth', authRoutes);
app.use('/analytics', superAdminRoutes);
app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});
app.use(errorHandler);

mongoose.connection.once("open", () => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
module.exports = app;