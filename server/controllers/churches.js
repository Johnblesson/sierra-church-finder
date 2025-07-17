import Churches from "../models/churches.js";
import { io } from '../../server.js'; // Import the io instance


// Get the add church form
export const addChurchesForm = async (req, res) => {  
    try {
      // Check if the user is authenticated
      const user = req.isAuthenticated() ? req.user : null;
  
      // Get user role if user is authenticated
      const role = user.role;
  
      // Fetch user data from the session or request object (assuming req.user is set by the authentication middleware)
      const sudo = user && user.sudo ? user.sudo : false;
  
      // Render the apply page with the necessary data
      res.render('add-church-form', {
        user,
        sudo,
        role,
        alert: req.query.alert, // Pass the alert message
      });
    } catch (error) {
      console.error('Error rendering the page:', error);
      res.status(500).send('Internal Server Error');
    }
  };


// Controller function to create a new churches
export const createChurch = async (req, res) => {
  try {
    // Extracting data from request body
    const { churchName, description, locationArea, phone, address, address2, createdBy, role, status, comments } = req.body;

    // Create a new churches object with form data
    const membershipForm = new Churches({
      	churchName,
	description,
	locationArea
        phone,
        address,
        address2,
        createdBy,
        role,
        status,
        comments,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    
    // Saving the churches to the database
    const savedChurch = await membershipForm.save();

    // Sending a success response
    res.status(201).render('success/church-added')
    console.log(savedChurch);
  } catch (error) {
    // Sending an error response
    res.status(400).json({ error: error.message });
  }
};



// Controller function to get all churches with pagination
export const getAllChurches = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;  // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 members per page

    // Calculate the number of items to skip (for pagination)
    const skip = (page - 1) * limit;

    // Fetch the churches for the current page, with limit and skip
    const members = await Churches.find().skip(skip).limit(limit);

    // Get the total count of members for pagination control
    const totalChurches = await Churches.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalChurches / limit);

    const user = req.isAuthenticated() ? req.user : null;
    const role = user ? user.role : null; // Get user role if user is authenticated

     // Fetch user data from the session or request object
     const sudo = user && user.sudo ? user.sudo : false;
     const churchesCount = await Churches.countDocuments(); // Get total churches count

    // Render the EJS template with the churches and pagination info
    res.render('all-churches', {
      members,
      membersCount,
      currentPage: page,
      totalPages,
      limit,
      sudo,
      user,
      role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


// Get edit a church
export const editChurch = async (req, res) => {
  try {
    const churches = await Churches.findById(req.params.id);
    if (!churches) {
      return res.status(404).send("Church not found");
    }

    const user = req.isAuthenticated() ? req.user : null;
    const sudo = user?.sudo || false;

    res.render("edit-church", {
      churches,
      user,
      sudo,
      alert: req.query.alert, // Pass the alert message
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};


// Delete church data
export const deleteChurch = async (req, res) => {
  try {
    await Churches.deleteOne({ _id: req.params.id });
    res.render("success/delete-church");
  } catch (error) {
    console.log(error);
  }
};



// Update Church record
export const updateChurch = async (req, res) => {
  try {
    const { id } = req.params; // Extract the ID of the record to be updated

    // Find the existing Church record by ID and update its fields
    const updatedChurch = await Churches.findByIdAndUpdate(id, req.body, { new: true });

    // Check if the Church record exists
    if (!updatedChurch) {
      return res.status(404).json({ message: 'Member record not found' });
    }

    // Respond with the updated church record
    res.status(200).render('success/update-church-record', { updatedChurch });
  } catch (error) {
    console.error('Error updating church record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




// Controller function to get all members with pagination
export const pastorate = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;  // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 members per page

    // Calculate the number of items to skip (for pagination)
    const skip = (page - 1) * limit;

    // Fetch the members for the current page, with limit and skip
    const members = await Membership.find({
      department: 'Pastorate'
    }).skip(skip).limit(limit);

    // Get the total count of members for pagination control
    const totalMembers = await Membership.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalMembers / limit);

    const user = req.isAuthenticated() ? req.user : null;
    const role = user ? user.role : null; // Get user role if user is authenticated

     // Fetch user data from the session or request object
     const sudo = user && user.sudo ? user.sudo : false;
     const accountant = user && user.accountant ? user.accountant : false;
     const overseer = user && user.overseer ? user.overseer : false;

    // Render the EJS template with the members and pagination info
    res.render('all-membership', {
      members,
      currentPage: page,
      totalPages,
      limit,
      sudo,
      accountant,
      overseer,
      user,
      role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};



// Get all Churches for adminonly
export const getAllChurchForAdminOnly = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the requested page number from the query parameter
    const limit = 15; // Number of entries per page
    const skip = (page - 1) * limit;

    // Fetch the total number of churches
    const totalEntries = await Churches.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);
    const user = req.isAuthenticated() ? req.user : null;

    // Fetch churches with pagination
    const churches = await Churches.aggregate([
      { $skip: skip },
      { $limit: limit }
    ]);

    // Render the view with the necessary data
    res.render('all-churches-admin-only', { 
      data: churches, 
      user,
      currentPage: page, 
      totalPages: totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching members.');
  }
};




// View church by id
export const viewChurch = async (req, res) => {
  try {
     const church = await Churches.findOne({ _id: req.params.id });

    if (!church) {
      return res.status(404).send("member not found");
    }
    res.render("view-church-details", {
      member,
    });
  } catch (error) {
    console.log(error);
  }
};




// to delete
// Convert visitin-member to member
export const convertToMembership = async (req, res) => {
  try {
    const newMemberId = req.params.id;
    const newMember = await NewMember.findById(newMemberId);

    if (!newMember) {
      return res.status(404).send("New member not found.");
    }

    // Build membership data from newMember
    const membershipData = {
      firstname: newMember.firstname,
      middlename: newMember.middlename,
      lastname: newMember.lastname,
      gender: newMember.gender,
      maritalstatus: newMember.maritalstatus || "single", // default if missing
      phone: newMember.phone,
      address: newMember.address,
      address2: newMember.address2,
      department: "",
      ministry: "",
      position: "",
      children: 0,
      createdBy: newMember.createdBy,
      role: newMember.role,
      status: "Active", // Set as active upon conversion
      comments: newMember.comments
    };

    // Save to Membership model
    const member = new Membership(membershipData);
    await member.save();

    // Update status of the original newMember (do NOT delete)
    newMember.status = "member";
    await newMember.save(); // Save updated status

    // Optional: delete the newMember record after conversion
    // await NewMember.findByIdAndDelete(newMemberId);

    res.redirect('/all-membership'); // redirect to members page (change as needed)
  } catch (err) {
    console.error("Conversion error:", err);
    res.status(500).send("Server error during conversion.");
  }
};
