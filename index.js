const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt'); //123e99#$46@#$sdfkk235@#%scgdgl$^*FGHsdf2345
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({extended:false}));


app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');


app.use(express.static('public'))

//กำหนด Cookie ของ Web
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 
}));

//ถ้าไม่ได้ Login จะเข้าหน้าหลักไม่ได้และกลับมาที่หน้า Login อีกครั้ง
const NotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('Login');
    }
    next();
}

//ถ้าไม่ได้ Login จะเข้าหน้าหลักไม่ได้และกลับมาที่หน้า Login อีกครั้ง
const Loggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('/');
    }
    next();
}

//get หน้าต่างๆ และนำเอาเงื่อนไข NotLoggedin มาใช้ด้วยหากมีการเข้าหน้าใดๆโดยไม่ Login ก็จะกลับมาหน้า Login

app.get('/', NotLoggedin, (req,res,next) => {
    res.render('index')
})

app.get('/news.ejs',NotLoggedin,(req,res) =>{
    res.render('news')
})

app.get('/download.ejs',NotLoggedin,(req,res) =>{
    res.render('download')
})

app.get('/community.ejs',NotLoggedin,(req,res) =>{
    res.render('community')
})

app.get('/Index.ejs',NotLoggedin,(req,res) =>{
    res.render('Index')
})

app.get('/Login.ejs',NotLoggedin,(req,res) =>{
    res.render('Login')
})

app.get('/register.ejs',(req,res) =>{
    res.render('register')
})

//--------------------Register---------------------//

app.post('/register', Loggedin,
[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
                res.render('Login');
            }).catch(err => {
 
                if (err) throw err;
            });
        })
        .catch(err => {
            
            if (err) throw err;
        })
    }
    else{
        
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        
        res.render('register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});


//--------------------Login---------------------//

app.post('/Login', Loggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;
                
            }
            return Promise.reject('Invalid Email Address!');
            
        });
    }),
    body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        
        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[user_email])
        .then(([rows]) => {
            bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;

                    res.redirect('/');
                }
                else{
                    res.render('Login',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        
        res.render('Login',{
            login_errors:allErrors
        });
    }
});

//------------------Logout--------------------//
app.get('/logout',(req,res)=>{
    
    req.session = null;
    res.redirect('/');
});

//------------------Error404-------------------//
app.use('/', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

//-------------------Port----------------------//
app.listen(3000, () => console.log("Server", 3000 ,"is Running..."));
