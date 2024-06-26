require('dotenv').config()

// const { GoogleGenerativeAI } = require('@google/generative-ai');

const express = require('express');
const mongoose = require('mongoose');
const Passenger = require('./models/passenger.js');
const Driver = require('./models/driver.js');
const Driverlatlng=require('./models/driverlatlng.js');
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
// const Gemini_API_KEY= new GoogleGenerativeAI(process.env.Gemini_API_KEY);



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

app.post('/login', async (req, res) => {
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
             
            console.log(6666);
            const token = jwt.sign({ id: Passenger._id }, 'yourSecretKey', { expiresIn: '24h' });
            // console.log(token);
            res.cookie('authToken', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
            // console.log('Set-Cookie: ', res.getHeader('Set-Cookie'));
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
    try {
        console.log(11); 
        console.log("req.body:", req.body);
    
        const { lat, lon } = req.body;
        const transform = {
            address: "Some default address",  
            pickupCoordinates: {
                type: "Point",
                coordinates: [lon, lat]
            }
        };
    }catch(err){
        console.log(err);
    }
});



// app.get('/chatbot',(req,res)=>{
//     res.render('chatbot.ejs');
// })

// app.post('/chatbot', async (req, res) => {
//   try {
//     const { prompt } = req.body;
//     const model = Gemini_API_KEY.getGenerativeModel({ model: 'gemini-1.5-flash' });
//     const result = await model.generateContent(prompt);
//     console.log(result);  
    
//     const text = result.contents[0]?.text || 'No content generated';
//     res.json({ text });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



























































const DriverSchema = z.object({
    name: z
        .string({ required_error: "name atleast 8 characters" })
        .min(2).max(16)
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

        console.log(req.body,"req.body");

        const { password, cpass } = req.body
        const check = await Passenger.find({ phone: req.body.phone })
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
            errors.phone = error.message;
        }

        console.log(error, errors)
        res.render('driverreg.ejs',{ body: req.body, errors })

    }
});

app.get('/driverlogin',(req,res)=>{
    res.render('driverlogin.ejs',  { body: {}, errors: {} });
});

app.post('/driverlogin', async (req, res) => {
    try {
        

        const check = await Driver.find({ phone: req.body.phone, password: req.body.password })


        if (check.length === 0) {
            throw { message: 'userphone and password mismatched', type: 'match' }
        }
        else if (check == "") {
            res.send("userphone or password is empty");
        }
else{
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
            errors.phone = err.message;
            errors.password = err.message
        }
        console.log(errors)

        res.render('driverlogin.ejs', { body: req.body, errors })



    }

});
app.get('/driverlocation',(req,res)=>{
   
    res.render('driverlocation.ejs',{ body: {}, TOMTOM_API_KEY });
  console.log(9090);
})

app.post('/driverlocation', async (req, res) => {
    console.log(req,"clgs");

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
    
        res.render('driverlocation.ejs', { body: transformedBody, TOMTOM_API_KEY: TOMTOM_API_KEY });
    
        const driverlatlng = await Driverlatlng.create(transformedBody);
        console.log("Driverlatlng saved successfully:", driverlatlng);
    
    } catch (error) {
        console.log(888);
        console.log(error);
    }
    
    
    
});




mongoose.connect(process.env.MONGO_DB_URL)
    .then(() => {

        const PORT =process?.env?.PORT ?? 8080;

        console.log("connected to db");

        app.listen(PORT, () => {
            console.log("server is running on port : ",PORT );
        });
    })
    .catch((err) => {
        console.log(err);
        console.log("connection failed");
    });





