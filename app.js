require('dotenv').config()

const { GoogleGenerativeAI } = require('@google/generative-ai');

const WebSocket = require('ws');
const { MongoClient, ObjectId } = require('mongodb');
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
const http = require('http');
const Driver = require('./models/driver.js');



const PORT = 5000;
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'ejs');
const server = http.createServer(app);
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
        console.log(check);
        console.log(check[0]?.email);
        if (check.length === 0) {
            throw { message: 'useremail and password mismatched', type: 'match' }
        }
        else if (check == "") {
            res.send("useremail or password is empty");
        }

        else {

            console.log(6666);
            const token = jwt.sign({ id: check[0]?._id }, 'yourSecretKey', { expiresIn: '24h' });
            // console.log(token);
            res.cookie('authToken', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
            // console.log('Set-Cookie: ', res.getHeader('Set-Cookie'));
            // res.send('Login successful and cookie has been set');

            res.redirect(`/riderlocation?mail=${encodeURIComponent(check[0]?.email)}`);

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
    res.render('riderlocation.ejs', { body: {}, TOMTOM_API_KEY });
})
app.post('/riderlocation', async (req, res) => {
    // console.log("Request received at /rider");

    try {
        console.log("Request body:---------------->>>", req.body);

        const { pickupCoordinates, dropoffCoordinates, email } = req.body;

        const pickup_lat = pickupCoordinates?.lat;
        const pickup_lon = pickupCoordinates?.lon;

        const drop_lat = dropoffCoordinates?.lat;
        const drop_lon = dropoffCoordinates?.lon;
        // const {pickup_lat,pickup_lon} = pickupCoordinates;
        // const {drop_lat,drop_lon} = dropoffCoordinates;

        if (!pickup_lat || !pickup_lon) {
            throw new Error("Pickup Latitude and longitude are required");
        }

        if (!drop_lat || !drop_lon) {
            throw new Error("Drop Latitude and longitude are required");
        }

        // const transform = {
        //     address: "Some default address",
        //     pickupCoordinates: {
        //         type: "Point",
        //         coordinates: [lon, lat]
        //     }
        // };
        // const passengerlatlng = await Passengerlatlng.create(transform);
        // console.log("Passengerlatlng saved successfully:", passengerlatlng);

        const pickup_coordinates = [pickup_lon, pickup_lat];
        const drop_coordinates = [drop_lon, drop_lat];

        const passengerlatlng = await Passenger.updateOne(
            { email },
            { $set: { 'pickupCoordinates.coordinates': pickup_coordinates, 'dropCoordinates.coordinates': drop_coordinates } }
        )

        const removeDeriverDetail = await Passenger.updateOne(
            { email },
            { $unset: { driverDetail: "" } }
        )
        console.log(passengerlatlng,removeDeriverDetail)

        const projection = {driverDetail:1}
        const ssss = await Passenger.find({email});
        console.log(ssss,"sssssssoooooopppppppppppppppppppp");
        console.log(ssss?.[0],"sssssssoooooopppppppppppppppppppp");



        let findNearByDriver = [];
        if (passengerlatlng) {
            console.log("--> is passenger");


            console.log(pickup_lat, pickup_lon, "--------------------------------------------------------------");
            findNearByDriver = await findNearByDriverHelper(pickup_lat, pickup_lon);

            // findNearByDriver.map((ans) => console.log(ans.pickupCoordinates.coordinates, "driver and passenger location."))
            // console.log(findNearByDriver, "-findNearByDriver");

        }


        // res.render('location.ejs', { body: transform, TOMTOM_API_KEY: TOMTOM_API_KEY,findNearByDriver});
        let cartype = await getCartypes();
        // console.log(cartype, "car Type");
        res.send({ findNearByDriver, cartype, TOMTOM_API_KEY });
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
        const minLongitude = lon - 0.005;
        const maxLongitude = lon + 0.005;
        const minLatitude = lat - 0.005;
        const maxLatitude = lat + 0.005;

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








// const wss = new WebSocket.Server({ port: 5000 });

// wss.on('connection', ws => {
//     console.log('WebSocket client connected');

//     ws.on('message', async (message) => {
//         try {
//             console.log(`received: ${message}`);
//             ws.send(`server: ${message}`);

//         } catch (error) {
//             console.log("socket error:",error);
//         }
//     });

//     ws.on('close', () => {
//         console.log('WebSocket client disconnected');
//     });

//     ws.send(`welcome to the web socket!!!!!!!!`)
// });

const uri = 'mongodb+srv://Poornashree:eXhc*h3VPU*fw84@cluster0.tmcwcyg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

const socketlookupMap = {}




async function startServer() {
    try {
        await client.connect();
        db = client.db('test');
        console.log('Connected to MongoDB');

        // const wss = new WebSocket.Server({ server });

        const wss = new WebSocket.Server({ port: PORT });

        wss.on('connection', ws => {
            console.log('WebSocket client connected');

            const userId = 111

            const type = 'driver' || 'passenger'

            socketlookupMap[`${type}-${userId}`] = ws

            ws.on('message', async (message) => {
                try {
                    console.log(`Received: ${message}`);
                    const data = JSON.parse(message);


                    if (data.type === 'status' && data.status === 'waiting for driver') {

                        try {
                            const email = data.email;
                            console.log(data.email, "check sockrt use emsil");
                            const user_exists = await Passenger.find({ email });
                            console.log(user_exists);

                            if (user_exists?.length === 0) {
                                throw new Error("user does not exist.")
                            }

                            const userId = user_exists[0]._id;

                            const result = await db.collection('passengers').updateOne(
                                { _id: userId },
                                { $set: { status: 'waiting' } }
                            );

                            if (result.matchedCount === 0) {
                                console.log('No documents found with status "none"');
                                ws.send(JSON.stringify({ type: 'error', message: 'No documents found with status "none"' }));
                            } else {
                                console.log('Status updated in MongoDB', result);
                                ws.send(JSON.stringify({ type: 'statusUpdated', status: 'waiting' }));
                            }
                        } catch (error) {
                            console.error('Error updating status in MongoDB', error);
                            ws.send(JSON.stringify({ type: 'error', message: 'Failed to update status in MongoDB' }));
                        }
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format or status' }));
                    }

                } catch (error) {
                    console.log("Socket error:", error);
                }
            });

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });

            ws.on('error', (error) => {
                console.log('WebSocket error:', error);
            });

            ws.send(JSON.stringify({ message: `Welcome to the web socket!`, type: 'status' }));
        });

        console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

startServer();

app.post('/get-user-for-ride', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        // console.log(req,"prokfsfhgfv ");

        if (!lat || !lon) throw new Error("unable to get nearby driver detail.")

        let findNearByDriver = [];
        const minLongitude = lon - 0.005;
        const maxLongitude = lon + 0.005;
        const minLatitude = lat - 0.005;
        const maxLatitude = lat + 0.005;

        // findNearByDriver = await Passengerlatlng.find({
        //     pickupCoordinates: {
        //         $geoWithin: {
        //             $box: [
        //                 [minLongitude, minLatitude],
        //                 [maxLongitude, maxLatitude]
        //             ]
        //         }
        //     }
        // })

        let projection = { name: 1, phone: 1, pickupCoordinates: 1, dropCoordinates: 1, _id: 1 };

        findNearByDriver = await Passenger.find({
            'pickupCoordinates.coordinates': {
                $geoWithin: {
                    $box: [
                        [minLongitude, minLatitude],
                        [maxLongitude, maxLatitude]
                    ]
                }
            },
            status: "waiting",
        }, projection)

        // console.log(findNearByDriver, "findNearByDriver- -------=======")

        res.send({ findNearByDriver, lat, lon })

    } catch (error) {
        console.error(error);
        // res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/get-driver-detail',async (req,res)=> {
    try {
        const projection = {driverDetail: 1,dropCoordinates: 1}
        const getDriver = await Passenger.find({email:req.body.email}, projection);
        res.send(getDriver[0]);
    } catch (error) {
        console.log(error)
    }
})

app.post('/confirm-ride', async (req, res) => {
    try {

        console.log(req?.body,"free fire")

        const id = req?.body?.id;
        const driverDetail = req?.body?.driverDetail?.getDriverDetail

        console.log(driverDetail,"vcvcvcvcfvfvgbgbhnhnhnujyhuiolkkkpppppppp")

        if(driverDetail) {
            const userId = new ObjectId(id);

            const result = await db.collection('passengers').updateOne(
                { _id: userId },
                { $set: { status: 'confirmed', driverDetail } }
            );
    
            const getUser = await Passenger.find({ _id: userId })
            console.log(getUser[0]?.pickupCoordinates,getUser[0]?.dropCoordinates,"get user ))__))__))__")
        }

    } catch (error) {
        console.log(error?.message);
    }
})


















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
        const check = await Driver.find({ email: req.body.email })
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
            res.redirect(`/driverlocation?mail=${encodeURIComponent(check[0]?.email)}`);
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

    const {pickupCoordinates, email} = req.body

    try {

        const { lat, lon } = pickupCoordinates;
        const transformedBody = {
            address: "Some default address",
            pickupCoordinates: {
                type: "Point",
                coordinates: [lon, lat]
            }
        };

        let projection = { name: 1, phone: 1, cartype: 1, _id: 1 };
        const getDriverDetail = await Driver.find({ email: email },projection);

        const driverlatlng = await Driverlatlng.create(transformedBody);
        console.log("Driverlatlng saved successfully:", driverlatlng);

        // res.render('driverlocation.ejs', { body: transformedBody, TOMTOM_API_KEY: TOMTOM_API_KEY });
        if (driverlatlng?._id || getDriverDetail?.[0]?._id) {
            res.send({getDriverDetail})
        }
        else {
            res.send("something went wrong")
        }

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





