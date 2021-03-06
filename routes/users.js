const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
// Load input validation
const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");
// Load Models
const User = require("../models/User");
const Session = require("../models/Session");


// Set Up API Auth Routes

// @route POST api/users/register
// @desc Register user
// @access Public
router.post("/register", (req, res) => {
    // Form validation
    const { errors, isValid } = validateRegisterInput(req.body);
    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    User.findOne({where: {email: req.body.email} }).then(user => {
        if (user) {
            return res.status(400).json({ email: "Email already exists" });
        } else {
            const newUser = new User({
                email: req.body.email,
                password: req.body.password
            });
            // Hash password before saving in database
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser.save()
                    .then(user => res.json(user))
                    .catch(err => console.log(err));
                });
            });
        }
    });
});


// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
    // Form validation
    const { errors, isValid } = validateLoginInput(req.body);
    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    // Find user by email
    User.findOne({where: {email: email} }).then(user => {
        // Check if user exists
        if (!user) {
            return res.status(404).json({ emailnotfound: "Email not found" });
        }
        // Check password
        bcrypt.compare(password, user.password).then(isMatch => {
            if (isMatch) {
                // User matched
                // Create JWT Payload
                const payload = {
                    id: user.id,
                    name: user.name
                };
                // Sign token
                jwt.sign(
                    payload,
                    keys.secretOrKey,
                    {
                        expiresIn: 86400 // 1 year in seconds
                    },
                    (err, token) => {
                        // create session if token gets signed
                        const date = new Date();
                        date.setDate(date.getDate() + 1);
                        const validImg = user.image != null && user.image.length > 0 ? user.image : '';
                        const addSession = new Session({
                            createdAt: new Date(),
                            useragent: req.headers['user-agent'],
                            email: email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            image: validImg,
                            whatTheme: user.whatTheme,
                            ip: req.connection.remoteAddress,
                            token: token,
                            valid: true,
                        });
                        addSession.save(function (err, session) {
                            if (err) return console.error(err);
                            console.log('session created');
                        });
                        res.json({
                            success: true,
                            token: "Bearer " + token,
                            theme: user.whatTheme
                        });
                    }
                );
            } else {
                return res
                    .status(400)
                    .json({ passwordincorrect: "Password incorrect" });
            }
        });
    });
});

// @route POST api/users/logout
// @desc log out user and invalidate session
// @access Private
router.post("/logout", (req, res) => {
    const id = req.headers.authorization.split('Bearer ')[1];
    Session.destroy({where: {token: id} }).then((err, result) => {
        if (err) {
            res.send(err);
        } else {
            res.send(result);
            console.log('removed session', result)
        }
    });
});

module.exports = router;