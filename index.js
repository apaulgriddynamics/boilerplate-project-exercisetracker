const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const ExerciseTrackerService = require("./services");

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const isTest = process.env.NODE_ENV === "test";
const dbPath = isTest ? ":memory:" : null;
const exerciseService = new ExerciseTrackerService(dbPath);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  if (err.message === "User not found") {
    return res.status(404).json({ error: "User not found" });
  }

  if (
    err.message.includes("required") ||
    err.message.includes("Invalid") ||
    err.message.includes("must be") ||
    err.message.includes("cannot") ||
    err.message.includes("already exists")
  ) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: "Internal server error" });
};

app.post(
  "/api/users",
  handleAsync(async (req, res) => {
    const { username } = req.body;
    const user = await exerciseService.createUser(username);
    res.json(user);
  })
);

app.get(
  "/api/users",
  handleAsync(async (req, res) => {
    const users = await exerciseService.getAllUsers();
    res.json(users);
  })
);

app.post(
  "/api/users/:_id/exercises",
  handleAsync(async (req, res) => {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const exercise = await exerciseService.createExercise(
      _id,
      description,
      duration,
      date
    );
    res.json(exercise);
  })
);

app.get(
  "/api/users/:_id/logs",
  handleAsync(async (req, res) => {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const logs = await exerciseService.getUserExerciseLogs(
      _id,
      from,
      to,
      limit
    );
    res.json(logs);
  })
);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

process.on("SIGINT", () => {
  exerciseService.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  exerciseService.close();
  process.exit(0);
});

if (process.env.NODE_ENV !== "test") {
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
  });
}

module.exports = app;

if (process.env.NODE_ENV === "test") {
  module.exports.exerciseService = exerciseService;
}
