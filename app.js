require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const Passenger = require('./models/passenger.js');
const Driver = require('./models/driver.js');
const z = require('zod');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const axios = require('axios');



const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'ejs');
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
app.use(express.static('public'))

console.log({ TOMTOM_API_KEY });


app.get('/', (req, res) => {
    res.render('home.ejs');
});

const PassengerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    dob: z.string().date(),
    address: z.string(),
    password: z.string().min(6),
    cpass: z.string().min(6),
    phone: z.string().length(10),
});
app.get('/signuppage', (req, res) => {
    res.render('signuppage.ejs')
});

app.get('/passengerreg', (req, res) => {
    res.render('passengerreg.ejs', { body: {}, errors: [] })
});


app.post('/passengerreg', async (req, res) => {
    try {

        console.log(req.body);

        const { password, cpass } = req.body

        const check = await Passenger.find({ phone: req.body.phone })

        if (check.length > 0) { throw { message: 'user already exsists.', type: 'user_exsits' } }

        console.log({ check });


        if (password !== cpass) throw { message: 'Password and confirm password must be same.', type: 'pass_miss_match' }

        const isValidData = PassengerSchema.parse(req.body);

        const passenger = await Passenger.create(req.body);

        console.log(1111, passenger);


        res.render('login.ejs', { body: {}, errors: [] });
        // res.status(200).json(passenger);

    } catch (error) {
        let errors = {}

        if (error instanceof z.ZodError) {
            error.issues.forEach(({ path, message }) => {
                const name = path[0];

                errors[name] = message

            });

            return res.render('passengerreg.ejs', { body: req.body, errors })
        }

        if (error.type === 'pass_miss_match') {
            errors.password = error.message;
            errors.cpass = error.message;
        }

        if (error.type === 'user_exsits') {
            errors.phone = error.message;

        }

        console.log(error)

        res.render('passengerreg.ejs', { body: req.body, errors })

    }
});


app.get('/login', (req, res) => {
    res.render('login.ejs', { body: {}, errors: {} });
});

app.post('/passenger/login', async (req, res) => {
    try {
        const check = await Passenger.find({ phone: req.body.phone, password: req.body.password })

        //  console.log({check});

        if (check.length === 0) {
            throw { message: 'userphone and password mismatched', type: 'match' }
        }
        else if (check == "") {
            res.send("userphone or password is empty");
        }


        else {
            // console.log(6666);
            const token = jwt.sign({ id: Passenger._id }, 'yourSecretKey', { expiresIn: '24h' });
            res.cookie('authToken', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
            // res.send('Login successful and cookie has been set');
            res.render('location.ejs', { body: {}, TOMTOM_API_KEY: TOMTOM_API_KEY });

        }
    }
    catch (err) {
        console.log(req.body);
        let errors = {}
        {
            console.log(err);

            // res.send('Credentials not found');
        }
        if (err.type === 'match') {
            errors.phone = err.message;
            errors.password = err.message
        }
        console.log(errors)

        res.render('login.ejs', { body: req.body, errors })


    }

});

app.get('/location', (req, res) => {
    res.render('location.ejs', { body: {}, TOMTOM_API_KEY });
});

app.post('/location', async (req, res) => {
    console.log(11);
    res.render('location.ejs', { body: req.body, TOMTOM_API_KEY: TOMTOM_API_KEY });

})











































const DriverSchema = z.object({
    name: z
        .string({ required_error: "name atleast 8 characters" })
        .min(8).max(16)
        .trim(),
    email: z
        .string({ required_error: "email should not be empty" })
        .trim()
        .email(),
    dob: z.string().date(),
    password: z.string().min(6).max(6),
    cpass: z.string().min(6),
    license: z.string().length(8),
    image: z.string(),
    exp: z.string().min(1).max(2),
    phone: z.string().length(10)
});


app.get('/driverreg', (req, res) => {
    res.render('driverreg.ejs', { body: {}, errors: {} })
});





app.post('/driverreg', async (req, res) => {
    try {

        console.log(req.body);

        // const password = req.body.password;
        const { password, cpass } = req.body

        if (password !== cpass) throw { message: 'Password and confirm password must me equal.', type: 'pass_miss_match' }

        const isValidData = DriverSchema.parse(req.body);

        const driver = await Driver.create(req.body);

        // res.status(200).json(driver);
        res.render('login.ejs', { body: {}, errors: [] });


    } catch (error) {

        let errors = {}

        if (error instanceof z.ZodError) {
            error.issues.forEach(({ path, message }) => {
                const name = path[0];

                errors[name] = message

            });
        }

        if (error.type === 'pass_miss_match') {
            errors.password = error.message;
            errors.cpass = error.message;
        }

        console.log(error, errors)

        res.render('driverreg.ejs', { body: req.body, errors })



        //  res.status(500).json({ message: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        console.log(1111);

        const check = await driver.find({ phone: req.body.phone })

        const pass = await driver.find({ phone: req.body.password })

        console.log({
            check,
            pass
        });

        if (!check && !pass) {
            console.log(11);
            res.send("invalid credentials");
        }

        else {

            res.cookie('authToken', 'yourAuthTokenHere', { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });

            res.send('Login successful and cookie has been set');
        }



        app.get('/protected', (req, res) => {
            const authToken = req.cookies.authToken;
            if (authToken) {
                res.send('You have access to this protected route');
            } else {
                res.status(403).send('You are not authorized to access this route');
            }
        });

        //res.render('#');

    }





    catch (err) {

        console.log(err);
        res.send('credientials not found');

    }

});


mongoose.connect("mongodb://localhost:27017/uberclone")
    .then(() => {
        console.log("connected to db");
        app.listen(process?.env?.PORT ?? 8080, () => {
            console.log("server is running");
        });
    })
    .catch(() => {
        console.log("connection failed");
    });





