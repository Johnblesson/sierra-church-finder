import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet"
import ejs from "ejs";
import path from "path"; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import passport from './server/passport/passport-config.js';
import connectDB from './server/database/connection.js';
import authRoutes from "./server/routes/auth.js";
// import dashboardRoutes from "./server/routes/dashboard.js";
// import newMemberRoute from "./server/routes/newMemberRoutes.js";
// import ipAddressRoutes from "./server/routes/ipaddress.js";
import communityRoutes from "./server/routes/community.js";
import http from "http";
import compression from "compression";
import { Server } from "socket.io";
import os from "os";

// Configurations Middlewares
const app = express(); // Create an Express application
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Create Socket.io server
dotenv.config(); // Configure dotenv to use environment variables
connectDB(); // Connect to the database
app.use(cookieParser()); // Use cookie-parser
app.use(flash()); // Use connect-flash
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json()); // Parse JSON bodies
app.use(cors()); // Use cors
app.set('trust proxy', true) // Trust proxy
app.use(compression()); // Use compression
app.disable('x-powered-by');
app.use(helmet.hidePoweredBy());
app.set('etag', false);

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Set the view engine to ejs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatePath = path.join(__dirname, './views');
app.set('view engine', 'ejs');
app.set('views', templatePath);

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'public' directory
// app.use(express.static('public'));

// Handle favicon requests
app.get('/favicon.svg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.svg'));
});

// Add express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // use the SESSION_SECRET environment variable as the secret
  resave: false, 
  saveUninitialized: true, // always create a session
  cookie: { maxAge: 36000000 } // expire after 10 hours
}))

// Make flash messages available in all templates
app.use((req, res, next) => {
  res.locals.errorMessages = req.flash('error');
  res.locals.successMessages = req.flash('success');
  next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Middleware to parse "_method" query parameter
app.use(methodOverride('_method'));

// Socket.io connection
io.on('connection', (socket) => {
  // console.log('A user connected');
  socket.on('disconnect', () => {
    // console.log('A user disconnected');
  });
});

//Use Routes
// 
app.use(authRoutes); // Use authRoutes
// app.use(dashboardRoutes); // Use dashboardRoutes
// app.use(newMemberRoute); // Use newMemberRoute
// app.use(membersRoutes); // Use membersRoutes
app.use('/community', communityRoutes); // Use communityRoutes
// app.use(ipAddressRoutes); // Use ipAddressRoutes

// Set up the server to listen on port 8080 for production.
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// For development only
// const networkInterfaces = os.networkInterfaces(); // Get network interfaces
// server.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`Available on:`);
//   Object.keys(networkInterfaces).forEach((iface) => {
//     networkInterfaces[iface].forEach((alias) => {
//       if (alias.family === 'IPv4') {
//         console.log(`  http://${alias.address}:${PORT}`);
//       }
//     });
//   });
// });

export { io }; // Export io to use in other files
