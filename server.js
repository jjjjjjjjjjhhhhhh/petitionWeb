const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crypto = require("crypto")
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("views"));

var bool = false;
var login_states
var login_status = false;

const MongoClient = require("mongodb").MongoClient;
const e = require('express');
const { runInNewContext } = require('vm');
var db;
MongoClient.connect(
  "mongodb+srv://Tfadmin:qwerty1111@tfteam.aqtsspy.mongodb.net/?retryWrites=true&w=majority",
  (err, client) => {
    if (err) return console.log(err);
    db = client.db("petitionWeb");

    app.listen(8080, () => {
      console.log("http://localhost:8080");
    });
  }
);

app.get("/", (req, res) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      console.log(result);
      console.log(login_status)
      res.render("home", { posts: result, login_state: login_states });
    });
});

app.get("/write", (req, res) => {
  if (login_status == true) {
    res.render("write");
  }
  else {
    res.send(
      '<script>alert("로그인을 먼저 해주세요");window.location="/"</script>'
    );
  }
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
        익명여부: req.body.anonymous,
        liked: 0
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
      res.render("detail", { data: result, login_state: login_states })
    }
  );
});

app.post("/vote/:id", (req, res) => {
  if (login_status == true) {
    console.log(req.params.id)
    db.collection("acc").findOne({ mail: login_states }, (err, result) => {
      for (const object in result.likedId) {
        if (object == req.params.id) {
          bool = true;
        }
        else {
          bool = false;
        }
      }
      if (bool == true) {
        bool = false;
        res.send(
          '<script>alert("이미 동의하신 청원입니다");window.location="/"</script>'
        );

      }
      else {
        db.collection("acc").updateOne(
          { mail: login_states },
          { $push: { likedId: req.params.id } }, (err, result) => {
            db.collection("petitions").updateOne(
              { _id: parseInt(req.params.id) },
              { $inc: { liked: 1 } }, (err, result) => {
                console.log("voted")
                res.send(
                  '<script>alert("동의해주셔서 감사합니다");window.location="/"</script>'
                );
              }
            );
          }
        )
      }
    })
  }
  else {
    res.send(
      '<script>alert("로그인 이후 사용해 주세요");window.location="/"</script>'
    );
  }
})

// app.get("/", (req, rep) => {
//   rep.render("main.ejs");
// });

app.get("/login", (req, rep) => {
  rep.render("login");
});
app.get("/petition", (req, rep) => {
  rep.render("home");
});
app.get("/register", (req, rep) => {
  rep.render("register");
});
app.get("/done", (req, res) => {
  res.render("done");
});

app.post("/register", (req, rep) => {
  db.collection("acc").findOne({ mail: req.body.mail }, (err, result) => {
    if (result != null) {
      rep.send(
        '<script>alert("이미 존재하는 계정입니다");window.location="/"</script>'
      )

    } else {
      rep.send(
        '<script>alert("회원가입이 완료되었습니다");window.location="/"</script>'
      );
      db.collection("counter").findOne({ name: "countacc" }, (err, result) => {

        try {
          var accNum = result.totalacc;
          let hashedPass = crypto.createHash("sha256").update(req.body.password).digest("base64")
          console.log(hashedPass)
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
          )
        } catch {
          rep.redirect("/register");
        }
      })
    }
  })

});

app.post("/login", (req, rep) => {
  db.collection("counter").findOne({ name: "countacc" }, (err, result) => {

    db.collection("acc").findOne({ mail: req.body.loginmail }, (err, res) => {

      if (res == null) {
        console.log('mail incorrectly directed')
        rep.send(
          '<script>alert("존재하지 않는 계정입니다");window.location="/register"</script>'
        );

      } else {

        console.log(res)
        console.log(req.body.loginmail)
        let inputPass = crypto.createHash("sha256").update(req.body.loginpassword).digest("base64")
        console.log(inputPass)

        if ((req.body.loginmail) == (res.mail)) {
          console.log("mail correctly directed")

          if (inputPass == res.pass) {
            console.log("password correctly directed")
            login_states = req.body.loginmail
            login_status = true;
            rep.send(
              '<script>alert("로그인이 완료되었습니다");window.location="/"</script>'
            );
          } else {
            console.log("password incorrectly directed")
            rep.send(
              '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
            );


          }
        } else {
          console.log("mail incorrectly directed")
          rep.send(
            '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
          );


        }
      }


    })


  })
})

app.get('/test', (rep, req) => {
  let digest2 = crypto.createHash("sha256").update("anggi").digest("base64")
  console.log(digest2)

})