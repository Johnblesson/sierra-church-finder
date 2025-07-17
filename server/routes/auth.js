import { Router } from "express";
const router = Router();

import 
{ 
    signUp, 
    logIn,
    getLoginPage,
    getSignUpPage,
    getAllUsers,
    onlyAdmins,
    edituser, 
    updateUser, 
    deleteUser, 
    viewChangePwdPage, 
    changePassword,  
    getSudoOnly,
    getAdminOnly,
    getFarmerOnly,
    goBack,
    deleteUserAccount,
    activeUserSessions,
    loginHistory,
    removeLoginHistory,
    clearLoginHistory,
    settings,
    adminSettings,
    getUpdateProfile,
    updateProfile,
    systemperformance,
    nodesystemperformance
}
from "../controllers/authController.js";

import { 
    setup2FA, 
    verify2FA,
    toggle2FA 
} 
from '../controllers/2FA.js'

import ensureAuthenticated from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { checkSudoMiddleware } from "../middlewares/sudo.js";
import cacheMiddleware from "../middlewares/cacheMiddleware.js"

//Auth Routes
// router.post("/signup", upload.single("photo"), signUp);
router.post("/signup", isAdmin, ensureAuthenticated, isAdmin, checkSudoMiddleware, signUp);
router.post("/login", logIn);
router.get("/", getLoginPage);
router.get("/signup", cacheMiddleware, ensureAuthenticated, isAdmin, checkSudoMiddleware, getSignUpPage);
router.get('/all-users', ensureAuthenticated, isAdmin, getAllUsers)
router.get('/all-admins', ensureAuthenticated, isAdmin, onlyAdmins)
router.get("/active-sessions", ensureAuthenticated, isAdmin, activeUserSessions)
router.get("/edit-user/:id", ensureAuthenticated, isAdmin, edituser);
router.patch("/edit-user/:id", ensureAuthenticated, isAdmin, updateUser)
router.delete("/delete-user/:id", ensureAuthenticated, isAdmin, deleteUser)
router.get("/delete-user/:id", ensureAuthenticated, isAdmin, deleteUser)
router.get("/update-password/:id", ensureAuthenticated, viewChangePwdPage)
router.patch("/update-password/:id", ensureAuthenticated, changePassword)

router.get('/update-profile/:id([0-9a-fA-F]{24})', ensureAuthenticated, getUpdateProfile);
router.patch('/update-profile/:id', ensureAuthenticated, isAdmin, updateProfile);

// Route to view user settings
router.get("/settings", ensureAuthenticated, cacheMiddleware, settings);
router.get("/admin-settings", ensureAuthenticated, cacheMiddleware, adminSettings);

// sys performance
router.get('/system-performance', cacheMiddleware, ensureAuthenticated, isAdmin, checkSudoMiddleware, systemperformance)
router.get('/server-system-performance', cacheMiddleware, ensureAuthenticated, isAdmin, checkSudoMiddleware, nodesystemperformance)

// Route to view login history
router.get('/login-history', ensureAuthenticated, loginHistory);

// Route to remove login history item
router.get('/remove-login-history/:id', ensureAuthenticated, removeLoginHistory);

// Route to clear login history
router.post('/clear-login-history', ensureAuthenticated, clearLoginHistory);

// Route to set up 2FA
router.get('/setup-2fa', ensureAuthenticated, setup2FA);

// Route to verify the 2FA token
router.post('/verify-2fa', ensureAuthenticated, verify2FA);

// Route to handle 2FA toggling
router.post('/2fa', ensureAuthenticated, toggle2FA);

// Route to render 2FA verification page
router.get('/2fa-verify', ensureAuthenticated, (req, res) => {
    const user = req.isAuthenticated() ? req.user : null;
    res.render('2fa-verify', { user });
})

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/'); 
});

// 404 Route
router.get('/forbidden', (req, res) => {
    res.render('404');
});

// About route
router.get('/about', (req, res) => {
    const user = req.isAuthenticated() ? req.user : null;
    res.render('about', { user });
});

// Sudo only
router.get("/sudo-only", getSudoOnly)
router.get("/admin-only", getAdminOnly)

// Route to handle goBack
router.get('/go-back', goBack)

export default router;
