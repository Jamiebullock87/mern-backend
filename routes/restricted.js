const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const passport = require("passport");
// Load input validation
const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");
// Load Models
const { User, Session, Client, Ticket }  = require("../models/index.js");

// Set Up API Restricted Routes

// @route GET api/restricted/authcheck
// @desc simple auth check to access dashboard
// @access Private
router.get("/authcheck", passport.authenticate('jwt', {session: false}), (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('dashboard retrieved session - restricted route');
            return res.sendStatus(200);
        }
    })
});

// @route POST api/restricted/getstats
// @desc fetch the data to populate the dashboard
// @access Private
router.post("/getstats", passport.authenticate('jwt', {session: false}), (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('dashboard data retrieved session - restricted route');

            Promise.all([
                User.findAndCountAll(),
                Session.findAndCountAll(),
            ]).then(results => {
                res.json({
                    numberOfUsers: results[0],
                    numberLoggedIn: results[1],
                })
            })
        }
    })
});

// @route POST api/restricted/getprofile
// @desc get the user profile and return the data
// @access Private
router.post("/getprofile", passport.authenticate('jwt', {session: false}), (req, res) => {
    console.log('reached restricted route');
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('getprofile session valid');
            User.findOne({where: {email: session.email} }).then((user) => {
                return res.json({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    image: user.image,
                    whatTheme: user.whatTheme
                });
            })
        }
    })
});

// @route POST api/restricted/saveprofile
// @desc find the user session, update it, then update the user profile
// @access Private
router.post("/saveprofile", passport.authenticate('jwt', {session: false}), (req, res) => {
    console.log('reached restricted route');
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;

    console.log(req.body.firstName);
    Session.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        image: req.body.image,
        whatTheme: req.body.whatTheme
    }, {returning: true, where: {token: token}})
    .then(([ rowsUpdated, [updatedData] ]) => {
        if (rowsUpdated) {
            console.log(rowsUpdated);
            console.log("Session was updated!");
        }
        console.log(updatedData.dataValues);
        User.update({
            firstName: updatedData.dataValues.firstName,
            lastName: updatedData.dataValues.lastName,
            image: updatedData.dataValues.image,
            whatTheme: updatedData.dataValues.whatTheme
        }, {returning: ['firstName', 'lastName', 'image', 'whatTheme'], where: {email: updatedData.dataValues.email}})
        .then(([ rowsUpdated, [updatedData] ]) => {
            if (rowsUpdated) {
                console.log("Profile was updated");
            }
            console.log(updatedData.dataValues);
            return res.json(updatedData.dataValues);
        });
    });     
});

// @route POST api/restricted/uploadimage
// @desc uploads the profile image and moves it to public directory.
// @access Private
router.post("/uploadimage", passport.authenticate('jwt', {session: false}), (req, res) => {
    console.log('reached restricted route');
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('uploadimage session valid');
            // TODO - save the image file in the user profile
            // TODO - add some security and validation - currently no checks on file type or anything
            User.findOne({where: {email: session.email} }).then((user) => {
                let imageFile = req.files.file;
                imageFile.mv(`/Users/jamieBullock/sites/Pied-Piper/front-end/public/${req.body.filename}.jpg`, function(err) {
                    return res.json({file: `/Users/jamieBullock/sites/Pied-Piper/front-end/public/${req.body.filename}.jpg`});
                })
            })
        }
    })
            
});

// @route POST api/restricted/getclients
// @desc get the list of clients and return the data
// @access Private
router.post("/getclients", passport.authenticate('jwt', {session: false}), (req, res) => {
    console.log('reached restricted route');
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        console.log(session);
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('getprofile session valid');
            Client.findAll().then((clients) => {
                console.log(clients);
                return res.json({
                    clients
                });
            })
        }
    })
});

// @route POST api/restricted/addclient
// @desc add the client to the database
// @access Private
router.post("/addclient", passport.authenticate('jwt', {session: false}), (req, res) => {
    console.log('reached restricted route');
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        console.log(session);
        if (ip === session.ip && ua == session.useragent && session.valid) {
            console.log('addclient session valid');
            Client.findOne({ where: {identifier: req.body.identifier} }).then(client => {
                if (client) {
                    return res.status(400).json({ identifier: "Identifier already exists" });
                } else {
                    const newClient = new Client({
                        identifier: req.body.identifier,
                        name: req.body.name,
                        telephone: req.body.telephone,
                        contact: req.body.contact,
                        directTelephone: req.body.directTelephone,
                        email: req.body.email,
                    });
                    newClient.save()
                    .then(client => res.json(client))
                    .catch(err => console.log(err));
                }
            });
        }
    })
});

// @route GET api/restricted/createticket
// @desc add the client to the database
// @access Private
router.post("/createticket", passport.authenticate('jwt', {session: false}), (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const ua = req.headers['user-agent'];
    const ip = req.connection.remoteAddress;
    Session.findOne({where: {token: token} }).then((session) => {
        if (ip === session.ip && ua == session.useragent && session.valid) {
            // Would send an email potentially, for now though, just return what would have been sent to the front end
            const msg = {
                to: req.body.to,
                from: 'jamiebullock1987@gmail.com',
                subject: req.body.subject,
                html: req.body.message,
            };
            
            // TODO -
            // Save to the database
            // Error handling

            // Return to say what would have been sent...
            return res.json({
                msg
            });

        }
    })
});

module.exports = router;