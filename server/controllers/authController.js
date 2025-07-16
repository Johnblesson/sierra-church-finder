import express from 'express'; 
import mongoose from 'mongoose'; // Import mongoose to interact with MongoDB
import os from 'os';
const app = express();
import User from '../models/auth.js'; // Import the User model
import { body, validationResult } from 'express-validator'; // Import the express-validator functions
import bcrypt from 'bcrypt'; // For password hashing
import jwt from 'jsonwebtoken'; // For generating JWTs
import useragent from 'useragent'; // For device detection
import geoip from 'geoip-lite'; // For country detection
import axios from 'axios'; // For making HTTP requests
import IPAddress from "../models/ipaddress.js";
import { getName } from 'country-list'; // For getting full country names
import passport from '../passport/passport-config.js'; // Import the passport configuration
import { activeSessions } from '../passport/passport-config.js' // Import the activeSessions Set
// import { checkUserMessages } from '../controllers/contact.js' // Import the checkUserMessages 
// import { generateWelcomeMessage } from '../controllers/welcomeMessage.js'
import dotenv from 'dotenv'; // Environment variable library
dotenv.config();

// Sign Up Controller
export const signUp = async (req, res) => {
  const errors = validationResult(req);
  let errorMessages = [];

  req.session = req.session || {};

  // Create a session
  req.session.user = {
    isSignUp: true,
    isLogin: true,
  };


  if (!errors.isEmpty()) {
    errorMessages = errors.array().map(err => err.msg);
    return res.render('signup', { errorMessages });
  }

  if (!req.body.password || req.body.password.trim() === '') {
    errorMessages.push("Password is required.");
    return res.render("signup", { errorMessages });
  }
  

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      errorMessages.push('Username is already taken. Please choose another.');
      return res.render('signup', { errorMessages });
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    if (!passwordPattern.test(req.body.password)) {
      errorMessages.push('Password is weak. It must contain at least one uppercase letter, one lowercase letter, and be at least 6 characters long.');
      return res.render('signup', { errorMessages });
    }

    const userData = new User({
      fullname: req.body.fullname,
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      photo: req.body.photo,
      createdBy: req.body.createdBy,
      createdByRole: req.body.createdByRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await userData.save();
    res.redirect('/administration');
    console.log("Password received:", req.body.password);
  } catch (error) {
    console.error('Sign-Up Error:', error);
    errorMessages.push('An error occurred while signing up. Please try again later.');
    return res.render('signup', { errorMessages });
  }
};


// Google Oauth
export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleAuthCallback = passport.authenticate('google', {
  failureRedirect: '/login',
  successRedirect: '/'
});


// Login Controller
// export const logIn = (req, res, next) => {
//   passport.authenticate('local', async (err, user, info) => {
//     try {
//       if (err) {
//         return res.render('login', {
//           errorMessages: ['An error occurred during login. Please try again.'],
//         });
//       }

//       // Check if the user exists
//       if (!user) {
//         return res.render('login', {
//           errorMessages: [info.message || 'User does not exist.'],
//         });
//       }

//       // Check if the user is active
//       if (user.status !== 'active') {
//         return res.render('login', {
//           errorMessages: ['Forbidden: User status is inactive.'],
//         });
//       }

//       // Log the user in
//       req.login(user, async (loginErr) => {
//         if (loginErr) {
//           return res.render('login', {
//             errorMessages: ['Login failed. Please try again.'],
//           });
//         }

//         // Get the user's IP address, device, and country
//         const ip = req.ip;
//         const agent = useragent.parse(req.headers['user-agent']);
//         const country = geoip.lookup(ip)?.country || 'Unknown';

//         // Update the user's last login details
//         await User.findByIdAndUpdate(user._id, {
//           $set: {
//             lastLoginIP: ip,
//             lastLoginDevice: agent.toString(),
//             lastLoginCountry: country,
//           },
//           $push: {
//             loginHistory: { ip, device: agent.toString(), country },
//           },
//         });

//         // Generate a JWT token
//         const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
//         delete user.password;
//         req.session.user = user;

//         if (user.twoFactorEnabled) {
//           return res.redirect('/2fa-verify');
//         }

//         // Check if the user has messages
//         // const hasMessages = await checkUserMessages(user._id);
//         let redirectUrl = user.role === 'admin' ? `/admin-home?token=${token}` : `/home?token=${token}`;

//         // Redirect with an alert if there are messages
//         // if (hasMessages) {
//         //   redirectUrl += '&alert=You have new messages';
//         // }

//         return res.redirect(redirectUrl);
//       });
//     } catch (catchErr) {
//       console.error('Login Error:', catchErr);
//       return res.render('login', {
//         errorMessages: ['An internal server error occurred. Please try again later.'],
//       });
//     }
//   })(req, res, next);
// };


export const logIn = (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) {
        return res.render('login', {
          errorMessages: ['An error occurred during login. Please try again.'],
        });
      }

      if (!user) {
        return res.render('login', {
          errorMessages: [info.message || 'User does not exist.'],
        });
      }

      if (user.status !== 'active') {
        return res.render('login', {
          errorMessages: ['Forbidden: User status is inactive.'],
        });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.render('login', {
            errorMessages: ['Login failed. Please try again.'],
          });
        }

        const ip = req.ip;
        const agent = useragent.parse(req.headers['user-agent']);
        const country = geoip.lookup(ip)?.country || 'Unknown';

        await User.findByIdAndUpdate(user._id, {
          $set: {
            lastLoginIP: ip,
            lastLoginDevice: agent.toString(),
            lastLoginCountry: country,
          },
          $push: {
            loginHistory: { ip, device: agent.toString(), country },
          },
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        delete user.password;
        req.session.user = user;

        // Determine redirect destination
        let redirectUrl;
        if (user.twoFactorEnabled) {
          redirectUrl = '/2fa-verify';
        } else {
          redirectUrl = user.role === 'admin' ? `/admin-home?token=${token}` : `/home?token=${token}`;
        }

        // Render welcome page and redirect after 5 seconds
        return res.render('welcome', {
          user,
          redirectUrl
        });
      });
    } catch (catchErr) {
      console.error('Login Error:', catchErr);
      return res.render('login', {
        errorMessages: ['An internal server error occurred. Please try again later.'],
      });
    }
  })(req, res, next);
};



