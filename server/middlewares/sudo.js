// Define middleware function
export const checkSudoMiddleware = (req, res, next) => {
    const { user } = req;
    // Check if sudo is true, allow access, otherwise forbid
    if (user && user.sudo === true) {
        next(); // Allow access
    } else {
        res.redirect('/sudo-only');
    }
};
