const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mysql = require('mysql');
const app = express();
const _ = require("lodash");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let username = '1';
let storeId = '1';
let donationId = 10;


// MySQL connection configuration
const connection = mysql.createConnection({
  host: 'localhost',  
  user: 'root', 
  password: 'niki@1234',  
  database: 'dbsproject' 
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL as id ' + connection.threadId);
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/",function(req,res){
  res.render("index");
});

app.get("/login", function (req, res) {
  try {
    res.render("login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/store", function (req, res) {
  try {
    res.render("store");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/signup", function (req, res) {
  try {
    res.render("signup");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/Profile", function (req, res) {
  try {
    res.render("Profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/store-item", function (req, res) {
  try {
    res.redirect("/notifications");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/get_manager_id', (req, res) => {
  username = req.body.username;
  const password = req.body.password;
  console.log(`Logged in as ${username}`);

  const sql = ` SELECT * FROM manager NATURAL JOIN store WHERE managerid = ?  `;
  connection.query(sql, [parseInt(username, 10)], (err, results) => {
    if (err) {
      throw err;
    }
    console.log('User details:', results);
    res.render('store', { stores: results });
  });
});


app.post('/store-item', (req, res) => {
  storeId = req.body.storeId;
  console.log(`Store ID: ${storeId}`);

  // Call the stored procedure
  const callProcedure = `CALL HighlightExpiringItems(?)`;
  connection.query(callProcedure, [parseInt(storeId, 10)], (callErr, callResults) => {
    if (callErr) {
      console.error('Error calling stored procedure:', callErr);
      return;
    }
    const fetchItems = `
      SELECT i.itemid, i.expiry_date, i.itemname, s.categoryid, i.highlight_status, i.price
      FROM items i
      JOIN storehas s ON i.categoryid = s.categoryid
      WHERE s.storeid = ?;
    `;

    connection.query(fetchItems, [parseInt(storeId, 10)], (err, results) => {
      if (err) {
        console.error('Error fetching items:', err);
        return;
      }

      const groupedItems = results.reduce((acc, item) => {
        const categoryId = item.categoryid;
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push(item);
        return acc;
      }, {});

      console.log('Grouped Items:', groupedItems);
      res.render('store-item', { groupedItems: groupedItems });
    });
  });
});


app.post('/apply-discount', (req, res) => {
  const itemid = parseInt(req.body.itemid, 10);
  const discount = parseInt(req.body.discount, 10);

  const applyDiscountProcedure = 'CALL ApplyDiscount(?, ?)';
  connection.query(applyDiscountProcedure, [itemid, discount], (err, results) => {
    if (err) {
      console.error('Error applying discount:', err);
      return res.status(500).send('Error applying discount');
    }
    res.redirect('/store-item');
  });
});

app.get('/notifications', (req, res) => {
  const getNotificationsProcedure = 'CALL GetNotifications()';
  connection.query(getNotificationsProcedure, (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).send('Error fetching notifications');
    }
    const notifications = results[0]; 
    console.log('Notifications:', notifications);
    res.render('notifications', { notifications: notifications });
  });
});


app.post('/donate', (req, res) => {
  const itemid = parseInt(req.body.itemid, 10); 
  const ngoid = parseInt(req.body.ngoid, 10);
  const managerid = parseInt(username, 10);
  const storeid = parseInt(storeId, 10);
  donationId = donationId + 1;
  const insertDonationProcedure = 'CALL InsertDonation(?, ?, ?, ?, ?)';
  connection.query(insertDonationProcedure, [ngoid, managerid, storeid, itemid, donationId], (err) => {
    if (err) {
      console.error('Error inserting donation:', err);
      return res.status(500).json({ error: 'Error inserting donation' });
    }
    console.log('Donation inserted successfully');
    res.redirect('notifications'); 
  });
});


app.get('/stats', (req, res) => {
  const getDonationStatsProcedure = 'CALL GetDonationStats()';
  connection.query(getDonationStatsProcedure, (err, results) => {
    if (err) {
      console.error('Error fetching donation stats:', err);
      return res.status(500).send('Error fetching donation stats');
    }
    const stats = results[0]; 
    console.log('Donation stats:', stats);
    res.render('stats', { stats: stats });
  });
});





