import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from 'cors'

import 'dotenv/config'

const app = express();
const port = process.env.PORT;

// const db = new pg.Client({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_SECRET,
//   port: process.env.DB_PORT,
// });

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect();

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 
}

app.use(cors(corsOptions))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 5;

let users = []

async function checkVisisted() {
  // "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];

  if (result.rows){
    result.rows.forEach((country) => {
      countries.push(country.country_code);
    })
  }
  
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users;")
  
  if (result.rows) {
    users = result.rows
    return users.find((user) => user.id == currentUserId)
  } else {
    return {
      id: null,
      name: NaN,
      color: 'black'
    }
  }
  

}

app.get("/", async (req, res) => {
  
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser()
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser()

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUser.id]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new"){
    res.render("new.ejs")
  } else {
    currentUserId = req.body.user
    res.redirect("/")
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  const name = req.body.name
  const color = req.body.color

  if (name && color) {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    )
    const id = result.rows[0].id
    currentUserId = id
  }

  res.redirect("/")
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
