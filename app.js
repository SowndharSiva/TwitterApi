const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001);
  } catch (e) {
    console.log(`DB ERROR:${e}`);
    process.exit(1);
  }
};
initializeDBAndServer();
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkUserQuery = `SELECT * FROM user
    WHERE username="${username}";`;
  const getUser = await db.get(checkUserQuery);
  if (getUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const registerQuery = `INSERT INTO user (name,username,password,gender)
        VALUES ("${name}","${username}",""${hashedPassword}","${gender}");`;
      await db.run(registerQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username=${username};`;
  const checkUser = await db.get(checkUserQuery);
  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(password, checkUser.password);
    const payload = {
      username: username,
    };
    if (checkPassword) {
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateUser = async (request, response, next) => {
  let jwtToken;
  const authHead = request.headers["authorization"];
  if (authHead !== undefined) {
    jwtToken = authHead.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};
