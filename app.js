require('dotenv').config()

const { GoogleGenerativeAI } = require('@google/generative-ai');

const WebSocket = require('ws');
const express = require('express');
const mongoose = require('mongoose');
const Passenger = require('./models/passenger.js');
const Drivers = require('./models/driver.js');
const Driverlatlng = require('./models/driverlatlng.js');
const Passengerlatlng = require('./models/passengerlatlng.js');
const z = require('zod');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const axios = require('axios');
const { Socket } = require('dgram');



const PORT = 3000;
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'ejs');
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.Gemini_API_KEY);

// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});



app.use(express.static('public'))

// console.log({ TOMTOM_API_KEY });
// console.log({ Gemini_API_KEY });


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


app.get('/products', (req, res) => {
    res.render('products.ejs')
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

        const check = await Passenger.find({ email: req.body.email })

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
            errors.email = error.message;

        }

        console.log(error)

        res.render('passengerreg.ejs', { body: req.body, errors })

    }
});

app.get('/login', (req, res) => {
    res.render('login.ejs', { body: {}, errors: {} });
});

app.post('/login', async (req, res) => {
    try {
        const check = await Passenger.find({ email: req.body.email, password: req.body.password })

        //  console.log({check});

        if (check.length === 0) {
            throw { message: 'useremail and password mismatched', type: 'match' }
        }
        else if (check == "") {
            res.send("useremail or password is empty");
        }


        else {

            console.log(6666);
            const token = jwt.sign({ id: Passenger._id }, 'yourSecretKey', { expiresIn: '24h' });
            // console.log(token);
            res.cookie('authToken', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
            // console.log('Set-Cookie: ', res.getHeader('Set-Cookie'));
            // res.send('Login successful and cookie has been set');
            res.render('riderlocation.ejs', { body: {}, TOMTOM_API_KEY: TOMTOM_API_KEY });

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
            errors.email = err.message;
            errors.password = err.message
        }
        console.log(errors)

        res.render('login.ejs', { body: req.body, errors })


    }

});
app.get('/riderlocation', (req, res) => {
    console.log("---->passenger location response");
    res.render('riderlocation.ejs', { body: {}, TOMTOM_API_KEY, findNearByDriver: "", cartypes: "" });
})
app.post('/riderlocation', async (req, res) => {
    // console.log("Request received at /rider");

    try {
        console.log("Request body:", req.body);

        const { lat, lon } = req.body;

        if (!lat || !lon) {
            throw new Error("Latitude and longitude are required");
        }

        const transform = {
            address: "Some default address",
            pickupCoordinates: {
                type: "Point",
                coordinates: [lon, lat]
            }
        };
        const passengerlatlng = await Passengerlatlng.create(transform);
        console.log("Passengerlatlng saved successfully:", passengerlatlng);


        let findNearByDriver = [];
        if (passengerlatlng) {
            console.log("--> is passenger");


            console.log(lat, lon, "--------------------------------------------------------------");
            findNearByDriver = await findNearByDriverHelper(lat, lon);

            // console.log(findNearByDriver,"-findNearByDriver");
            findNearByDriver.map((ans) => console.log(ans.pickupCoordinates.coordinates, "driver and passenger location."))
            console.log(findNearByDriver, "-findNearByDriver");

        }


        // res.render('location.ejs', { body: transform, TOMTOM_API_KEY: TOMTOM_API_KEY,findNearByDriver});
        let cartype = await getCartypes();
        console.log(cartype, "<><><><><><><><><><><><><>");
        res.send({ findNearByDriver, cartype });
    } catch (err) {
        console.error("Error processing request:", err);

        let errors = {};
        if (err.type === 'match') {
            errors.pickupCoordinates = err.message;
        } else {
            errors.general = err.message;
        }

        res.render('login.ejs', { body: req.body, errors });
    }
});

async function findNearByDriverHelper(lat, lon) {
    try {

        if (!lat || !lon) throw new Error("unable to get nearby driver detail.")

        let findNearByDriver = [];
        const minLongitude = lon - 0.5;
        const maxLongitude = lon + 0.5;
        const minLatitude = lat - 0.5;
        const maxLatitude = lat + 0.5;

        findNearByDriver = await Driverlatlng.find({
            pickupCoordinates: {
                $geoWithin: {
                    $box: [
                        [minLongitude, minLatitude],
                        [maxLongitude, maxLatitude]
                    ]
                }
            }
        })

        return findNearByDriver

    } catch (error) {
        console.log(error)
    }
}

const getCartypes = async () => {
    console.log("1cartypes");
    try {
        let query = {};
        let projection = { cartype: 1, _id: 0 };
        const cartypes = await Drivers.find(query, projection);
        console.log("2.cartypes");
        console.log(cartypes);
        return cartypes;
    } catch (error) {
        console.error("Error fetching cartypes:", error.message);
    }
};


app.post('/passenger', async (req, res) => {
    // const status=req.body.Status;
    // console.log(status);
    console.log("sdfgvbn");



    res.status(200).send({ message: 'Status updated' });
});

const wss = new WebSocket.Server({ port: 5000 });

wss.on('connection', ws => {
    console.log('WebSocket client connected');

    ws.on('message', async (message) => {
        try {
            console.log(`received: ${message}`);
            ws.send(`server: ${message}`);

        } catch (error) {
            console.log("socket error:",error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });

    ws.send(`welcome to the web socket!!!!!!!!`)
});



// async function broadcastStatusChange() {
//     console.log("11111111111111111111111111111111111111111111111111");
//     wss.clients.forEach(client => {
//         if (client.readyState === WebSocket.OPEN) {
//             client.send(JSON.stringify({ type: 'waiting', status: "waiting for driver" }));
//         }
//     });
// }




// const lngRange = { $gte: lon - 5, $lte: lon + 5 };
// const latRange = { $gte: lat - 5, $lte: lat + 5 };

// //   const results = await Location.find({
// //     'coordinates.lat': latRange,
// //     'coordinates.lng': lngRange
// //   });

// const findDriver = {
//     type: "Point",
//     coordinates: [lngRange,latRange]
// }
// console.log(findDriver);


// const minLongitude = lon - 0.5;
// const maxLongitude = lon + 0.5;
// const minLatitude = lat - 0.5;
// const maxLatitude = lat + 0.5;


// findNearByDriver = await Driverlatlng.find({
//     pickupCoordinates: {
//         $geoWithin: {
//             $box: [
//                 [minLongitude, minLatitude],
//                 [maxLongitude, maxLatitude]
//             ]
//         }
//     }
// })



















app.get('/chatbot', (req, res) => {
    res.render('chatbot.ejs');
})

app.post('/chatbot', async (req, res) => {
    try {
        const { prompt } = req.body;

        const model = getGenerativeModel({ apiKey: GEMINI_API_KEY, model: 'gemini-1.5-flash' });

        const result = await model.generateContent(prompt);
        const text = result.contents[0]?.text || 'No content generated';

        res.json({ text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



























































const DriverSchema = z.object({
    name: z
        .string({ required_error: "name atleast 8 characters" })
        .min(2).max(16)
        .trim(),
    email: z
        .string({ required_error: "email should not be empty" })
        .trim()
        .email(),
    password: z.string().min(6).max(6),
    cpass: z.string().min(6),
    license: z.string().length(8),
    image: z.string(),
    exp: z.string().min(1).max(2),
    phone: z.string().length(10),
    cartype: z.string().min(5)

});


app.get('/driverreg', (req, res) => {
    res.render('driverreg.ejs', { body: {}, errors: {} })
});





app.post('/driverreg', async (req, res) => {
    try {

        console.log(req.body, "req.body");

        const { password, cpass } = req.body
        const check = await Passenger.find({ email: req.body.email })
        if (check.length > 0) { throw { message: 'user already exsists.', type: 'user_exsits' } }

        console.log({ check });
        if (password !== cpass) throw { message: 'Password and confirm password must me equal.', type: 'pass_miss_match' }

        const isValidData = DriverSchema.parse(req.body);

        const driver = await Driver.create(req.body);


        res.redirect("/driverlogin")

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
        if (error.type === 'user_exsits') {
            errors.email = error.message;
        }

        console.log(error, errors)
        res.render('driverreg.ejs', { body: req.body, errors })

    }
});

app.get('/driverlogin', (req, res) => {
    res.render('driverlogin.ejs', { body: {}, errors: {} });
});

app.post('/driverlogin', async (req, res) => {
    try {


        const check = await Driver.find({ email: req.body.email, password: req.body.password })


        if (check.length === 0) {
            throw { message: 'useremail and password mismatched', type: 'match' }
        }
        else if (check == "") {
            res.send("useremail or password is empty");
        }
        else {
            const token = jwt.sign({ id: Passenger._id }, 'yourSecretKey', { expiresIn: '24h' });
            res.cookie('authToken', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
            res.redirect('/driverlocation');
        }
    }
    catch (err) {

        console.log(req.body);
        let errors = {}
        {
            console.log(err);

        }
        if (err.type === 'match') {
            errors.email = err.message;
            errors.password = err.message
        }
        console.log(errors)

        res.render('driverlogin.ejs', { body: req.body, errors })



    }

});
app.get('/driverlocation', (req, res) => {

    res.render('driverlocation.ejs', { body: {}, TOMTOM_API_KEY });
    console.log("driver location response");
})

app.post('/driverlocation', async (req, res) => {
    console.log(req.body, "clgs");

    try {
        console.log(11);
        console.log("req.body:", req.body);

        const { lat, lon } = req.body;
        const transformedBody = {
            address: "Some default address",
            pickupCoordinates: {
                type: "Point",
                coordinates: [lon, lat]
            }
        };

        const driverlatlng = await Driverlatlng.create(transformedBody);
        console.log("Driverlatlng saved successfully:", driverlatlng);

        res.render('driverlocation.ejs', { body: transformedBody, TOMTOM_API_KEY: TOMTOM_API_KEY });

    } catch (error) {
        console.log(888);
        console.log(error);

    }



});




mongoose.connect(process.env.MONGO_DB_URL)
    .then(() => {

        const PORT = process?.env?.PORT ?? 8080;

        console.log("connected to db");

        app.listen(PORT, () => {
            console.log("server is running on port : ", PORT);
        });
    })
    .catch((err) => {
        console.log(err);
        console.log("connection failed");
    });





