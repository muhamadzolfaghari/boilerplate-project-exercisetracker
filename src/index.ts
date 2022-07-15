import mongoose from "mongoose";
import { config } from "dotenv";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import IExercise from "./interfaces/IExercise";
import IUser from "./interfaces/IUser";
import ILog from "./interfaces/ILog";
import IUsersIdLogsRequest from "./interfaces/IUsersIdLogsRequest";

const app = express();
config();

const tryParseDate = (date?: string) => (date ? new Date(date) : undefined);

const main = async () => {
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(express.static("public"));
  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
  });

  const db = new mongoose.Mongoose();
  await db.connect(process.env.MONGO_URI);

  const exerciseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: String },
  });
  const Exercise = mongoose.model("Exercise", exerciseSchema);
  const userSchema = new db.Schema({
    username: String,
    exercises: [exerciseSchema],
  });
  const User = db.model("User", userSchema);

  app
    .route("/api/users")
    .post((req, res) => {
      const user = new User({
        username: req.body.username,
        exercises: [],
      });
      user.save((error, result) => {
        if (error) return res.json({ error: "something is not right" });
        res.json({
          username: user.username,
          _id: result._id,
        });
      });
    })
    .get(async (req, res) => {
      const users = await User.find();
      res.json(users);
    });

  app.post("/api/users/:_id/exercises", async (req, res) => {
    const { date, description, duration } = req.body;
    const newDate = date
      ? new Date(date).toDateString()
      : new Date().toDateString();

    const exercise = new Exercise({
      description,
      date: newDate,
      duration: +duration,
    });
    User.findByIdAndUpdate(
      req.params._id,
      { $push: { exercises: exercise } },
      { upsert: true },
      (error, updatedUser) => {
        if (error) return res.json("Something happening at the moment");
        const body: IExercise & IUser = {
          username: updatedUser.username,
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date,
          _id: updatedUser.id,
        };
        res.json(body);
      }
    );
  });

  app.get("/api/users/:_id/logs", (req: IUsersIdLogsRequest, res) => {
    const { from, to, limit } = req.query;
    const fromDate = tryParseDate(from);
    const toDate = tryParseDate(to);

    User.findById(req.params._id, null, (error, user) => {
      if (error) return res.json({ error: "Error occurred" });
      let exercises = user.exercises.map(({ date, description, duration }) => ({
        date,
        description,
        duration,
      }));

      if (fromDate) {
        exercises = exercises.filter(
          (exercise) => tryParseDate(exercise.date) >= fromDate
        );
      }

      if (toDate) {
        exercises = exercises.filter(
          (exercise) => tryParseDate(exercise.date) <= toDate
        );
      }

      if (limit) {
        exercises = exercises.slice(0, +limit);
      }

      const body: ILog & IUser = {
        _id: user.id,
        count: exercises.length,
        username: user.username,
        log: exercises,
      };

      res.json(body);
    });
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + process.env.PORT);
  });
};

main().then();