// Active session
export const activeUserSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

    // Fetch active user sessions
    // Assuming `activeSessions` is an array of user IDs representing active sessions
    const activeSessionUserIds = Array.from(activeSessions); // Convert the Set to an array

    // Paginate the active sessions
    const users = await User.find({ '_id': { $in: activeSessionUserIds } })
                            .skip(skip)
                            .limit(limit);

    // Count the total number of active sessions
    const totalEntries = await User.countDocuments({ '_id': { $in: activeSessionUserIds } });

    const totalPages = Math.ceil(totalEntries / limit);

    // Render the active-sessions view with the paginated user data
    res.render('active-sessions', { data: users, currentPage: page, totalPages: totalPages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// // Render the login page
// export const getLoginPage = async (req, res) => {
//   // Get client IP address
//   const getClientIp = () => 
//     req.headers['cf-connecting-ip'] ||  // For Cloudflare
//     req.headers['x-forwarded-for']?.split(',')[0] ||  // For proxies
//     req.connection.remoteAddress ||
//     req.socket.remoteAddress || '';

//   const ip = getClientIp();
//   const timestamp = new Date().toISOString();
//   console.log('IP address:', ip, '/login-page', timestamp);

//   // Don't log localhost IPs
//   // if (ip === '127.0.0.1' || ip === '::1') {
//   //   console.log('Localhost IP detected, skipping logging.');
//   //   return res.render('/');
//   // }

//   const API_KEY = 'dc750824f1d744'; // IPinfo API key

//   try {
//     // Fetch location data from IPinfo API
//     const geoData = await axios.get(`https://ipinfo.io/${ip}?token=${API_KEY}`);
//     const {
//       country: countryCode = 'Unknown',
//       city = 'Unknown',
//       region = 'Unknown',
//       postal = 'Unknown',
//       loc = 'Unknown',  // Latitude, Longitude
//       org = 'Unknown',
//       timezone = 'Unknown',
//       hostname = 'Unknown'
//     } = geoData.data;

//     // Get full country name
//     const countryName = getName(countryCode) || 'Unknown';

//     // console.log('IP Information:', {
//     //   Country: countryCode,
//     //   CountryName: countryName,
//     //   City: city,
//     //   Region: region,
//     //   Postal: postal,
//     //   Loc: loc,
//     //   Org: org,
//     //   Timezone: timezone,
//     //   Hostname: hostname
//     // });

//     // Check if IP has been logged within the last 24 hours
//     const oneDayAgo = new Date();
//     oneDayAgo.setDate(oneDayAgo.getDate() - 1);

//     const existingLog = await IPAddress.findOne({
//       ip,
//       timestamp: { $gte: oneDayAgo.toISOString() }
//     });

//     // Log IP if not logged in the past 24 hours
//     if (!existingLog) {
//       await IPAddress.create({
//         ip,
//         country: countryCode,
//         countryName,
//         city,
//         region,
//         postal,
//         loc,
//         org,
//         timezone,
//         timestamp,
//         hostname
//       });
//       console.log('IP and location logged:', { ip, countryName, city });
//     } else {
//       console.log('IP already logged within the last 24 hours:', ip);
//     }

//   // Get error messages from flash
//   const errorMessages = req.flash('error');

//   res.render('login', { errorMessages });
// } catch (error) {
//   console.error('Error rendering the page:', error);
//   res.status(500).send('Internal Server Error');
// }
// };


// Render the signup page
export const getSignUpPage = (req, res) => {
  const ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress || '';

  const timestamp = new Date().toISOString();
  console.log('IP address:', ip, '/signup', timestamp);

  // Emit signup page access to all connected clients (if needed)
  req.io.emit('signup-page-visited', {
    ip,
    timestamp,
    route: '/signup'
  });

  // Check if the user is authenticated
  const user = req.isAuthenticated() ? req.user : null;

  // Get error messages from flash
  const errorMessages = req.flash('error');

  res.render('signup', { errorMessages, user });
};




// Render the login page
export const getLoginPage = (req, res) => {
  const ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress || '';

  const timestamp = new Date().toISOString();
  console.log('IP address:', ip, '/login', timestamp);

  // Emit login page access to all connected clients (if needed)
  req.io.emit('login-page-visited', {
    ip,
    timestamp,
    route: '/login'
  });

  // Check if the user is authenticated
  const user = req.isAuthenticated() ? req.user : null;

  // Get error messages from flash
  const errorMessages = req.flash('error');

  res.render('login', { errorMessages, user });
};


// Controller to render the login history page
export const loginHistory = async (req, res) => {
  try {
    // Retrieve the user from the session
    // const user = req.session.user;
    const user = req.isAuthenticated() ? req.user : (req.session ? req.session.user : null);
    
    if (!user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    // Fetch the user data from the database to ensure we have the latest login history
    const currentUser = await User.findById(user._id).select('loginHistory lastLoginIP lastLoginDevice lastLoginCountry');

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }
        const role = user ? user.role : null;
        const sudo = user && user.sudo ? user.sudo : false;
        const accountant = user && user.accountant ? user.accountant : false;
        const manager = user && user.manager ? user.manager : false;
        const isAdmin = role === 'admin'; // Define isAdmin based on the role

    // Render the login-history view with the user's login history and last login info
    res.render('login-history', {
      user: {
        lastLoginIP: currentUser.lastLoginIP,
        lastLoginDevice: currentUser.lastLoginDevice,
        lastLoginCountry: currentUser.lastLoginCountry,
        loginHistory: currentUser.loginHistory
      }, accountant, sudo, manager, isAdmin, role, user, alert: req.query.alert, // Pass the alert message to the view
    });
  } catch (error) {
    console.error('Error rendering login history page:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};

// Remove login history item
export const removeLoginHistory = async (req, res) => {
  try {
    const { id } = req.params; // Get the history item ID from the URL
    const userId = req.session.user._id; // Get the user's ID from the session

    // Fetch the user from the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    // Remove the login history item
    user.loginHistory = user.loginHistory.filter(history => history._id.toString() !== id);
    await user.save(); // Save the updated user document

    res.redirect('/login-history'); // Redirect to the login history page
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Controller to clear all login history
export const clearLoginHistory = async (req, res) => {
  try {
    // Retrieve the user from the session or request object (based on your authentication setup)
    const user = req.isAuthenticated() ? req.user : (req.session ? req.session.user : null);
    
    if (!user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    // Fetch the user data from the database to ensure we have the latest data
    const currentUser = await User.findById(user._id);

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Clear the login history
    currentUser.loginHistory = [];
    await currentUser.save(); // Save the updated user document

    // Optionally, you can pass a success message to the query string for feedback in the UI
    res.redirect('/login-history?alert=Login history cleared successfully');
  } catch (error) {
    console.error('Error clearing login history:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};


// Get All Users Controller
export const getAllUsers = async (req, res) => {

  const locals = {
    title: "All Users",
    description: "This is the all users page.",
  };

  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

    // Fetch all storage data
    const totalEntries = await User.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);
    const user = req.isAuthenticated() ? req.user : null;

    // Fetch all users from the database
    const users = await User.aggregate([
      { $project: { password: 0 } },
      // Stage 2: Skip and limit
      { $skip: skip },
      { $limit: limit }
  ]);
  
    res.render('all-users', { 
      data: users, 
      locals,
      user,
      // greeting,
      currentPage: page, 
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching users.');
  }
};


// Get All Users Controller
export const OnlyUsers = async (req, res) => {

  const locals = {
    title: "All Users",
    description: "This is the all users page.",
  };

  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

   // Count total number of users
    const totalEntries = await User.countDocuments({ role: 'user' });

    const totalPages = Math.ceil(totalEntries / limit);

    const user = req.isAuthenticated() ? req.user : null;

     // Fetch all users with role 'agent' from the database excluding the password field
     const users = await User.aggregate([
      { $match: { role: 'user' } },
      { $project: { password: 0 } },
      { $skip: skip },
      { $limit: limit }
    ]);
  
    res.render('all-users', { 
      data: users, 
      locals,
      user,
      currentPage: page, 
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching users.');
  }
};

// Get All Users Controller
export const onlyAdmins = async (req, res) => {

  const locals = {
    title: "All Users",
    description: "This is the all users page.",
  };

  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

    // Count total number of admins
    const totalEntries = await User.countDocuments({ role: 'admin'});

    const totalPages = Math.ceil(totalEntries / limit);

    const user = req.isAuthenticated() ? req.user : null;

      // Fetch all users with role 'agent' from the database excluding the password field
      const users = await User.aggregate([
        { $match: { role: 'admin' } },
        { $project: { password: 0 } },
        { $skip: skip },
        { $limit: limit } 
      ]);
  
    res.render('all-users', { 
      data: users, 
      locals,
      user,
      currentPage: page, 
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching users.');
  }
};
  


// Get All Users Controller
export const allAdminUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

    // Count total number of users
    const totalEntries = await User.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);
    const user = req.isAuthenticated() ? req.user : null;

    // Fetch all users from the database
    const users = await User.aggregate([
      // Stage 1: Exclude password field from the response
      { $project: { password: 0 } },
      // Stage 2: Skip and limit
      { $skip: skip },
      { $limit: limit }
  ]);
  
    res.render('all-users-sudo', { 
      data: users, 
      user,
      currentPage: page, 
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching users.');
  }
};

// Only role === user


// Only role === admin


// Only role === agent


// Get
export const edituser = async (req, res) => {
  const locals = {
    title: "Edit user",
    description: "This is the edit user page.",
  };

  try {
    const users = await User.findOne({ _id: req.params.id });

    const user = req.isAuthenticated() ? req.user : null;

    // Fetch user data from the session or request object (assuming req.user is set by the authentication middleware)
    const sudo = user && user.sudo ? user.sudo : false;
    const overseer = user && user.overseer ? user.overseer : false; 
    const accountant = user && user.accountant ? user.accountant : false;

    res.render("edit-user", {
      locals,
      users,
      user,
      sudo,
      overseer,
      accountant,
      alert: req.query.alert, // Pass the alert message
    });
  } catch (error) {
    // Handle errors gracefully
    console.error(error.message);
    res.status(404).send("User not found");
  }
};

// Update user data #Sudo Admin
export const updateUser = async (req, res) => {
  try {
    // Extract the User ID from the request parameters
    const { id } = req.params;

    // Find the User record by ID and update its fields
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });

    // Check if the User record exists
    if (!updatedUser) {
      return res.status(404).json({ message: 'User record not found' });
    }

    // Respond with the updated User record
    // res.status(200).json(updatedStorage);
    res.render('success/users');
  } catch (error) {
    console.error('Error updating User record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete user data
export const deleteUser = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.params.id });
    res.render("success/delete-user");
  } catch (error) {
    console.log(error);
  }
};


// View Edit password GET REQUEST Admin
export const viewChangePwdPage = async (req, res) => {
  try {
    const users = await User.findOne({ _id: req.params.id });

    // Check if the user exists
    if (!users) {
      return res.status(404).send('User not found');
  }

  // Access the role from the retrieved user data
  const role = users.role;

  const user = req.isAuthenticated() ? req.user : null;

  // Fetch user data from the session or request object (assuming req.user is set by the authentication middleware)
  const sudo = user && user.sudo ? user.sudo : false;
  const accountant = user && user.accountant ? user.accountant : false;
  const manager = user && user.manager ? user.manager : false;

    // Check the role and render the appropriate page
    if (role === 'admin') {
      // Render the admin update password page
      res.render('update-password', {
          users,
          user,
          sudo,
          accountant,
          manager,
          role
      });
  } else if (role === 'user') {
      // Render the user update password page
      res.render('update-password-user', {
          users, 
          user,
          role
      });
  } else {
      // Handle other roles or unauthorized access
      res.status(403).send('Unauthorized');
  }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
}
};


// Change Password Controller
export const changePassword = async (req, res) => {
  try {
    const { userId, username, email, oldPassword, newPassword } = req.body;

    let user;

    // Check if userId is provided
    if (userId) {
      // Find the user by userId
      user = await User.findById(userId);
    } else {
      // If userId is not provided, check by username or email
      user = await User.findOne({ $or: [{ username }, { email }] });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the old password matches the user's current password
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    // Validate the new password format
    if (!/^(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long and contain both uppercase and lowercase letters.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // res.status(200).json({ message: 'Password changed successfully' });
    res.render('success/password');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while changing password.');
  }
};


// View Edit password GET REQUEST Admin
export const settings = async (req, res) => {

  // Function to determine the time of the day
  const getTimeOfDay = () => {
    const currentHour = new Date().getHours();
  
    if (currentHour >= 5 && currentHour < 12) {
      return 'Good Morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };
    try {
    const user = req.isAuthenticated() ? req.user : null;

    const role = user ? user.role : null; // Get user role if user is authenticated
  
    // Fetch user data from the session or request object (assuming req.user is set by the authentication middleware)
    const sudo = user && user.sudo ? user.sudo : false;
    const accountant = user && user.accountant ? user.accountant : false;
    const manager = user && user.manager ? user.manager : false;

    // Fetch the user data from the database
    const users = await User.findOne({ _id: req.params.id });

    // Check if the user exists
    const isAdmin = role === 'admin'; // Define isAdmin based on the role
  
    // Determine the time of the day
    const greeting = getTimeOfDay();  
        // Render the admin update password page
        res.render('settings', {
            greeting,
            user,
            role,
            sudo,
            accountant,
            manager,
            users,
            isAdmin, // Pass isAdmin to the template
            alert: req.query.alert, // Pass the alert message
        });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
  };



// Get sudo only Page Controller 404
export const getSudoOnly = (req, res) => {
  const ip =
    req.headers['cf-conneting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress || '';

  const timestamp = new Date().toISOString();
  console.log('ip address:', ip, 'attempt accessing the sudo-only route', timestamp);
  res.render('404-sudo', {
  });
};

// View Edit password GET REQUEST Admin
export const adminSettings = async (req, res) => {

  // Function to determine the time of the day
  const getTimeOfDay = () => {
    const currentHour = new Date().getHours();
  
    if (currentHour >= 5 && currentHour < 12) {
      return 'Good Morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };
    try {
    const user = req.isAuthenticated() ? req.user : null;

    const role = user ? user.role : null; // Get user role if user is authenticated
  
    // Fetch user data from the session or request object (assuming req.user is set by the authentication middleware)
    const sudo = user && user.sudo ? user.sudo : false;
    const accountant = user && user.accountant ? user.accountant : false;
    const manager = user && user.manager ? user.manager : false;

    // Fetch the user data from the database
    const users = await User.findOne({ _id: req.params.id });
  
    // Determine the time of the day
    const greeting = getTimeOfDay();  
        // Render the admin update password page
        res.render('settings-admin', {
            greeting,
            user,
            role,
            sudo,
            accountant,
            manager,
            users,
            alert: req.query.alert, // Pass the alert message
        });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
  };

// Get sudo only Page Controller
export const getAdminOnly = (req, res) => {
  const ip =
    req.headers['cf-conneting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress || '';

  const timestamp = new Date().toISOString();
  console.log('ip address:', ip, 'attempt accessing the admin-only route', timestamp);
  res.render('404-admin', {
  });
};


// Get sudo only Page Controller
export const getFarmerOnly = (req, res) => {
  const ip =
    req.headers['cf-conneting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress || '';

  const timestamp = new Date().toISOString();
  console.log('ip address:', ip, 'attempt accessing the admin-only route', timestamp);
  res.render('404-farmer', {
  });
};


// Go back function
export const goBack = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role === 'admin') {
      res.redirect('/admin-home');
    } else {
      res.redirect('/home');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while going back.');
  }
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;
      await User.findByIdAndDelete(userId);
      req.logout(); // Log the user out after deletion
      res.redirect('/'); // Redirect to homepage or another appropriate page
  } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
  }
};




export const getUpdateProfile = async (req, res) => {
  // Function to determine the time of the day
  const getTimeOfDay = () => {
    const currentHour = new Date().getHours();

    if (currentHour >= 5 && currentHour < 12) {
      return 'Good Morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new Error(`Invalid user ID: ${req.params.id}`);
    }

    const users = await User.findOne({ _id: req.params.id });
    const user = req.isAuthenticated() ? req.user : null;
    const role = user ? user.role : null; // Get user role if user is authenticated

    // Fetch user role details
    const sudo = user && user.sudo ? user.sudo : false;
    const accountant = user && user.accountant ? user.accountant : false;
    const manager = user && user.manager ? user.manager : false;

    // Determine the time of the day
    const greeting = getTimeOfDay();

    res.render('update-profile', {
      users,
      greeting,
      user,
      sudo,
      accountant,
      manager,
      role,
      alert: req.query.alert, // Pass the alert message
    });
  } catch (error) {
    console.error('Error rendering the page:', error);
    res.status(500).send('Internal Server Error');
  }
};


  // Update user data #Sudo Admin
  export const updateProfile = async (req, res) => {
    try {
      // Extract the User ID from the request parameters
      const { id } = req.params;
  
      // Find the User record by ID and update its fields
      const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
  
      // Check if the User record exists
      if (!updatedUser) {
        return res.status(404).json({ message: 'User record not found' });
      }
  
      // Respond with the updated User record
      res.render('success/update-profile', { users: updatedUser }); // Pass the updated user data to the template
    } catch (error) {
      console.error('Error updating User record:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  // // Get system performance metrics
  // // This function retrieves system performance metrics such as memory usage, CPU usage, and uptime.
  // // It sends the metrics as a JSON response.
  // // This can be useful for monitoring the health of the application.
  // export const systemperformance = (req, res) => {
  //   const memoryUsage = process.memoryUsage();
  //   const cpuUsage = process.cpuUsage();
  //   const processUptime = process.uptime();
  //   const systemUptime = os.uptime();
  //   const loadAverage = os.loadavg();
  //   const freeMemory = os.freemem();
  //   const totalMemory = os.totalmem();
  //   const cpus = os.cpus();
  //   const platform = os.platform();
  //   const arch = os.arch();

  //   const user = req.isAuthenticated() ? req.user : null;
  //   const role = user ? user.role : null; 
  //   const sudo = user && user.sudo ? user.sudo : false;
  //   // const accountant = user && user.accountant ? user.accountant : false;
  //   // const manager = user && user.manager ? user.manager : false;

  //   res.render('performance', {
  //     memoryUsage,
  //     cpuUsage,
  //     processUptime,
  //     systemUptime,
  //     loadAverage,
  //     freeMemory,
  //     totalMemory,
  //     cpus,
  //     platform,
  //     arch,
  //     user,
  //     sudo,
  //     role,
  //   });
  // };


import si from 'systeminformation';

export const systemperformance = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();        // Node.js process memory
    const cpuUsage = process.cpuUsage();              // Node.js CPU usage
    const processUptime = process.uptime();           // Uptime of current process
    const systemUptime = os.uptime();                 // Uptime of the system
    const loadAverage = os.loadavg();                 // System load averages
    const freeMemory = os.freemem();                  // Free system memory
    const totalMemory = os.totalmem();                // Total system memory
    const cpus = os.cpus();                           // Detailed CPU core info
    const platform = os.platform();                   // OS platform
    const arch = os.arch();                           // System architecture

    // System Information package
    const currentLoad = await si.currentLoad();
    const cpu = await si.cpu();
    const mem = await si.mem();
    const disk = await si.fsSize();
    const networkStats = await si.networkStats();

      // Convert CPU usage to seconds
      const cpuUsageInSeconds = {
        user: (cpuUsage.user / 1000000).toFixed(2), // Convert microseconds to seconds
        system: (cpuUsage.system / 1000000).toFixed(2) // Convert microseconds to seconds
      };

    // Authentication info
    const user = req.isAuthenticated?.() ? req.user : null;
    const role = user?.role || null;
    const sudo = user?.sudo || false;

    res.render('performance', {
      memoryUsage,
      cpuUsageInSeconds,
      processUptime,
      systemUptime,
      loadAverage,
      freeMemory,
      totalMemory,
      cpus,
      platform,
      arch,
      currentLoad,
      cpu,
      mem,
      disk,
      networkStats,
      user,
      role,
      sudo
    });
  } catch (err) {
    console.error('System performance error:', err);
    res.status(500).send('Error retrieving system performance data.');
  }
};



// Get system performance metrics for server
export const nodesystemperformance= async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const processUptime = process.uptime();
    const systemUptime = os.uptime();
    const loadAverage = os.loadavg();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const cpus = os.cpus();
    const platform = os.platform();
    const arch = os.arch();
    const currentLoad = await si.currentLoad();

    // Convert CPU usage to seconds
    const cpuUsageInSeconds = {
      user: (cpuUsage.user / 1000000).toFixed(2), // Convert microseconds to seconds
      system: (cpuUsage.system / 1000000).toFixed(2) // Convert microseconds to seconds
    };

    const user = req.isAuthenticated() ? req.user : null;
    const role = user ? user.role : null;
    const sudo = user && user.sudo ? user.sudo : false;

    res.render('server-performance', {
      memoryUsage,
      cpuUsageInSeconds,
      processUptime,
      systemUptime,
      loadAverage,
      freeMemory,
      totalMemory,
      cpus,
      platform,
      arch,
      currentLoad,
      user,
      sudo,
      role,
    });
  } catch (err) {
    console.error('System performance error:', err);
    res.status(500).send('Error retrieving system performance data.');
  }
};
