const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("views"));

const MongoClient = require("mongodb").MongoClient;

var db;
MongoClient.connect(
  "mongodb+srv://Tfadmin:qwerty1111@tfteam.aqtsspy.mongodb.net/?retryWrites=true&w=majority",
  (err, client) => {
    if (err) return console.log(err);
    db = client.db("petitionWeb");

    app.listen(8080, () => {
      console.log("Connected");
    });
  }
);

app.get("/", (req, res) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      console.log(result);
      res.render("home", { posts: result });
    });
});

app.get("/write", (req, res) => {
  res.render("write");
});

app.post("/add", (req, res) => {
  db.collection("counter").findOne({ name: "postNum" }, (err, result) => {
    var totalPetitions = result.totalPost;
    db.collection("petitions").insertOne(
      {
        _id: totalPetitions + 1,
        청원제목: req.body.title,
        청원내용: req.body.markdown,
      },
      () => {
        console.log("저장완료");
        db.collection("counter").updateOne(
          { name: "postNum" },
          { $inc: { totalPost: 1 } },
          (err, result) => {
            if (err) return console.log(error);
          }
        );
        res.send(
          '<script>alert("청원이 등록되었습니다");window.location="/"</script>'
        );
      }
    );
  });
});
