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
let date = new Date().toLocaleDateString();

app.post("/add", (req, res) => {
  db.collection("counter").findOne({ name: "postNum" }, (err, result) => {
    var totalPetitions = result.totalPost;
    db.collection("petitions").insertOne(
      {
        _id: totalPetitions + 1,
        청원제목: req.body.title,
        청원내용: req.body.markdown,
        status: "start",
        청원기간: date,
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

app.get("/detail/:id", (req, res) => {
  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("detail", { data: result });
    }
  );
});
app.get("/", (req, rep) => {
  rep.render("main.ejs");
});

app.get("/login", (req, rep) => {
  rep.render("login");
});
app.get("/petition", (req, rep) => {
  rep.render("home");
});
app.get("/register", (req, rep) => {
  rep.render("register");
});

app.post("/register", (req, rep) => {
  rep.send(
    '<script>alert("회원가입이 완료되었습니다");window.location="/"</script>'
  );
  db.collection("counter").findOne({ name: "countacc" }, (err, result) => {
    try {
      var accNum = result.totalacc;
      const hashedPass = bcrypt.hash(req.body.password, 10);

      console.log("mail:", req.body.mail);
      console.log("password:", hashedPass);

      db.collection("acc").insertOne(
        {
          _id: accNum + 1,
          name: req.body.name,
          mail: req.body.mail,
          pass: hashedPass,
        },
        () => {
          db.collection("counter").updateOne(
            { name: "countacc" },
            { $inc: { totalacc: 1 } },
            (err, result) => {
              if (err) return console.log(error);
            }
          );
        }
      );
    } catch {
      rep.redirect("/register");
    }
  });
});

// app.post('/add', (req,rep)  =>{
//   rep.sendFile(__dirname + ('/site/main.html'))
//   console.log("메일:" , req.body)
// })

app.post("/login", (req, rep) => {
  db.collection("counter").findOne({ name: "countacc" }, (err, result) => {
    //console.log("1차 진입");
    for (var i = 1; i <= result.totalacc; i++) {
      //console.log("2차 진입");
      db.collection("acc").findOne({ _id: i }, (err, result) => {
        //console.log("3차 진입");
        console.log(result.mail);
        console.log(req.body.loginmail);
        if (result.mail == req.body.loginmail) {
          if (bcrypt.compare(req.body.loginpassword, result.pass)) {
            rep.send(
              '<script>alert("로그인이 성공적으로 되었습니다");window.location="/"</script>'
            );
          }
        }
      });
    }
  });
});
