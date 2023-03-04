const express = require("express");
const { OPEN_READWRITE } = require("sqlite3");
const app = express();
const { User, Kitten } = require("./db");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { application } = require("express");
const SALT_COUNT = 10;
const bcrypt = require("bcrypt");
const {JWT_SECRET} = process.env;


app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware

const authUser = (req, res, next) => {
try{
  const auth = req.header("Authorization");
  if(!auth){
    next();
} else{
    const [, token] = auth.split(' ');
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    // console.log(user)
    next()
}
} catch(err) {
res.send(err)
}
}
// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password
app.post('/register', authUser, async(req, res, next) => {
  try {
    const {username, password} = req.body
      const hashedPassword = await bcrypt.hash(password, SALT_COUNT)

      await User.create({username, password: hashedPassword})
      const token = jwt.sign({ username }, JWT_SECRET);
      res.status(200).send({ message: 'success',
      token})

  } catch(err) {
    res.send(err)
    next()
  }
})

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id

app.get('/kittens/:id', authUser, async(req, res, next) => {
try {
  const kittenId = req.params.id
  const owner = req?.user?.id
  const kitten = await Kitten.findByPk(kittenId);
    if (kitten.ownerId === owner) {
    res.status(200).send({name: kitten.name, color: kitten.color, age: kitten.age});
  } else {
    res.status(401).send("Unauthorized")
  }
} catch(err) {
  res.send(err)
  next()
}
})

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color
app.post('/kittens', authUser, async(req, res, next) => {
  try {
    const user = req.user
    if(user) {
      let newKitten = await Kitten.create(req.body)
      res.status(201).send({name: newKitten.name, color: newKitten.color, age: newKitten.age})
    } else {
      res.status(401).send('Unauthorized')
    }

  } catch(err) {
    res.send(err)
    next()
  }
})
// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete('/kittens/:id', authUser, async(req, res, next) => {
  try{
    const kittenId = req.params.id
    const owner = req?.user?.id
    const kitten = await Kitten.findByPk(kittenId);
    if (kitten.ownerId === owner){
      await kitten.destroy()
      res.status(204).send("kitten has been deleted")
  } else {
    res.status(401).send('Unauthorized')
  }

  } catch(err) {
    res.send(err)
    next()
  }
})
// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
